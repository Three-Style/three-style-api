const { RazorpayClient, DayJS, Joi } = require('../../services');
const { paymentGateway } = require('../../common');
const validPaymentGateways = Object.values(paymentGateway);

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.period
 * @param {number} params.interval
 * @param {string} params.notes
 * @param {string} params.name
 * @param {number} params.amount
 * @param {string} params.currency
 * @param {string} params.description
 * @param {string} params.gateway
 */
async function addPlanForSubscription(params) {
	const paramsSchema = Joi.object({
		period: Joi.string().required(),
		interval: Joi.number().required(),
		notes: Joi.object().optional(),
		name: Joi.string().required(),
		amount: Joi.number().required(),
		currency: Joi.string().required(),
		description: Joi.string().optional(),
		gateway: Joi.string()
			.valid(...validPaymentGateways)
			.required(),
	});

	let { error, value } = paramsSchema.validate(params);

	if (error) throw error;
	else params = value;

	const payload = {
		period: params.period,
		interval: params.interval,
		item: {
			name: params.name,
			amount: params.amount * 100,
			currency: params.currency,
			description: params.description,
		},
		notes: params.notes,
	};

	return RazorpayClient(params.gateway).plans.create(payload);
}

module.exports.addPlanForSubscription = addPlanForSubscription;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 */

async function getPlanForSubscriptions(params) {
	try {
		const paramsSchema = Joi.object({
			gateway: Joi.string()
				.valid(...validPaymentGateways)
				.required(),
		});

		let { error, value } = paramsSchema.validate(params);

		if (error) throw error;
		else params = value;

		return RazorpayClient(params.gateway).plans.fetch();
	} catch (err) {
		throw new Error(`Failed to create plan: ${err.error.description}`);
	}
}

module.exports.getPlanForSubscriptions = getPlanForSubscriptions;

/**
 * @author Brijesh Prajapati
 * @param {import('razorpay/dist/types/subscriptions').Subscriptions.RazorpaySubscriptionCreateRequestBody & { gateway: string }} params
 */

async function createSubscription(params) {
	const paramsSchema = Joi.object({
		gateway: Joi.string()
			.valid(...validPaymentGateways)
			.required(),
		plan_id: Joi.string().required(),
		total_count: Joi.number().required(),
		quantity: Joi.number().required(),
		start_at: Joi.date().optional(),
		expire_by: Joi.date().optional(),
		customer_notify: Joi.number().required(),
		addons: Joi.array().items(Joi.object()).optional(),
		notes: Joi.object().optional(),
		notify_info: Joi.object().optional(),
		name: Joi.string().optional(),
		amount: Joi.number().optional(),
		currency: Joi.string().optional(),
	});

	let { error, value } = paramsSchema.validate(params);
	if (error) throw error;
	else params = value;

	/**
	 * @type {import('razorpay/dist/types/subscriptions').Subscriptions.RazorpaySubscriptionCreateRequestBody}
	 */
	const payload = {
		plan_id: params.plan_id,
		total_count: params.total_count,
		quantity: params.quantity,
		customer_notify: params.customer_notify,
		addons: [
			{
				item: {
					name: params.name,
					amount: params.amount * 100,
					currency: params.currency,
				},
			},
		],
		notes: params.notes,
	};

	if (params.start_at) {
		payload.start_at = DayJS(params.start_at).unix();
	}
	if (params.expire_by) {
		payload.expire_by = DayJS(params.expire_by).unix();
	}

	return RazorpayClient(params.gateway).subscriptions.create(payload);
}

module.exports.createSubscription = createSubscription;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 * @param {string} params.subscription_id
 */

async function getSubscriptionsById(params) {
	const paramsSchema = Joi.object({
		gateway: Joi.string()
			.valid(...validPaymentGateways)
			.required(),
		subscription_id: Joi.string().required(),
	});

	let { error, value } = paramsSchema.validate(params);

	if (error) throw error;
	else params = value;

	return RazorpayClient(params.gateway).subscriptions.fetch(params.subscription_id);
}

module.exports.getSubscriptionsById = getSubscriptionsById;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 * @param {string} params.subscription_id
 * @param {string} params.cancel_at_cycle_end
 */

async function cancelSubscription(params) {
	try {
		const paramsSchema = Joi.object({
			gateway: Joi.string()
				.valid(...validPaymentGateways)
				.required(),
			subscription_id: Joi.string().required(),
			cancel_at_cycle_end: Joi.number().required(),
		});

		let { error, value } = paramsSchema.validate(params);

		if (error) throw error;
		else params = value;

		let cancelAtCycleEnd = params.cancel_at_cycle_end === 1;
		return await RazorpayClient(params.gateway).subscriptions.cancel(params.subscription_id, cancelAtCycleEnd);
	} catch (error) {
		throw new Error(`Failed to Cancel plan: ${error.error.description}`);
	}
}

module.exports.cancelSubscription = cancelSubscription;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 * @param {string} params.subscription_id
 */

async function pauseSubscription(params) {
	try {
		const paramsSchema = Joi.object({
			gateway: Joi.string()
				.valid(...validPaymentGateways)
				.required(),
			subscription_id: Joi.string().required(),
		});

		let { error, value } = paramsSchema.validate(params);

		if (error) throw error;
		else params = value;

		return RazorpayClient(params.gateway).subscriptions.pause(params.subscription_id);
	} catch (error) {
		throw new Error(`Failed to Pause plan: ${error.error.description}`);
	}
}

module.exports.pauseSubscription = pauseSubscription;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 * @param {string} params.subscription_id
 */
async function resumeSubscription(params) {
	try {
		const paramsSchema = Joi.object({
			gateway: Joi.string()
				.valid(...validPaymentGateways)
				.required(),
			subscription_id: Joi.string().required(),
		});

		let { error, value } = paramsSchema.validate(params);

		if (error) throw error;
		else params = value;

		return RazorpayClient(params.gateway).subscriptions.resume(params.subscription_id);
	} catch (error) {
		throw new Error(`Failed to Resume plan: ${error.error.description}`);
	}
}

module.exports.resumeSubscription = resumeSubscription;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 * @param {string} params.subscription_id
 */

async function fetchInvoiceSubscription(params) {
	const paramsSchema = Joi.object({
		gateway: Joi.string()
			.valid(...validPaymentGateways)
			.required(),
		subscription_id: Joi.string().required(),
	});

	let { error, value } = paramsSchema.validate(params);

	if (error) throw error;
	else params = value;

	return RazorpayClient(params.gateway).invoices.all({
		subscription_id: params.subscription_id,
	});
}

module.exports.fetchInvoiceSubscription = fetchInvoiceSubscription;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.gateway
 * @param {string} params.subscription_id
 * @param {string} params.plan_id
 * @param {string} params.remaining_count
 * @param {boolean} params.quantity
 * @param {boolean} params.schedule_change_at
 * @param {boolean} params.customer_notify
 */

async function updateSubscription(params) {
	const paramsSchema = Joi.object({
		gateway: Joi.string()
			.valid(...validPaymentGateways)
			.required(),
		subscription_id: Joi.string().required(),
		plan_id: Joi.string().required(),
		quantity: Joi.number().required(),
		remaining_count: Joi.number().required(),
		customer_notify: Joi.boolean().required(),
		schedule_change_at: Joi.date().optional(),
	});

	let { error, value } = paramsSchema.validate(params);

	if (error) throw error;
	else params = value;

	const payload = {
		plan_id: params.plan_id,
		quantity: params.quantity,
		remaining_count: params.remaining_count,
		customer_notify: params.customer_notify,
		schedule_change_at: params.schedule_change_at,
	};

	try {
		return RazorpayClient(params.gateway).subscriptions.update(params.subscription_id, payload);
	} catch (error) {
		throw new Error(`Failed to Cancel plan: ${error.error.description}`);
	}
}

module.exports.updateSubscription = updateSubscription;
