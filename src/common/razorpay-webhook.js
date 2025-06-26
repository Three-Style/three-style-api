const { paymentGateway } = require('.');

// Razorpay Webhook Constant
const webhookHandler = {
	pt_plan: 'FWG_PT_PLAN',
	fwg_plan: 'FWG_PLAN',
	books: 'FWG_BOOKS',
	digital_plan: 'FWG_DIGITAL_PLAN',
	fitness_course: 'FWG_FITNESS_COURSE',
	fitness_course_cart: 'FWG_FITNESS_COURSE_CART',
	fg_meals: 'FWG_FG_MEALS',
	ebooks: 'EBOOKS',
	INPTA: 'INPTA',
};

const currency = {
	INR: 'INR',
	USD: 'USD',
};

const WebhookEvents = {
	paymentCapture: 'payment.captured',
	subscriptionActivated: 'subscription.activated',
	subscriptionAuthenticated: 'subscription.authenticated',
	subscriptionPaused: 'subscription.paused',
	subscriptionCancelled: 'subscription.cancelled',
};

const DefaultGateway = {
	[webhookHandler.fg_meals]: paymentGateway.razorpay,
};

module.exports = { webhookHandler, PaymentCurrency: currency, webhookEvents: WebhookEvents, defaultGatewayPreference: DefaultGateway };
