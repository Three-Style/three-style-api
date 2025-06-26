/**
 * @author Brijesh Prajapati
 * @description Handler for Webhook
 */

const { nodemailer } = require('../../../services');
const { winston: logger, DayJS } = require('../../../services');
const { OrdersRepo, UserMealProductRepo, ProductsRepo, UserServiceRepo, UserRepo } = require('../../../database');
const { userService, shipmentStatus, itemType, orderStatus } = require('../../../common');
const { getPayment, getOrderByIDController } = require('..');
const { emailTemplate, WhatsAppHelper } = require('../../../helpers');

function FGMealsWebhook({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) {
	return new Promise(async (resolve, reject) => {
		try {
			logger.info('Controller > Admin > Razorpay Webhook > FWG Callback');

			if (!razorpay_payment_id || !razorpay_order_id) {
				return reject('Payment or Order ID required');
			}

			let orderResult = await getOrderByIDController(razorpay_order_id, razorpayGateway); // Razorpay
			let paymentResult = await getPayment(razorpay_payment_id, { gateway: razorpayGateway }); // Razorpay
			let UserOrderResult = await OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }).populate({ path: 'user_id', select: '_id email mobile first_name last_name' }).lean();

			if (!UserOrderResult) {
				return reject('Invalid Order ID');
			}

			let user_id = UserOrderResult.user_id._id,
				email = UserOrderResult.user_id.email;

			let userEmail = email || paymentResult.email;

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
				/**
				 * Update Order
				 * - Set Status Success
				 * - Store Signature (if passed)
				 * - Store Transaction ID / Payment ID
				 */
				orderUpdateResult = await OrdersRepo.findOneAndUpdate(
					{
						gateway_order_id: razorpay_order_id,
						// status: { $ne: orderStatus.success }
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

			/**
			 * Create Record in User Meal Product
			 * It'll store full details than order records.
			 */

			let products = [];
			if (orderUpdateResult.order_item_type === itemType.item_cart) {
				// This is cart order. we should fetch meal product from cart.

				products = orderUpdateResult.multiple_items.filter((item) => item.item_type === itemType.clothing).map((item) => ({ product_id: item.item_id }));

				if (products.length === 0) {
					return reject(`payment should be refund as no ${itemType.clothing} product not found`);
				}

				payload.products = products;
			} else if (UserOrderResult.order_item_id) {
				payload.product_id = UserOrderResult.order_item_id;
				payload.quantity = Number(orderResult.notes.quantity);
			} else {
				return reject('payment should be refund as no notes found in order');
			}

			let userMealProductResult;
			try {
				userMealProductResult = await UserMealProductRepo.create(payload);
			} catch (error) {
				logger.error(error);
				return reject('Failed to create user meal product');
			}

			resolve('success');

			UserServiceRepo.findOneAndUpdate(
				{ user_id: user_id, service: userService.clothing },
				{ user_id: user_id, service: userService.clothing, status: true, createdBy: user_id, updatedBy: user_id },
				{ new: true, upsert: true }
			).catch((error) => logger.error(error));

			let address = {
				address_line_1: orderUpdateResult.notes.address_line_1,
				address_line_2: orderUpdateResult.notes.address_line_2,
				city: orderUpdateResult.notes.city,
				pin_code: orderUpdateResult.notes.pin_code,
			};

			let delivery_address = Object.values(address).slice(0, 2).join(', ');
			let city_pin_code = Object.values(address).slice(2, 4).join(', ');

			let productsData = [];
			if (userMealProductResult.products.length) {
				productsData = userMealProductResult.products.map((item) => item.product_id);
			} else if (userMealProductResult.product_id) {
				productsData = [userMealProductResult.product_id];
			}

			let findProducts = await ProductsRepo.find({ _id: { $in: productsData } })
				.select('name')
				.lean();

			let totalAmount = 0;

			productsData = productsData
				.map((id) => {
					let product = findProducts.find((product) => product._id.equals(id));

					let quantity = 1,
						amount = 0;

					let productName = product.name;

					if (orderUpdateResult.multiple_items.length) {
						let findItemFromOrder = orderUpdateResult.multiple_items.find((item) => item.item_id.equals(id));

						if (!findItemFromOrder) {
							return;
						}

						quantity = findItemFromOrder.quantity;
						amount = findItemFromOrder.amount;
					} else {
						quantity = orderUpdateResult.notes?.quantity || 1;
						amount = orderUpdateResult.amount;
					}

					totalAmount += amount;

					return {
						product_id: id,
						product_name: productName,
						quantity,
						amount,
					};
				})
				.filter((i) => i);

			// --- Send Mail ---
			if (userEmail != 'void@razorpay.com') {
				// Update Email in User Account
				UserRepo.findOneAndUpdate({ _id: user_id }, { email: String(userEmail).trim().toLowerCase() }, { new: true }).catch((error) => logger.error('Email Update failed' + error.message));

				const estimated_delivery_date = DayJS(new Date()).add(7, 'days').format('DD-MM-YYYY');

				const ProductTableHTML = productsData
					.map((product) => {
						return `<tr>
								<td colspan="3" class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">
									${product.product_name}
								</td>
								<td class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">
									${product.quantity}
									</td>
								<td class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">
									${product.amount}
								</td>
							</tr>`;
					})
					.join('');

				let invoiceEmail = {
					receipt_id: orderUpdateResult.receipt_id,
					order_id: orderUpdateResult._id,
					products_table: ProductTableHTML,
					totalAmount: totalAmount,
					delivery_address: delivery_address,
					city_pin_code: city_pin_code,
					estimated_delivery_date,
				};

				emailTemplate('FGMEALS_INVOICE', invoiceEmail)
					.then((getInvoiceBody) => {
						nodemailer(undefined, userEmail, `Order Invoice [${invoiceEmail.receipt_id}] - Three Style`, getInvoiceBody, 'Three Style');
					})
					.catch((error) => logger.error(error));
			}

			// --- Send WhatsApp Message ---
			let mobile = UserOrderResult.user_id.mobile,
				first_name = UserOrderResult.user_id.first_name;

			if (mobile) {
				let invoiceBody = {
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
									text: orderUpdateResult._id,
								},
								{
									type: 'text',
									text: productsData.map((item) => item.product_name).join(', '),
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
									text: productsData.map((item) => item.product_name).join(', '),
								},
								{
									type: 'text',
									text: productsData.map((item) => item.product_name).join(', '),
								},
								{
									type: 'text',
									text: orderUpdateResult.amount,
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
				WhatsAppHelper.sendMessage(mobile, 'invoice_1', invoiceBody).catch((error) => logger.error(error.stack));

				// Thank you
				WhatsAppHelper.sendMessage(mobile, 'invoice_thank_you', thankYouBody).catch((error) => logger.error(error.stack));
			}

			/**
			 * Send Text SMS
			 */

			// Estimated Delivery Date
			// const text = encodeURIComponent(`Hi ${first_name}, Thank you for purchasing on Three Style. You can view the details of your purchase here https://threestyle.in/fgmeals/orders.html`);

			// unirest
			//     .post(`http://sms.mobileadz.in/api/push.json?apikey=615b7adfe352e&sender=THREESTYLEF&mobileno=${mobile}&text=${text}`)
			//     .then(response => {
			//         logger.info(JSON.stringify(response.body))
			//     }).catch(error => {
			//         logger.error(error.stack)
			//     })
		} catch (error) {
			logger.error(error);
			reject(error);
		}
	});
}
module.exports = FGMealsWebhook;

// async function createShipRocketToken(email, password) {
// 	try {
// 		const shipRocketAuthUrl = 'https://apiv2.shiprocket.in/v1/external/auth/login';

// 		const headers = {
// 			'Content-Type': 'application/json'
// 		};

// 		const data = {
// 			email,
// 			password
// 		};
// 		const response = await axios.post(shipRocketAuthUrl, data, { headers });

// 		return response.data.token;
// 	} catch (error) {
// 		logger.error(`Error creating ShipRocket token: ${error.stack}`);
// 		throw error;
// 	}
// }

//Add Order in ShipRocket
// async function addOrderToShipRocket(order, productData) {
// 	try {
// 		const token = await createShipRocketToken(process.env.ShipRocket_ID, process.env.ShipRocket_Password);

// 		const {
// 			createdAt: order_date,
// 			_id: order_id,
// 			user_id: { first_name: billing_customer_name, last_name: billing_last_name, email: billing_email, mobile: billing_phone },
// 			notes: { address_line_1: billing_address, address_line_2: billing_address_2, city: billing_city, pin_code: billing_pincode, state: billing_state, country: billing_country },
// 			amount: sub_total
// 		} = order;

// 		const payment_method = order.purchase_mode === 'ONLINE' ? 'Prepaid' : '';

// 		const transformedOrderItems = {
// 			name: productData.name,
// 			sku: productData.product_id,
// 			units: order.notes?.quantity,
// 			selling_price: order.amount,
// 			discount: 0,
// 			tax: 0,
// 			hsn: 441122
// 		};

// 		// Save ShipRocket Data
// 		const shipRocketData = new ShipRocketDataRepo({
// 			order_id,
// 			order_date,
// 			pickup_location: 'Primary',
// 			comment: 'Website Order',
// 			billing_customer_name,
// 			billing_last_name,
// 			billing_address,
// 			billing_address_2,
// 			billing_city,
// 			billing_pincode,
// 			billing_state,
// 			billing_country,
// 			billing_email,
// 			billing_phone,
// 			shipping_is_billing: true,
// 			order_items: transformedOrderItems,
// 			payment_method,
// 			sub_total,
// 			length: '5',
// 			breadth: '5',
// 			height: '5',
// 			weight: '2.5',
// 			createdBy: order.createdBy,
// 			updatedBy: order.updatedBy
// 		});

// 		await shipRocketData.save();

// 		const shipRocketApiUrl = 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc';

// 		const headers = {
// 			'Content-Type': 'application/json',
// 			Authorization: `Bearer ${token}`
// 		};

// 		// Format the date as "yyyy-mm-dd"
// 		const formattedOrderDate = DayJS(shipRocketData.order_date).format('YYYY-MM-DD');

// 		const shipRocketOrderData = {
// 			order_id: shipRocketData.order_id,
// 			order_date: formattedOrderDate,
// 			comment: shipRocketData.comment,
// 			pickup_location: shipRocketData.pickup_location,
// 			billing_customer_name: shipRocketData.billing_customer_name,
// 			billing_last_name: shipRocketData.billing_last_name,
// 			order_items: shipRocketData.order_items,
// 			billing_address: shipRocketData.billing_address,
// 			billing_address_2: shipRocketData.billing_address_2,
// 			billing_city: shipRocketData.billing_city,
// 			billing_pincode: shipRocketData.billing_pincode,
// 			billing_state: shipRocketData.billing_state || 'Gujarat',
// 			billing_country: shipRocketData.billing_country || 'India',
// 			billing_email: shipRocketData.billing_email,
// 			billing_phone: shipRocketData.billing_phone,
// 			shipping_is_billing: true,
// 			payment_method: shipRocketData.payment_method,
// 			sub_total: shipRocketData.sub_total,
// 			length: shipRocketData.length,
// 			breadth: shipRocketData.breadth,
// 			height: shipRocketData.height,
// 			weight: shipRocketData.weight
// 		};

// 		await axios.post(shipRocketApiUrl, shipRocketOrderData, { headers });
// 		logger.info('Order created on ShipRocket:', 'Success');
// 	} catch (error) {
// 		logger.error(`Error adding order to ShipRocket: ${error.stack}`);
// 		throw error;
// 	}
// }
