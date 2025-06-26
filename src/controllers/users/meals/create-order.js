/**
 * @author Brijesh Prajapati
 * @description Create Order for Product
 */

const httpStatus = require('http-status');
const { DayJS, nodemailer, GeneralCache, Joi } = require('../../../services');
const fs = require('fs');
const response = require('../../../utils/response');
const { ProductsRepo, OrdersRepo, UserRepo, ReferralCouponRepo, UserMealProductRepo } = require('../../../database');
const { purchaseMode, userType, userService, itemType, orderStatus } = require('../../../common');
const { randomDigit } = require('../../../utils/random');
const { createOrderController } = require('../../razorpay');
const { ObjectId } = require('mongoose').Types;
const { webhookHandler, PaymentCurrency, defaultGatewayPreference } = require('../../../common/razorpay-webhook');
const { WhatsAppHelper } = require('../../../helpers');
const { getLoggerInstance, regexValidateUtil } = require('../../../utils');
const { isUndefined } = require('lodash');
const { shipmentStatus } = require('../../../common');
const { convertToObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const { OrderModifiedEvent } = require('../../../common/cache_key');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');
const PreferredGateway = defaultGatewayPreference[webhookHandler.fg_meals];
const RazorpayAPI = require('../../../services').RazorpayClient(PreferredGateway);

module.exports = async function (req, res) {
	const logger = getLoggerInstance(...arguments);
	logger.info('Controller > Users > Meals > Create Order');

	let { userAuthData } = req.headers,
		createdBy = userAuthData.id,
		updatedBy = userAuthData.id;
	let { coupon_id, products, delivery_charges } = req.body;
	let { address_line_1, address_line_2, city, pin_code, state, country, payment_mode } = req.body;

	if (!Object.values(purchaseMode).includes(payment_mode)) {
		return response(res, httpStatus.BAD_REQUEST, `Invalid purchase mode ${payment_mode}`, {
			valid_payment_mode: Object.values(purchaseMode),
		});
	}

	let userResult = await UserRepo.findOne({ _id: createdBy }, { password: false, authToken: false });

	let custom_receipt = `${userService.clothing}-${randomDigit()}`;

	if (!products || !Array.isArray(products) || products.length === 0) {
		return response(res, httpStatus.BAD_REQUEST, 'Products array is required');
	}

	if (!regexValidateUtil.email(userResult.email)) return response(res, httpStatus.BAD_REQUEST, `Invalid Email ${userResult.email}`);

	let totalAmount = 0;
	let productResult = [];

	const productsSchema = Joi.array().items(
		Joi.object({}).keys({
			product_id: Joi.string().custom(JoiObjectIdValidator).required(),
			quantity: Joi.number().integer().min(1).required(),
		})
	);

	const { error } = productsSchema.validate(products);
	if (error) {
		return response(res, error);
	}

	let productIds = products.map((product) => product.product_id);

	const fetchProducts = await ProductsRepo.find({ _id: { $in: productIds }, status: true }, 'price name', { lean: true });

	// Validate each product in the array
	for (let product of products) {
		let { product_id, quantity } = product;

		let findProduct = fetchProducts.find((data) => data._id.equals(product_id));

		if (!findProduct) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Product ID', { product_id });
		}

		let price = findProduct.price,
			name = findProduct.name;

		// Calculate the total amount for this product
		let amountForProduct = price * quantity;
		totalAmount += amountForProduct;

		// Push product details to the result array
		productResult.push({
			product_id,
			quantity,
			name: name,
			amount: amountForProduct,
		});
	}

	if (address_line_1 && city && pin_code) {
		address_line_1 = String(address_line_1).trim();
		city = String(city).trim();
		pin_code = String(pin_code).trim();

		if (address_line_1.length == 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Address Line 1 is required', { address_line_1 });
		}

		if (city.length == 0) {
			return response(res, httpStatus.BAD_REQUEST, 'City is required', { city });
		}

		if (isNaN(parseInt(pin_code)) || pin_code.length != 6) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Pin code for Indian Standards.', { pin_code });
		}
	} else {
		return response(res, httpStatus.BAD_REQUEST, 'Address, city and pin code are required');
	}

	if (address_line_2) {
		address_line_2 = String(address_line_2).trim();
	}

	if (Array.isArray(coupon_id) && coupon_id.length > 0) {
		let coupons;
		let totalDiscount = 0;

		try {
			coupons = await Promise.all(
				coupon_id.map(async (id) => {
					return await ReferralCouponRepo.findOne({ _id: ObjectId.createFromHexString(id), is_active: true });
				})
			);

			coupons = coupons.filter((coupon) => coupon);

			if (coupons.length === 0) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid or inactive Coupon ID(s)', { coupon_id });
			}

			for (const coupon of coupons) {
				let usage_count = parseInt(coupon.usage_count);
				if (isNaN(usage_count) || usage_count >= coupon.max_usage_count) {
					return response(res, httpStatus.BAD_REQUEST, 'Coupon usage limit reached', { usage_count });
				}

				if (coupon.discount_type === 'rupees') {
					let discount = coupon.discount || 0;
					totalDiscount = discount;
				} else {
					let discount = coupon.discount || 0;
					totalDiscount += totalAmount * (discount / 100);
				}

				coupon.usage_count += 1;
				await ReferralCouponRepo.updateOne({ _id: coupon._id }, { usage_count: coupon.usage_count });
			}

			totalAmount -= totalDiscount;
		} catch (error) {
			console.error('Error processing coupon:', error);
			return response(res, httpStatus.BAD_REQUEST, error.message);
		}
	}

	if (delivery_charges) {
		totalAmount += delivery_charges;
	}

	let notes = {
		item_id: productResult.map((item) => convertToObjectId(item.product_id)),
		item_type: itemType.clothing,
		user_id: createdBy,
	};

	let razorpayOrderResult, orderPayload;
	const multipleProduct = productResult.map((item) => ({
		item_id: item.product_id,
		item_type: itemType.clothing,
		quantity: item.quantity,
		amount: item.amount,
		notes: {},
	}));

	let delivery_address;
	let city_pin_code;
	let address;
	let createOrderResult;

	try {
		if (payment_mode == purchaseMode.online) {
			try {
				// Create order in Razorpay and DB
				razorpayOrderResult = await createOrderController({ amount: totalAmount, custom_receipt, notes, webhook_handler: webhookHandler.fg_meals, gateway: PreferredGateway });
				if (razorpayOrderResult.error) {
					logger.error(razorpayOrderResult.error);
					return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Failed to Razorpay Create order', razorpayOrderResult.error);
				}
				// Payload for DB
				orderPayload = {
					receipt_id: custom_receipt,
					user_id: createdBy,
					purchase_mode: purchaseMode.online,
					gateway_order_id: razorpayOrderResult.id,
					amount: totalAmount,
					currency: PaymentCurrency.INR,
					multiple_items: multipleProduct,
					order_item_type: itemType.item_cart,
					createdBy,
					updatedBy,
					user_type: userType.user,
					status: orderStatus.pending,
					gateway: PreferredGateway,
					notes: {
						address_line_1,
						address_line_2,
						city,
						pin_code,
						state,
						country,
						coupon_id,
					},
				};

				address = {
					address_line_1: orderPayload.notes.address_line_1,
					address_line_2: orderPayload.notes.address_line_2,
					city: orderPayload.notes.city,
					pin_code: orderPayload.notes.pin_code,
				};

				delivery_address = Object.values(address).slice(0, 2).join(', ');
				city_pin_code = Object.values(address).slice(2, 4).join(', ');

				createOrderResult = await OrdersRepo.create(orderPayload);
			} catch (error) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			}
		} else if (payment_mode === purchaseMode.cashOnDelivery) {
			if (isUndefined(userResult.email)) return response(res, httpStatus.BAD_REQUEST, `Email is required for ${purchaseMode.cashOnDelivery} orders`);

			try {
				// Create order without Razorpay for COD orders
				let orderPayload = {
					receipt_id: custom_receipt,
					user_id: createdBy,
					purchase_mode: purchaseMode.cashOnDelivery,
					amount: totalAmount,
					currency: PaymentCurrency.INR,
					multiple_items: multipleProduct,
					order_item_type: itemType.item_cart,
					createdBy,
					updatedBy,
					user_type: userType.user,
					status: orderStatus.success,
					notes: {
						address_line_1,
						address_line_2,
						city,
						pin_code,
						state,
						country,
						coupon_id,
					},
				};

				createOrderResult = await OrdersRepo.create(orderPayload);
				let orderDetails = await OrdersRepo.findOne({ _id: createOrderResult._id }).populate({ path: 'user_id', select: '_id email mobile first_name last_name' }).lean();

				// Create Record in User Meal Product

				// Create Payload
				let payload = {
					products: productResult.map((item) => ({ product_id: item.product_id, quantity: item.quantity, amount: item.amount })),
					order_id: createOrderResult._id,
					user_id: createdBy,
					tracking: [
						{
							shipment_status: shipmentStatus.placed,
							updatedBy: createdBy,
						},
					],
					createdBy: createdBy,
					updatedBy: createdBy,
				};

				await UserMealProductRepo.findOneAndUpdate({ order_id: payload.order_id }, payload, { upsert: true, new: true });

				address = {
					address_line_1: orderPayload.notes.address_line_1,
					address_line_2: orderPayload.notes.address_line_2,
					city: orderPayload.notes.city,
					pin_code: orderPayload.notes.pin_code,
				};

				delivery_address = Object.values(address).slice(0, 2).join(', ');
				city_pin_code = Object.values(address).slice(2, 4).join(', ');
				sendEmailAndWhatsapp(delivery_address, city_pin_code, orderDetails, createOrderResult, productResult);

				GeneralCache.emit(OrderModifiedEvent, { user_id: createdBy });

				return response(res, httpStatus.OK, 'COD Order Created Successfully', orderDetails);
			} catch (error) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Failed to create COD order', error);
			}
		}
	} catch (error) {
		console.error(error);
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}

	try {
		// Payload for frontend
		let razorpayPayload = {
			order_id: orderPayload.gateway_order_id,
			amount: razorpayOrderResult.amount,
			currency: PaymentCurrency.INR,
			prefill: {
				name: userResult.first_name + ' ' + userResult.last_name || '',
				email: userResult.email || null,
				contact: userResult.mobile ? userResult.mobile : null,
			},
			key: RazorpayAPI.key_id,
			notes: {
				...notes,
				address_line_1,
				address_line_2,
				city,
				pin_code,
				receipt_id: razorpayOrderResult.receipt,
			},
			name: 'Three Style',
			description: 'Three Style',
			readonly: {
				email: true,
				contact: true,
			},
		};

		GeneralCache.emit(OrderModifiedEvent, { user_id: createdBy });
		return response(res, httpStatus.OK, 'Order Created Successfully', razorpayPayload);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Failed to create order', error);
	}
};

async function sendEmailAndWhatsapp(delivery_address, city_pin_code, orderDetails, orderUpdateResult, productResult) {
	const logger = getLoggerInstance(...arguments);
	// --- Send Mail ---
	if (orderDetails.user_id.email && orderDetails.user_id.email !== 'void@razorpay.com') {
		// Invoice & Feature Email
		const estimated_delivery_date = DayJS(orderUpdateResult.createdAt).add(7, 'days').format('DD-MM-YYYY');
		let totalAmount = productResult.reduce((sum, product) => sum + product.amount, 0);

		let emailTemplatePath = `${process.cwd()}/src/templates/invoice/fgmeals_invoice.html`;
		let templateHTML = await fs.readFileSync(emailTemplatePath, 'utf8');
		templateHTML = templateHTML
			.replace('{{receipt_id}}', orderUpdateResult.receipt_id)
			.replace('{{delivery_address}}', delivery_address)
			.replace('{{city_pin_code}}', city_pin_code)
			.replace('{{estimated_delivery_date}}', estimated_delivery_date)
			.replace('{{totalAmount}}', totalAmount.toFixed(2))
			.replace('{{products_table}}', generateProductTable(productResult));
		try {
			nodemailer(undefined, orderDetails.user_id.email, `Order Invoice [${orderUpdateResult.receipt_id}] - Three Style`, templateHTML, 'Three Style');
		} catch (error) {
			logger.error(error.stack);
		}
	}

	// --- Send WhatsApp Message ---
	if (orderDetails.user_id.mobile) {
		let invoiceBody = {
			components: [
				{
					type: 'body',
					parameters: [
						{
							type: 'text',
							text: orderDetails.user_id.first_name,
						},
						{
							type: 'text',
							text: orderUpdateResult._id,
						},
						{
							type: 'text',
							text: productResult.map((item) => item.name).join(', '),
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
							text: orderDetails.user_id.first_name,
						},
						{
							type: 'text',
							text: productResult.map((item) => item.name).join(', '),
						},
						{
							type: 'text',
							text: productResult.map((item) => item.name).join(', '),
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
		WhatsAppHelper.sendMessage(orderDetails.user_id.mobile, 'invoice_1', invoiceBody).catch((error) => logger.error(error.stack));

		// Thank you
		WhatsAppHelper.sendMessage(orderDetails.user_id.mobile, 'invoice_thank_you', thankYouBody).catch((error) => logger.error(error.stack));
	}
}
function generateProductTable(products) {
	return products
		.map(
			(product) => `
    <tr>
      <td colspan="3" class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 10px;">${product.name}</td>
      <td class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 10px;">${product.quantity}</td>
      <td class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 10px;">${product.amount}</td>
    </tr>
  `
		)
		.join('');
}

// async function getPendingOrder(orderResult, product_id) {
// 	const logger = getLoggerInstance(...arguments);

// 	// Get Pending Order for the given Course ID
// 	let filterOrder = orderResult.filter((data) => String(data.order_item_id) == String(product_id) && data.status == orderStatus.pending);

// 	filterOrder = filterOrder[filterOrder.length - 1]; // Take Latest Order

// 	if (!filterOrder) {
// 		return false;
// 	}

// 	let razorpayOrder = await getOrderByIDController(filterOrder.gateway_order_id, PreferredGateway);

// 	if (razorpayOrder.error) {
// 		return false;
// 	}

// 	updateOrderByIDController({ id: filterOrder.gateway_order_id, notes: { ...razorpayOrder.notes, webhook_handler: webhookHandler.fg_meals }, gateway: PreferredGateway }).catch((error) =>
// 		logger.error('Error while updating pending order. ' + error.message)
// 	);

// 	if (razorpayOrder.status) {
// 		filterOrder.razorpay = razorpayOrder;
// 	}

// 	return razorpayOrder.status && razorpayOrder.status != 'paid' ? filterOrder : false;
// }
