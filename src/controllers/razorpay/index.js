/**
 * @author Brijesh Prajapati
 * @description Export Razorpay Controller
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { webhookEvents } = require('../../common/razorpay-webhook');

// Orders API
module.exports.createOrderController = require('./create-order');
module.exports.getOrderByIDController = require('./get-order');
module.exports.updateOrderByIDController = require('./update-order');

// Payment API
module.exports.capturePaymentController = require('./capture-payment');
module.exports.getPayment = require('./get-payment');

// Webhook Callback
module.exports.webhookHandler = (req, res) => {
	let { event } = req.body;

	if (event === webhookEvents.paymentCapture) {
		require('./payment-capture.webhook')(req, res);
	} else if ([webhookEvents.subscriptionActivated, webhookEvents.subscriptionAuthenticated, webhookEvents.subscriptionCancelled, webhookEvents.subscriptionPaused].includes(event)) {
		require('./subscription.webhook')(req, res);
	} else {
		return response(res, httpStatus.NOT_ACCEPTABLE, 'Unsupported Event. This webhook event is not supported by the server.');
	}
};
module.exports.paymentCaptureWebhookController = require('./payment-capture.webhook');
module.exports.subscriptionCaptureWebhookController = require('./subscription.webhook');
