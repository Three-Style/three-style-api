/**
 * @author Brijesh Prajapati
 * @description Assign/Add fitness course to user account
 */

const httpStatus = require('http-status'),
	{ OrdersRepo } = require('../../../database'),
	{ nodeCache } = require('../../../services'),
	response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');
const { OrderModifiedEvent } = require('../../../common/cache_key');
const { isUndefined } = require('lodash');
const { PaymentCurrency } = require('../../../common/razorpay-webhook');
const GeneralCache = nodeCache('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Orders > Update Order');

	const { adminAuthData } = req.headers;
	var { order_id, paid_amount, amount, currency = PaymentCurrency.INR } = req.body;

	if (!order_id || isValidObjectId(order_id) === false) {
		return response(res, httpStatus.BAD_REQUEST, 'valid order_id is required');
	}

	let updatePayload = {
		updatedBy: adminAuthData.id,
	};

	if (!isUndefined(amount)) {
		amount = Number(amount);

		if (isNaN(amount) || amount < 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid amount. It must be greater than or equal to 0.');
		}

		updatePayload.amount = amount;
	}

	if (!isUndefined(paid_amount)) {
		paid_amount = Number(paid_amount);

		if (isNaN(paid_amount) || paid_amount < 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid paid_amount. It must be greater than or equal to 0.');
		}

		updatePayload['payment_breakdowns.paid_amount'] = paid_amount;
	}

	if (currency) {
		currency = String(currency);

		if (Object.values(PaymentCurrency).includes(currency) === false) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid currency');
		}

		updatePayload.currency = currency;
	}

	// DB: Update
	OrdersRepo.findOneAndUpdate({ _id: order_id }, updatePayload, { new: true })
		.then((result) => {
			if (!result) return response(res, httpStatus.NOT_FOUND, 'Order not found');

			GeneralCache.emit(OrderModifiedEvent);
			return response(res, httpStatus.OK, 'success', result);
		})
		.catch((error) => {
			return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
		});
};
