/**
 * @author Brijesh Prajapati
 * @description Handler for FWG
 */

const httpStatus = require('http-status');
const moment = require('moment');

const { winston: logger, nodemailer } = require('../../../services');
const { OrdersRepo, UserFitnessPlanRepo, FitnessPlanRepo, UserServiceRepo, UserRepo } = require('../../../database');
const { orderStatus, userService } = require('../../../common');
const { getPayment, getOrderByIDController } = require('..');
const { emailTemplate, WhatsAppHelper } = require('../../../helpers');

module.exports = ({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) =>
	new Promise(async (resolve, reject) => {
		logger.info('Controller > Admin > Razorpay Webhook > FWG Callback');

		if (!razorpay_payment_id || !razorpay_order_id) {
			return reject('Payment or Order ID required');
		}

		let orderResult = await getOrderByIDController(razorpay_order_id, razorpayGateway);
		let paymentResult = await getPayment(razorpay_payment_id, { gateway: razorpayGateway });
		let UserOrderResult = await OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }).populate({ path: 'user_id', select: '_id email mobile' }).lean();

		if (!UserOrderResult) {
			return reject('Invalid Order ID');
		}

		// Check Status == 'paid' then update order data with status and payment id
		if (orderResult.status != 'paid') {
			return reject('Order was not paid');
		}

		// Validate Payment
		if (paymentResult.order_id != razorpay_order_id) {
			return reject('Invalid Payment. Payment Order ID does not match with Order ID');
		}

		let user_id = UserOrderResult.user_id._id,
			email = UserOrderResult.user_id.email,
			mobile = UserOrderResult.user_id.mobile;

		let userEmail = email || paymentResult.email;

		// Update Email in User Account
		UserRepo.findOneAndUpdate({ _id: user_id }, { email: String(userEmail).trim().toLowerCase() }, { new: true }).catch((error) => logger.error('Email Update failed' + error.message));

		let fitnessPlanResult = await FitnessPlanRepo.findOne({ _id: orderResult.notes.plan_id });
		if (!fitnessPlanResult) {
			return reject('Invalid Product Purchased. Please contact administration to initiate refund.');
		}

		let orderUpdateResult;
		try {
			orderUpdateResult = await OrdersRepo.findOneAndUpdate(
				{
					gateway_order_id: razorpay_order_id,
					status: { $ne: orderStatus.success },
				},
				{
					status: orderStatus.success,
					gateway_signature: razorpay_signature,
					updatedBy: user_id,
					gateway_transaction_id: razorpay_payment_id,
				},
				{ new: true }
			);

			if (!orderUpdateResult) {
				return reject('Order already paid');
			}
		} catch (error) {
			logger.error(error.stack);
			return reject(error.message || 'Something went wrong');
		}

		try {
			if (userEmail != 'void@razorpay.com') {
				// Invoice & Feature Email
				let invoiceEmail = {
					orderID: orderUpdateResult.receipt_id,
					plan_name: fitnessPlanResult.plan_name,
					amount: orderUpdateResult.amount,
				};

				let featureEmail = {
					plan_name: fitnessPlanResult.plan_name,
					duration: fitnessPlanResult.duration + ' Days',
				};

				let getInvoiceBody = await emailTemplate('FWG_INVOICE', invoiceEmail).catch((error) => logger.error(error)),
					getFeatureBody = await emailTemplate('FWG_FEATURE', featureEmail).catch((error) => logger.error(error));

				getInvoiceBody ? nodemailer(undefined, userEmail, 'Order Invoice - Three Style', getInvoiceBody, 'Three Style') : null;
				getFeatureBody ? nodemailer(undefined, userEmail, `Thank you for purchase ${fitnessPlanResult.plan_name} - Three Style`, getFeatureBody, 'Three Style') : null;
			}
		} catch (error) {
			logger.error(error.stack);
		}

		// --- Send WhatsApp Message ---
		if (mobile) {
			let invoiceBody = {
				components: [
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: orderUpdateResult.receipt_id,
							},
							{
								type: 'text',
								text: fitnessPlanResult.plan_name,
							},
							{
								type: 'text',
								text: orderUpdateResult.amount,
							},
						],
					},
				],
			};

			// Invoice
			WhatsAppHelper.sendMessage(mobile, 'plan_invoice', invoiceBody).catch((error) => logger.error(error.stack));
		}

		// Add Book Plan Information to UserFitnessPlanRepo
		let start_date = new Date(moment(new Date()).add(1, 'days'));

		if (orderResult.notes && orderResult.notes.plan_id && orderResult.notes.user_id && orderResult.notes.time) {
			let payload = {
				plan_id: orderResult.notes.plan_id,
				user_id: orderResult.notes.user_id,
				time_slot: orderResult.notes.time,
				createdBy: user_id,
				updatedBy: user_id,
				order_id: orderUpdateResult._id,
				start_date,
				duration: fitnessPlanResult.duration,
			};

			UserServiceRepo.findOneAndUpdate(
				{ user_id: user_id, service: userService.fitness },
				{ user_id: user_id, service: userService.fitness, status: true, createdBy: user_id, updatedBy: user_id },
				{ new: true, upsert: true }
			).catch((error) => logger.error(error.stack));

			UserFitnessPlanRepo.create(payload).catch((error) => logger.error(error.stack));

			return resolve(httpStatus.OK);
		}

		// General Payment Callback
		if (orderResult.notes && orderResult.notes.plan_id && orderResult.notes.user_id) {
			let payload = {
				plan_id: orderResult.notes.plan_id,
				user_id: orderResult.notes.user_id,
				createdBy: user_id,
				updatedBy: user_id,
				order_id: orderUpdateResult._id,
				start_date,
				duration: fitnessPlanResult.duration,
			};

			UserServiceRepo.findOneAndUpdate(
				{ user_id: user_id, service: userService.fitness },
				{ user_id: user_id, service: userService.fitness, status: true, createdBy: user_id, updatedBy: user_id },
				{ new: true, upsert: true }
			).catch((error) => logger.error(error.stack));

			UserFitnessPlanRepo.create(payload).catch((error) => logger.error(error.stack));

			return resolve(httpStatus.OK);
		}

		return reject('Please contact administrator for refund. your order could not proceed.');
	});
