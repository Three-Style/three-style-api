/**
 * @author Brijesh Prajapati
 * @description Payment Callback for Books Payment
 */

const { winston: logger, DayJS } = require('../../../services');
const { OrdersRepo, UserBooksRepo, UserServiceRepo, UserRepo, BooksRepo } = require('../../../database');
const { orderStatus, shipmentStatus, userService, itemType } = require('../../../common');
const { getOrderByIDController, getPayment } = require('..');
const { nodemailer } = require('../../../services');
const { emailTemplate } = require('../../../helpers');
const { WhatsAppHelper } = require('../../../helpers');

module.exports = ({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) => {
	return new Promise(async (resolve, reject) => {
		try {
			logger.info('Controller > Users > Books > Payment Callback');

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
				email = UserOrderResult.user_id.email;

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

			// Create Payload
			let payload = {
				order_id: orderUpdateResult._id,
				user_id: orderResult.notes.user_id,
				tracking: [
					{
						shipment_status: shipmentStatus.placed,
						updatedBy: user_id,
					},
				],
				createdBy: user_id,
				updatedBy: user_id,
			};

			let books = [];
			if (orderUpdateResult.order_item_type === itemType.item_cart) {
				books = orderUpdateResult.multiple_items.filter((item) => item.item_type === itemType.books).map((item) => ({ book_id: item.item_id }));

				if (books.length === 0) {
					return reject('No books found in order');
				}

				payload.books = books;
			} else if (orderUpdateResult.order_item_id) {
				payload.book_id = orderUpdateResult.order_item_id;
			} else {
				return reject('No books found in order. Payment should be refund');
			}

			UserBooksRepo.findOneAndUpdate({ order_id: payload.order_id }, payload, { upsert: true, new: true }).catch((error) => logger.error(error.stack));

			resolve('success');

			UserServiceRepo.findOneAndUpdate(
				{ user_id: user_id, service: userService.fgiit },
				{ user_id: user_id, service: userService.fgiit, status: true, createdBy: user_id, updatedBy: user_id },
				{ new: true, upsert: true }
			).catch((error) => logger.error(error.stack));
			// Invoice & Feature Email
			let address = {
				address_line_1: orderUpdateResult.notes.address_line_1,
				address_line_2: orderUpdateResult.notes.address_line_2,
				city: orderUpdateResult.notes.city,
				pin_code: orderUpdateResult.notes.pin_code,
			};

			let delivery_address = Object.values(address).slice(0, 2).join(', ');
			let city_pin_code = Object.values(address).slice(2, 4).join(', ');

			// --- Send Mail ---
			let bookResult = await BooksRepo.find({
				_id: {
					$in: [...books.map((item) => item.book_id), payload.book_id],
				},
			})
				.select('book_title amount')
				.lean();

			bookResult = bookResult.map((book) => {
				let quantity = 1,
					amount = book.amount;

				if (orderUpdateResult.order_item_type === itemType.item_cart) {
					let item = orderUpdateResult.multiple_items.find((item) => item.item_id.equals(book._id));
					if (item) {
						quantity = item.quantity;
						amount = item.amount;
					}
				}

				return {
					...book,
					quantity,
					total_amount: amount,
				};
			});

			if (userEmail != 'void@razorpay.com') {
				const estimated_delivery_date = DayJS().add(7, 'days').format('DD-MM-YYYY');

				const BookList = bookResult
					.map((b) => {
						return `<tr>
						<td colspan="3" class="m-table-css" style="padding: 10px;border: 1px solid #424242;font-size: 12px;color: white;">
							${b.book_title}
						</td>
						<td class="m-table-css" style="padding: 10px;border: 1px solid #424242;font-size: 12px;color: white;">
							${b.quantity}
						</td>
						<td class="m-table-css" style="padding: 10px;border: 1px solid #424242;font-size: 12px;color: white;">
							${b.total_amount}
						</td>
					</tr>`;
					})
					.join('');

				let invoiceEmail = {
					receipt_id: orderUpdateResult.receipt_id,
					books_list: BookList,
					total_amount: orderUpdateResult.amount,
					delivery_address: delivery_address,
					city_pin_code: city_pin_code,
					estimate_delivery_on: estimated_delivery_date,
				};

				let featureEmail = {
					book_titles: bookResult.map((b) => b.book_title).join(', '),
					delivery_address: delivery_address,
					city_pin_code: city_pin_code,
				};

				emailTemplate('FGIIT_BOOK_INVOICE', invoiceEmail)
					.then((getInvoiceBody) => {
						nodemailer(undefined, userEmail, `Book Order Invoice [${invoiceEmail.receipt_id}] - Three Style`, getInvoiceBody, 'Three Style').catch((error) => logger.error(error));
					})
					.catch((error) => logger.error(error));

				emailTemplate('FGIIT_BOOK_FEATURE', featureEmail)
					.then((getFeatureBody) => {
						nodemailer(undefined, userEmail, `Thank you for purchase books - Three Style`, getFeatureBody, 'Three Style').catch((error) => logger.error(error));
					})
					.catch((error) => logger.error(error));
			}

			let mobile = UserOrderResult.user_id.mobile,
				first_name = UserOrderResult.user_id.first_name;
			// --- Send WhatsApp Message ---
			if (mobile) {
				let bodyInvoice = {
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: first_name,
								},
								{
									type: 'text',
									text: orderUpdateResult.receipt_id,
								},
								{
									type: 'text',
									text: bookResult.map((b) => b.book_title).join(', '),
								},
								{
									type: 'text',
									text: orderUpdateResult.amount,
								},
							],
						},
					],
				};

				let thankYouBody = {
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: first_name,
								},
								{
									type: 'text',
									text: bookResult.map((b) => b.book_title).join(', '),
								},
								{
									type: 'text',
									text: bookResult.map((b) => b.book_title).join(', '),
								},
								{
									type: 'text',
									text: delivery_address,
								},
								{
									type: 'text',
									text: city_pin_code,
								},
							],
						},
					],
				};

				// Invoice
				WhatsAppHelper.sendMessage(mobile, 'book_invoice_new', bodyInvoice).catch((error) => logger.error(error.stack));

				// Feature
				WhatsAppHelper.sendMessage(mobile, 'book_thank_you_msg', thankYouBody).catch((error) => logger.error(error.stack));
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
		} catch (error) {
			logger.error(error.stack);
		}
	});
};
