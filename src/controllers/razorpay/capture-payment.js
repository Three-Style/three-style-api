/**
 * @author Brijesh Prajapati
 * @description Capture Payment. Validate Amount deduced from customer bank is equal to capture
 * @param {string} razorpay_order_id
 */

const { winston: logger } = require('../../services');
const { RazorpayClient } = require('../../services');

module.exports = async ({ razorpay_payment_id, currency = 'INR', amount, gateway }) => {
	logger.info('Controller > Razorpay > Capture Payment');

	if (!razorpay_payment_id || !amount) {
		throw new Error('Payment ID and Amount are required');
	}

	return RazorpayClient(gateway).payments.capture(razorpay_payment_id, amount, currency);
};
