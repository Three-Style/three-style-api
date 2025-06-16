/**
 * @author Brijesh Prajapati
 * @description Payment Callback for Digital Plans
 */

const { winston: logger, nodemailer } = require('../../../services');
const { OrdersRepo, DigitalPlansRepo, UserDigitalPlansRepo, UserServiceRepo, UserRepo } = require('../../../database');
const { orderStatus, userService } = require('../../../common');
const { getOrderByIDController, getPayment } = require('..');
const { emailTemplate } = require('../../../helpers');

module.exports = ({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) =>
	new Promise(async (resolve, reject) => {
		logger.info('Controller > Users > Book PT > Payment Callback');

		if (!razorpay_payment_id || !razorpay_order_id) {
			return reject('Payment or Order ID required');
		}

		let orderResult = await getOrderByIDController(razorpay_order_id, razorpayGateway);
		let paymentResult = await getPayment(razorpay_payment_id, { gateway: razorpayGateway });
		let UserOrderResult = await OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }).populate({ path: 'user_id', select: '_id email mobile' }).lean();

		if (!UserOrderResult) {
			return reject('Invalid Order ID');
		}

		let user_id = UserOrderResult.user_id._id,
			email = UserOrderResult.user_id.email;
		// let mobile = UserOrderResult.user_id.mobile;

		let userEmail = email || paymentResult.email;

		// Update Email in User Account
		UserRepo.findOneAndUpdate({ _id: user_id }, { email: String(userEmail).trim().toLowerCase() }, { new: true }).catch((error) => logger.error('Email Update failed' + error.message));

		// Check Status == 'paid' then update order data with status and payment id
		if (orderResult.status != 'paid') {
			return reject('Order was not paid');
		}

		// Validate Payment
		if (paymentResult.order_id != razorpay_order_id) {
			return reject('Invalid Payment. Payment Order ID does not match with Order ID');
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

		// Find Digital Plan
		let digitalPlanResult;
		if (orderResult.notes.item_id) {
			digitalPlanResult = await DigitalPlansRepo.findOne({ _id: orderResult.notes.item_id });

			if (!digitalPlanResult) {
				return reject('payment should be refund as plan id not found');
			}
		} else {
			return reject('payment should be refund as no notes found in order');
		}

		let payload = {
			plan_id: digitalPlanResult._id,
			order_id: orderUpdateResult._id,
			user_id: orderResult.notes.user_id,
			createdBy: user_id,
			updatedBy: user_id,
		};

		UserDigitalPlansRepo.create(payload).catch((error) => logger.error(error.stack));

		UserServiceRepo.findOneAndUpdate(
			{ user_id: user_id, service: userService.digital },
			{ user_id: user_id, status: true, service: userService.digital, createdBy: user_id, updatedBy: user_id },
			{ new: true, upsert: true }
		).catch((error) => logger.error(error.stack));

		resolve('Order Paid Successfully');

		// --- Send Mail ---
		if (userEmail != 'void@razorpay.com') {
			// Invoice & Feature Email
			let invoiceEmail = {
				orderID: orderUpdateResult.receipt_id,
				plan_name: digitalPlanResult.plan_name,
				amount: orderUpdateResult.amount,
			};

			let featureEmail = {
				plan_name: digitalPlanResult.plan_name,
				duration: digitalPlanResult.duration_days || '' + ' Days',
			};

			emailTemplate('FG_DIGITAL_INVOICE', invoiceEmail)
				.then((getInvoiceBody) => {
					nodemailer(undefined, userEmail, 'Order Invoice - Three Style', getInvoiceBody, 'Three Style').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));

			emailTemplate('FG_DIGITAL_FEATURE', featureEmail)
				.then((getFeatureBody) => {
					nodemailer(undefined, userEmail, `Thank you for purchase ${digitalPlanResult.plan_name} - Three Style`, getFeatureBody, 'Three Style').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));
		}
	});
