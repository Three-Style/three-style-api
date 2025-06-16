/**
 * @author Brijesh Prajapati
 * @description Controller of e-books for users
 */

const httpStatus = require('http-status');
const { winston: logger, GeneralCache } = require('../../../services');
const response = require('../../../utils/response');
const { EBookRepo, OrdersRepo, UserRepo, ReferralCouponRepo } = require('../../../database');
const { purchaseMode, userType, userService, itemType, orderStatus } = require('../../../common');
const { randomDigit } = require('../../../utils/random');
const { createOrderController, getOrderByIDController, updateOrderByIDController } = require('../../razorpay');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const { webhookHandler, PaymentCurrency, defaultGatewayPreference } = require('../../../common/razorpay-webhook');
const { OrderModifiedEvent } = require('../../../common/cache_key');
const PreferredGateway = defaultGatewayPreference[webhookHandler.ebooks];
const RazorpayAPI = require('../../../services').RazorpayClient(PreferredGateway);

module.exports.createEBookPurchaseOrder = async (req, res) => {
	req.logger.info('Controller > Users > E-Books > Create Order');

	let { userAuthData } = req.headers,
		createdBy = userAuthData.id,
		updatedBy = userAuthData.id;
	let { ebook_id, quantity, coupon_id } = req.body;

	let userResult = await UserRepo.findOne({ _id: createdBy }, { password: false, authToken: false });

	let custom_receipt = `${userService.fgiit}-${randomDigit()}`;

	// Validate Body
	if (ebook_id) {
		if (!isValidObjectId(ebook_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Book ID', { ebook_id });
		}

		ebook_id = ObjectId.createFromHexString(ebook_id);
	} else {
		return response(res, httpStatus.BAD_REQUEST, 'Book ID is required');
	}

	if (quantity != undefined) {
		quantity = parseInt(quantity);

		if (isNaN(quantity) || quantity < 1) {
			return response(res, httpStatus.BAD_REQUEST, 'Quantity must be number grater or equal than 1', { quantity });
		}
	} else {
		return response(res, httpStatus.BAD_REQUEST, 'Quantity is required');
	}

	if (coupon_id) {
		if (!isValidObjectId(coupon_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Coupon ID', { coupon_id });
		}

		const isCouponValid = await ReferralCouponRepo.exists({ _id: ObjectId.createFromHexString(coupon_id), is_active: true });

		if (!isCouponValid) {
			coupon_id = undefined;
		} else {
			coupon_id = ObjectId.createFromHexString(coupon_id);
		}
	}

	// Validate Book
	let bookResult = await EBookRepo.findOne({ _id: ebook_id, status: true });

	if (!bookResult) {
		return response(res, httpStatus.BAD_REQUEST, 'Book not found', { ebook_id });
	}

	// If Pending Order Found, Then continue with this order details
	let orderResult = await OrdersRepo.find({ user_id: createdBy, order_item_type: itemType.ebooks });
	let pendingOrder = await getPendingOrder(orderResult, ebook_id);

	// If Pending Order Not Found, Then Create New Order
	let amount = bookResult.amount * quantity;
	let notes = {
		item_id: bookResult._id,
		item_type: itemType.ebooks,
		user_id: createdBy,
		quantity,
		coupon_id,
	};

	let razorpayOrderResult, orderPayload;

	// Validate in Pending Order with Quantity and Amount
	if (pendingOrder) {
		if (pendingOrder.notes.quantity != quantity || pendingOrder.amount != amount) {
			// Older Quantity is not equal to New Quantity or Amount is not equal to New Amount based on quantity
			pendingOrder = undefined;
		}
	}

	if (!pendingOrder) {
		try {
			// Create order in Razorpay and DB
			razorpayOrderResult = await createOrderController({ amount, custom_receipt, notes, webhook_handler: webhookHandler.ebooks, gateway: PreferredGateway });

			// Payload for DB
			orderPayload = {
				receipt_id: custom_receipt,
				user_id: createdBy,
				purchase_mode: purchaseMode.online,
				gateway_order_id: razorpayOrderResult.id,
				amount: amount,
				currency: PaymentCurrency.INR,
				order_item_id: bookResult._id,
				order_item_type: itemType.ebooks,
				createdBy,
				updatedBy,
				user_type: userType.user,
				status: orderStatus.pending,
				gateway: PreferredGateway,
				notes: {
					quantity,
					coupon_id,
				},
			};

			OrdersRepo.create(orderPayload).catch((error) => req.logger.error('Error while creating order in OrderRepo. ' + error.message));
		} catch (error) {
			return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
		}
	} else {
		if (coupon_id) {
			OrdersRepo.updateOne({ _id: pendingOrder._id }, { $set: { 'notes.coupon_id': coupon_id } }).catch((error) => req.logger.error('Error while updating order in OrderRepo. ' + error.message));
		}
	}

	try {
		// Payload for frontend
		let razorpayPayload = {
			order_id: pendingOrder ? pendingOrder.gateway_order_id : orderPayload.gateway_order_id,
			amount: pendingOrder ? pendingOrder.razorpay.amount : razorpayOrderResult.amount,
			currency: 'INR',
			prefill: {
				name: userResult.first_name + ' ' + userResult.last_name || '',
				email: userResult.email || null,
				contact: userResult.mobile ? userResult.mobile : null,
			},
			key: RazorpayAPI.key_id,
			notes: {
				...notes,
				receipt_id: pendingOrder ? pendingOrder.receipt_id : razorpayOrderResult.receipt,
			},
			name: bookResult.ebook_title,
			description: 'FGIIT EBook',
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

async function getPendingOrder(orderResult, ebook_id) {
	// Get Pending Order for the given Course ID
	let filterOrder = orderResult.filter((data) => String(data.order_item_id) == String(ebook_id) && data.status == orderStatus.pending);

	filterOrder = filterOrder[filterOrder.length - 1]; // Take Latest Order

	if (!filterOrder) {
		return false;
	}

	let razorpayOrder = await getOrderByIDController(filterOrder.gateway_order_id, PreferredGateway);

	if (razorpayOrder.error) {
		return false;
	}

	updateOrderByIDController({
		id: filterOrder.gateway_order_id,
		notes: { ...razorpayOrder.notes, webhook_handler: webhookHandler.ebooks, item_type: itemType.ebooks, coupon_id: filterOrder?.notes?.coupon_id },
		gateway: PreferredGateway,
	}).catch((error) => logger.error('Error while updating pending order. ' + error.message));

	if (razorpayOrder.status) {
		filterOrder.razorpay = razorpayOrder;
	}

	return razorpayOrder.status && razorpayOrder.status != 'paid' ? filterOrder : false;
}
