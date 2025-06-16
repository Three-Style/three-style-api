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
	[webhookHandler.pt_plan]: paymentGateway.razorpay,
	[webhookHandler.fwg_plan]: paymentGateway.razorpay,
	[webhookHandler.digital_plan]: paymentGateway.razorpay,
	[webhookHandler.books]: paymentGateway.razorpay_gomzi_consulting,
	[webhookHandler.fitness_course]: paymentGateway.razorpay_gomzi_consulting,
	[webhookHandler.fitness_course_cart]: paymentGateway.razorpay_gomzi_consulting,
	[webhookHandler.ebooks]: paymentGateway.razorpay_gomzi_consulting,
	[webhookHandler.fg_meals]: paymentGateway.razorpay_fgmeals,
	[webhookHandler.INPTA]: paymentGateway.razorpay_gomzi_consulting,
};

module.exports = { webhookHandler, PaymentCurrency: currency, webhookEvents: WebhookEvents, defaultGatewayPreference: DefaultGateway };
