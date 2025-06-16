/**
 * @author Brijesh Prajapati
 * @description Create Order for Books
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { BooksRepo, OrdersRepo, UserRepo, ReferralCouponRepo, UserBooksRepo } = require('../../../database');
const { purchaseMode, userType, userService, itemType, orderStatus } = require('../../../common');
const { randomDigit } = require('../../../utils/random');
const { createOrderController } = require('../../razorpay');
const { webhookHandler, PaymentCurrency, defaultGatewayPreference } = require('../../../common/razorpay-webhook');
const { logger, Joi, GeneralCache } = require('../../../services');
const { regexValidateUtil } = require('../../../utils');
const { isUndefined, omit } = require('lodash');
const { shipmentStatus } = require('../../../common');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');
const { OrderModifiedEvent } = require('../../../common/cache_key');

const PreferredGateway = defaultGatewayPreference[webhookHandler.books];
const RazorpayAPI = require('../../../services/razorpay')(PreferredGateway);

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Books > Create Order');

	let { userAuthData } = req.headers,
		createdBy = userAuthData.id,
		updatedBy = userAuthData.id;

	const bodySchema = Joi.object({})
		.keys({
			books: Joi.array()
				.items(
					Joi.object({
						book_id: Joi.custom(JoiObjectIdValidator).required(),
						quantity: Joi.number().integer().min(1).max(5).required(),
					})
				)
				.min(1)
				.required(),
			coupons: Joi.array().items(Joi.string()).optional(),
			address_line_1: Joi.string().required(),
			address_line_2: Joi.string().optional(),
			city: Joi.string().required(),
			pin_code: Joi.string().required(),
			state: Joi.string().required(),
			country: Joi.string().required(),
			payment_mode: Joi.string()
				.valid(...Object.values(purchaseMode))
				.required(),
		})
		.required();

	const { error, value } = bodySchema.validate(req.body);
	if (error) return response(res, error);

	let { books, coupons } = value;
	let { address_line_1, address_line_2, city, pin_code, state, country, payment_mode } = value;

	let userResult = await UserRepo.findOne({ _id: createdBy });

	let custom_receipt = `${userService.fgiit}-${randomDigit()}`;

	if (!regexValidateUtil.email(userResult.email)) return response(res, httpStatus.BAD_REQUEST, `Invalid Email ${userResult.email}`);

	let invalidIds = [];
	let totalAmount = 0;

	let booksData = await BooksRepo.find({ _id: { $in: books.map((book) => book.book_id) }, status: true });

	let bookArray = books.map((book) => {
		let bookData = booksData.find((data) => String(data._id) === String(book.book_id));
		if (!bookData) {
			invalidIds.push(book.book_id);
			return;
		}

		let amountForBook = bookData.amount * book.quantity;
		totalAmount += amountForBook;

		return {
			book_id: book.book_id,
			quantity: book.quantity,
			name: bookData.book_title,
			amount: amountForBook,
		};
	});

	if (invalidIds.length > 0) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid book ID', { invalid_book_ids: invalidIds });
	}

	let findCoupon;
	if (coupons) {
		let findCoupon = await ReferralCouponRepo.find({ coupon_code: { $in: coupons }, is_active: true });

		if (findCoupon.length !== coupons.length) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid or inactive Coupon ID(s)', { coupon_id: coupons });
		}

		let totalDiscount = 0;
		for (const coupon of findCoupon) {
			let usage_count = parseInt(coupon.usage_count);
			if (isNaN(usage_count) || usage_count >= coupon.max_usage_count) {
				return response(res, httpStatus.BAD_REQUEST, `We could not provide any discount ${coupon.coupon_code} due to limitation.`, { usage_count });
			}

			let discount = coupon.discount || 0;
			totalDiscount += totalAmount * (discount / 100);

			coupon.usage_count += 1;
		}

		totalDiscount = Number(totalDiscount.toFixed(2));
		totalAmount -= totalDiscount;

		if (totalAmount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Total amount cannot be 0.', { totalAmount });
		}

		await ReferralCouponRepo.updateMany({ coupon_code: { $in: coupons } }, { $inc: { usage_count: 1 } });
	}

	// If Pending Order Not Found, Then Create New Order
	let notes = {
		items: JSON.stringify(bookArray.map((item) => omit(item, 'name'))),
		item_type: itemType.books,
		user_id: createdBy,
	};

	if (findCoupon) {
		notes.coupons = JSON.stringify(findCoupon.map((coupon) => coupon._id));
	}

	let razorpayOrderResult, orderPayload;
	const multipleBook = bookArray.map((item) => ({
		item_id: item.book_id,
		item_type: itemType.books,
		quantity: item.quantity,
		amount: item.amount,
	}));

	let createOrderResult;

	try {
		if (payment_mode == purchaseMode.online) {
			try {
				// Create order in Razorpay and DB
				razorpayOrderResult = await createOrderController({ amount: totalAmount, custom_receipt, notes, webhook_handler: webhookHandler.books, gateway: PreferredGateway });
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
					multiple_items: multipleBook,
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
					},
				};

				if (findCoupon) {
					orderPayload.notes.coupons = findCoupon.map((coupon) => coupon._id);
				}

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
					multiple_items: multipleBook,
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
					},
				};

				if (findCoupon) {
					orderPayload.notes.coupons = findCoupon.map((coupon) => coupon._id);
				}

				createOrderResult = await OrdersRepo.create(orderPayload);
				let orderDetails = await OrdersRepo.findOne({ _id: createOrderResult._id }).populate({ path: 'user_id', select: '_id email mobile first_name last_name' }).lean();

				// Create Record in User Book
				let payload = {
					books: bookArray.map((item) => ({ book_id: item.book_id })),
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

				await UserBooksRepo.create(payload);
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
			order_id: razorpayOrderResult.id,
			amount: razorpayOrderResult.amount,
			currency: PaymentCurrency.INR,
			prefill: {
				name: `${userResult.first_name} ${userResult.last_name}`.trim(),
				email: userResult.email || '',
				contact: userResult.mobile || '',
			},
			key: RazorpayAPI.key_id,
			notes: {
				...notes,
				address_line_1,
				address_line_2,
				city,
				pin_code,
				state,
				country,
				receipt_id: razorpayOrderResult.receipt,
			},
			name: bookArray.map((book) => book.name).join(', '),
			description: 'FGIIT Books',
			readonly: {
				email: true,
				contact: true,
			},
		};

		GeneralCache.emit(OrderModifiedEvent, { user_id: createdBy });

		return response(res, httpStatus.OK, 'Order Created Successfully', razorpayPayload);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
