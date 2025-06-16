/**
 * @author Brijesh Prajapati
 * @description It will handle payment.capture webhook from razorpay This function will verify signature and validate body data. Then it will pass data to respective controller for further processing. Controller is Promise based.
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const WebhookController = require('./razorpay-webhook/index.controllers');
const { webhookHandler, defaultGatewayPreference } = require('../../common/razorpay-webhook');
const { getOrderByIDController, updateOrderByIDController } = require('../razorpay');

module.exports = async (req, res) => {
	let { event, payload } = req.body;
	const event_id = req.headers['x-razorpay-event-id'];
	const logger = req.logger;

	const razorpay_signature = req.headers['x-razorpay-signature'];

	// Validate Body Type
	if (event !== 'payment.captured') {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid event type');
	}

	if (!payload || !payload.payment || !payload.payment.entity) {
		return response(res, httpStatus.BAD_REQUEST, 'Insufficient Data');
	}

	response(res, httpStatus.OK, 'Payment Capture Webhook Successful', undefined, undefined, undefined, { terminateAttachedLogger: false });

	let paymentData = payload.payment.entity;

	let { order_id } = paymentData;
	req.logger.info(`[Webhook] Order ID: ${order_id}`);

	let chosenGateway = defaultGatewayPreference[paymentData.notes.webhook_handler];

	if (!chosenGateway) {
		return logger.error(`Invalid Webhook Handler. Webhook not processed. paymentData.notes.webhook_handler does not match any gateway. Value: "${paymentData.notes.webhook_handler}"`);
	}

	let fetchOrderResult;
	try {
		fetchOrderResult = await getOrderByIDController(order_id, chosenGateway); // Order will have valid notes than payment.captured as it set while creating order
	} catch (error) {
		logger.error(error);
		return;
	}

	try {
		if (fetchOrderResult.notes.event_id == undefined) {
			updateOrderByIDController({
				id: order_id,
				notes: { ...fetchOrderResult.notes, webhook_event_id: event_id },
				gateway: chosenGateway,
			});
		}
	} catch (error) {
		logger.error(error);
		return;
	}

	// Prevent repeat Callback
	if (fetchOrderResult.notes.payment_domain == 'THREE-STYLE' && fetchOrderResult.notes.webhook_event_id == event_id) {
		logger.error('Webhook already called for this order');
		return;
	}

	// Check Payment done via "THREE-STYLE"
	if (!fetchOrderResult.notes || fetchOrderResult.notes.payment_via != 'THREE-STYLE') {
		return response(res, httpStatus.BAD_REQUEST, 'THREE-STYLE payment not found');
	}

	// Forward to Respective Controller
	let { notes } = fetchOrderResult;
	logger.info('Handler: ' + notes.webhook_handler);

	try {
		let controllerResponse;
		let commonParams = {
			razorpay_payment_id: paymentData.id,
			razorpay_order_id: paymentData.order_id,
			razorpay_signature: razorpay_signature,
			gateway: chosenGateway,
		};

		switch (notes.webhook_handler) {
			case webhookHandler.fwg_plan:
				controllerResponse = await WebhookController.FWGWebhookController(commonParams);
				break;
			case webhookHandler.pt_plan:
				controllerResponse = await WebhookController.FWGWebhookController(commonParams);
				break;
			case webhookHandler.fitness_course:
				controllerResponse = await WebhookController.FitnessCourseWebhookController(commonParams);
				break;
			case webhookHandler.books:
				controllerResponse = await WebhookController.BookWebhookController(commonParams);
				break;
			case webhookHandler.digital_plan:
				controllerResponse = await WebhookController.DigitalPlanWebhookController(commonParams);
				break;
			case webhookHandler.fg_meals:
				controllerResponse = await WebhookController.FGMealsWebhookController(commonParams);
				break;
			case webhookHandler.ebooks:
				controllerResponse = await WebhookController.EBooksWebhookController(commonParams);
				break;
			case webhookHandler.fitness_course_cart:
				controllerResponse = await WebhookController.FitnessCourseCartWebhookController(commonParams);
				break;
			case webhookHandler.INPTA:
				controllerResponse = await WebhookController.INPTAWebhookController(commonParams);
				break;

			default:
				return logger.error('[WEBHOOK-CONTROLLER]: Invalid Webhook Handler. Valid Webhook Handler is not found');
		}

		logger.info('[WEBHOOK-CONTROLLER]: ', controllerResponse);
	} catch (error) {
		logger.error(`[WEBHOOK-CONTROLLER]: ORDER_ID: ${order_id} :: ` + error);
	} finally {
		// logger.close();
	}
};
