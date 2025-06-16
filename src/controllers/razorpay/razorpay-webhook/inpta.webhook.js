const { getOrderByIDController, getPayment } = require('..');
const { orderStatus } = require('../../../common');
const { OrdersRepo, UserRepo, INPTAPurchaseItemsRepo } = require('../../../database');
const { emailTemplate, WhatsAppHelper } = require('../../../helpers');
const { convertToObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const { logger, nodemailer } = require('../../../services');

module.exports = function ({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) {
	return new Promise(async (resolve, reject) => {
		logger.info('Controller > Admin > Razorpay Webhook > INPTA Callback');

		if (!razorpay_payment_id || !razorpay_order_id) {
			return reject('Payment or Order ID or Razorpay Signature required');
		}

		let orderResult = await getOrderByIDController(razorpay_order_id, razorpayGateway);
		let paymentResult = await getPayment(razorpay_payment_id, { gateway: razorpayGateway });
		let UserOrderResult = await OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }).populate({ path: 'user_info', select: '_id email mobile first_name last_name' }).lean();
		if (!UserOrderResult) {
			return reject('Invalid Order ID');
		}

		let user_id = UserOrderResult.user_id,
			email = UserOrderResult.user_info.email,
			mobile = UserOrderResult.user_info.mobile;

		let userEmail = email || paymentResult.email;
		let userMobile = mobile || paymentResult.mobile;

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

		resolve('success');

		const getListingItem = await INPTAPurchaseItemsRepo.findOne({ _id: orderUpdateResult.order_item_id }).lean();

		if (!getListingItem) {
			logger.error('Invalid Product Purchased. Please contact administration to initiate refund.');
		}

		// Send SMS
		const msgBody = {
			components: [
				{
					type: 'body',
					parameters: [
						{
							type: 'text',
							text: '',
						},
					],
				},
			],
		};

		// Send Email & Whatsapp
		const FullName = `${UserOrderResult.user_info.first_name || ''} ${UserOrderResult.user_info.last_name || ''}`.trim();

		if (convertToObjectId(orderUpdateResult.order_item_id).equals(convertToObjectId('67b25cc1c9251c6e4dc5826d'))) {
			// Training Partner
			emailTemplate(emailTemplate.templates.INPTA_TRAINING_PARTNER, { fullName: FullName })
				.then((getInvoiceBody) => {
					nodemailer(undefined, userEmail, `INPTA Training Partner Order [${orderUpdateResult.receipt_id}]`, getInvoiceBody, 'INPTA').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));

			WhatsAppHelper.sendMessage(userMobile, 'inpta_training_partner', msgBody).catch((error) => logger.error(error.stack));
		}

		if (convertToObjectId(orderUpdateResult.order_item_id).equals(convertToObjectId('67b25d097e23724be1db752e'))) {
			// Training Center
			emailTemplate(emailTemplate.templates.INPTA_TRAINING_CENTER, { fullName: FullName })
				.then((getInvoiceBody) => {
					nodemailer(undefined, userEmail, `INPTA Training Center Order [${orderUpdateResult.receipt_id}]`, getInvoiceBody, 'INPTA').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));

			WhatsAppHelper.sendMessage(userMobile, 'inpta_training_center', msgBody).catch((error) => logger.error(error.stack));
		}

		if (convertToObjectId(orderUpdateResult.order_item_id).equals(convertToObjectId('67b25d2fc779551c717dd6f6'))) {
			// Training Center Certificate
			emailTemplate(emailTemplate.templates.INPTA_TC_CERTIFICATE, { fullName: FullName })
				.then((getInvoiceBody) => {
					nodemailer(undefined, userEmail, `INPTA Training Center Certificate Order [${orderUpdateResult.receipt_id}]`, getInvoiceBody, 'INPTA').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));

			WhatsAppHelper.sendMessage(userMobile, 'inpta_tc_certificate', msgBody).catch((error) => logger.error(error.stack));
		}

		if (convertToObjectId(orderUpdateResult.order_item_id).equals(convertToObjectId('67b25d4b8c672d287127c446'))) {
			// Training Center Auditor
			emailTemplate(emailTemplate.templates.INPTA_TC_AUDITOR, { fullName: '' })
				.then((getInvoiceBody) => {
					nodemailer(undefined, userEmail, `INPTA Training Center Auditor Order [${orderUpdateResult.receipt_id}]`, getInvoiceBody, 'INPTA').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));

			WhatsAppHelper.sendMessage(userMobile, 'inpta_tc_auditor', msgBody).catch((error) => logger.error(error.stack));
		}
	});
};
