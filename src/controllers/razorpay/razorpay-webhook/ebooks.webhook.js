/**
 * @author Brijesh Prajapati
 * @description Payment Callback for Books Payment
 */

const { winston: logger, nodemailer } = require('../../../services');
const { OrdersRepo, EBookRepo, UserEBooksRepo, UserServiceRepo, UserRepo } = require('../../../database');
const { orderStatus, userService } = require('../../../common');
const { getOrderByIDController, getPayment } = require('..');
const { emailTemplate, WhatsAppHelper } = require('../../../helpers');
const filesHost = require('../../../config/default.json').filesHost;

module.exports = ({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) =>
	new Promise(async (resolve, reject) => {
		logger.info('Controller > Users > E-Books > Payment Callback');

		if (!razorpay_payment_id || !razorpay_order_id) {
			return reject('Payment or Order ID or Razorpay Signature required');
		}

		let orderResult = await getOrderByIDController(razorpay_order_id, razorpayGateway);
		let paymentResult = await getPayment(razorpay_payment_id, { gateway: razorpayGateway });
		let UserOrderResult = await OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }).populate({ path: 'user_id', select: '_id email mobile first_name' }).lean();
		if (!UserOrderResult) {
			return reject('Invalid Order ID');
		}

		let user_id = UserOrderResult.user_id._id,
			email = UserOrderResult.user_id.email,
			mobile = UserOrderResult.user_id.mobile;
		// first_name = UserOrderResult.user_id.first_name;

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

		// Find Book
		let ebookResult;
		if (orderResult.notes.item_id) {
			ebookResult = await EBookRepo.findOne({ _id: orderResult.notes.item_id });

			if (!ebookResult) {
				return reject('payment should be refund as book not found');
			}
		} else {
			return reject('payment should be refund as no notes found in order');
		}

		// Create Payload
		let payload = {
			ebook_id: ebookResult._id,
			order_id: orderUpdateResult._id,
			user_id: orderResult.notes.user_id,
			createdBy: user_id,
			updatedBy: user_id,
		};

		UserEBooksRepo.findOneAndUpdate({ order_id: payload.order_id }, payload, { upsert: true, new: true }).catch((error) => logger.error(error.stack));

		UserServiceRepo.findOneAndUpdate(
			{ user_id: user_id, service: userService.fgiit },
			{ user_id: user_id, service: userService.fgiit, status: true, createdBy: user_id, updatedBy: user_id },
			{ new: true, upsert: true }
		).catch((error) => logger.error(error.stack));

		resolve('success');

		// --- Send Mail ---
		if (userEmail != 'void@razorpay.com') {
			// Invoice & Feature Email
			let invoiceEmail = {
				orderID: orderUpdateResult.receipt_id,
				book_title: ebookResult.ebook_title,
				amount: orderUpdateResult.amount,
			};

			let featureEmail = {
				book_title: ebookResult.ebook_title,
			};

			emailTemplate('FGIIT_EBOOK_INVOICE', invoiceEmail)
				.then((getInvoiceBody) => {
					nodemailer(undefined, userEmail, `Order Invoice [${invoiceEmail.orderID}] - Three Style`, getInvoiceBody, 'Three Style').catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));

			emailTemplate('FGIIT_EBOOK_FEATURE', featureEmail)
				.then((getFeatureBody) => {
					// File Attachment
					/** @type {import('nodemailer/lib/mailer').Attachment[]} */
					let attachments = [];

					if (ebookResult.file_url) {
						attachments.push({
							filename: ebookResult.ebook_title + '.pdf',
							path: `${filesHost}/${ebookResult.file_url}`,
							contentType: 'application/pdf',
						});
					}

					nodemailer(undefined, userEmail, `Thank you for purchase book ${featureEmail.book_title} - Three Style`, getFeatureBody, 'Three Style', attachments).catch((error) => logger.error(error));
				})
				.catch((error) => logger.error(error));
		}

		// --- Send WhatsApp Message ---
		if (mobile) {
			let ebookInvoiceBody = {
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
								text: ebookResult.ebook_title,
							},
							{
								type: 'text',
								text: orderUpdateResult.amount,
							},
						],
					},
				],
			};

			let ebookSendBody = {
				components: [
					{
						type: 'header',
						parameters: [
							{
								type: 'document',
								document: {
									link: filesHost + ebookResult.file_url,
								},
							},
						],
					},
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: ebookResult.ebook_title,
							},
						],
					},
				],
			};

			// Invoice
			WhatsAppHelper.sendMessage(mobile, 'ebook_invoice', ebookInvoiceBody).catch((error) => logger.error(error.stack));

			// E-Book Send
			WhatsAppHelper.sendMessage(mobile, 'e_book_send', ebookSendBody).catch((error) => logger.error(error.stack));
		}

		// --- Send SMS ---
		// Estimated Delivery Date
		// const text = encodeURIComponent(`Hi ${first_name}, Thank you for purchasing on Three Style. You can view the details of your purchase here https://threestyle.in/book/orders.html`)

		// unirest
		//     .post(`http://sms.mobileadz.in/api/push.json?apikey=615b7adfe352e&sender=THREESTYLEF&mobileno=${mobile}&text=${text}`)
		//     .then(response => {
		//         logger.info(JSON.stringify(response.body))
		//     }).catch(error => {
		//         logger.error(error.stack)
		//     })
	});
