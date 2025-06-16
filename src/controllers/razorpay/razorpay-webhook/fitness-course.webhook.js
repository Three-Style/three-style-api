/**
 * @author Brijesh Prajapati
 * @description Payment Callback for Fitness Course
 */

const { winston: logger, nodemailer, nodeCache } = require('../../../services');
const { OrdersRepo, FitnessCourseRepo, UserFitnessCourseRepo, UserServiceRepo, UserRepo } = require('../../../database');
const { orderStatus, timeUnit, userService } = require('../../../common');
const { getOrderByIDController, getPayment } = require('..');
const moment = require('moment');
// const firebase = require('firebase-admin').database();
// const { randomDigit } = require('../../../utils/random');
const { emailTemplate, WhatsAppHelper } = require('../../../helpers');
const { UserPurchaseEvent } = require('../../../common/cache_key');
const { assignAllQuiz } = require('../../functions/exam');
const GeneralCache = nodeCache('General');

async function FitnessWebhook({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) {
	return new Promise(async (resolve, reject) => {
		logger.info('Controller > Users > Fitness Course > Payment Callback');

		if (!razorpay_payment_id || !razorpay_order_id) {
			return reject('Payment or Order ID required');
		}

		let orderResult = await getOrderByIDController(razorpay_order_id, razorpayGateway);
		let paymentResult = await getPayment(razorpay_payment_id, { gateway: razorpayGateway });
		let UserOrderResult = await OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }).populate({ path: 'user_id', select: '_id uid email mobile first_name last_name' }).lean();

		if (!UserOrderResult) {
			return reject('Invalid Order ID');
		}

		let user_id = UserOrderResult.user_id._id,
			email = UserOrderResult.user_id.email,
			mobile = UserOrderResult.user_id.mobile;
		// first_name = UserOrderResult.user_id.first_name,
		// last_name = UserOrderResult.user_id.last_name

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
			logger.error(error);
			return reject(error.message || 'Something went wrong', error);
		}

		// Find Fitness Course
		let fitnessCourseResult;
		if (orderResult.notes.item_id) {
			fitnessCourseResult = await FitnessCourseRepo.findOne({ _id: orderResult.notes.item_id });

			if (!fitnessCourseResult) {
				return reject('payment should be refund as course id not found');
			}
		} else {
			return reject('payment should be refund as no notes found in order');
		}

		// Create Payload
		let start_date = new Date(),
			duration = {
				unit: timeUnit.day,
				duration: fitnessCourseResult.duration_days,
			};

		let payload = {
			course_id: fitnessCourseResult._id,
			order_id: orderUpdateResult._id,
			user_id: orderResult.notes.user_id,
			duration,
			createdBy: user_id,
			updatedBy: user_id,
			start_date,
			end_date: moment(new Date()).add(duration.duration, 'days'),
		};

		GeneralCache.emit(UserPurchaseEvent, { user_id: user_id });

		assignAllQuiz({ user_id: user_id, course_id: payload.course_id, authorizedUserId: user_id }).catch((error) => logger.error(error));

		UserFitnessCourseRepo.create(payload)
			.then((result) => {
				UserRepo.findByIdAndUpdate(result.user_id, { is_alumni: false }, { new: true }).exec();
			})
			.catch((error) => logger.error(error));

		UserServiceRepo.findOneAndUpdate(
			{ user_id: user_id, service: userService.fgiit },
			{ user_id: user_id, service: userService.fgiit, status: true, createdBy: user_id, updatedBy: user_id },
			{ new: true, upsert: true }
		).catch((error) => logger.error(error));

		resolve('FITNESS COURSE SUCCESSFULLY PAID');

		// --- Send Mail ---
		try {
			if (userEmail != 'void@razorpay.com') {
				// Invoice & Feature Email
				let invoiceEmail = {
					orderID: orderUpdateResult.receipt_id,
					plan_name: fitnessCourseResult.course_name,
					amount: orderUpdateResult.amount,
				};

				const featureEmail = {
					plan_name: fitnessCourseResult.course_name,
					duration: fitnessCourseResult.duration_days + ' Days',
					loginButton:
						fitnessCourseResult.coaching_mode == 'VIRTUAL'
							? `
					<p></p>`
							: '<p style="font-family: Montserrat, sans-serif;font-size: 12px;line-height: 26px;color: grey;font-weight: 500;letter-spacing: .2em;padding: 0px 15px;">- Thank you for the purchase.</p>',
				};

				let getInvoiceBody, getFeatureBody;
				if (['6324db9cae47f19e757dbd45', '6324dba4ae47f19e757dbd48', '6324dc23ae47f19e757dbd4b'].includes(String(fitnessCourseResult._id))) {
					// Python Programming Course
					[getInvoiceBody, getFeatureBody] = await Promise.all([
						emailTemplate('PYTHON_COURSE_INVOICE', invoiceEmail).catch((error) => logger.error(error)),
						emailTemplate('PYTHON_COURSE_FEATURE', featureEmail).catch((error) => logger.error(error)),
					]);
				} else {
					[getInvoiceBody, getFeatureBody] = await Promise.all([
						emailTemplate('FGIIT_INVOICE', invoiceEmail).catch((error) => logger.error(error)),
						emailTemplate('FGIIT_FEATURE', featureEmail).catch((error) => logger.error(error)),
					]);
				}

				try {
					getInvoiceBody ? nodemailer(undefined, userEmail, 'Order Invoice - Three Style', getInvoiceBody, 'Three Style') : null;
					getFeatureBody ? nodemailer(undefined, userEmail, `Thank you for purchase ${fitnessCourseResult.course_name} - Three Style`, getFeatureBody, 'Three Style') : null;
				} catch (error) {
					logger.error(error);
				}
			}
		} catch (error) {
			logger.error(error);
		}

		try {
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
									text: fitnessCourseResult.course_name,
								},
								{
									type: 'text',
									text: orderUpdateResult.amount,
								},
							],
						},
					],
				};

				let activePlanBody = {
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: fitnessCourseResult.course_name,
								},
								{
									type: 'text',
									text: fitnessCourseResult.duration_days + ' Days',
								},
							],
						},
					],
				};

				// Invoice
				WhatsAppHelper.sendMessage(mobile, 'plan_invoice', invoiceBody).catch((error) => logger.error(error));

				// Feature
				WhatsAppHelper.sendMessage(mobile, 'plan_activeted_new', activePlanBody).catch((error) => logger.error(error));
			}
		} catch (error) {
			logger.error(error);
		}
	});
}
module.exports = FitnessWebhook;
