/**
 * @author Brijesh Prajapati
 * @description It will create order for payment gateway
 * @response Razorpay Response
 * @param {amount: Integer, notes: [], custom_receipt: String, webhook_handler: String}
 */

const { RazorpayClient } = require('../../services');
const { winston: logger } = require('../../services');
const { randomDigit } = require('../../utils/random');
const { webhookHandler, PaymentCurrency, defaultGatewayPreference } = require('../../common/razorpay-webhook');
const { paymentGateway } = require('../../common');

module.exports = ({ amount, notes, custom_receipt, webhook_handler, gateway, currency = PaymentCurrency.INR } = {}) => {
	logger.info('Controller > Razorpay > Create Order');

	let receipt = custom_receipt || randomDigit();
	let chosenGateway = gateway || defaultGatewayPreference[webhook_handler];

	try {
		// Validate amount
		if (!amount) {
			throw new Error('Amount is required');
		}

		// Validate Gateway
		if (gateway) {
			let validGateways = Object.values(paymentGateway);

			if (!validGateways.includes(gateway)) {
				throw new Error('Gateway is required');
			}
		}

		let netAmount = ~~(amount * 100);

		if (isNaN(netAmount)) {
			throw new Error('Amount is not valid');
		}

		if (netAmount < 100) {
			throw new Error('Minimum Amount is 1');
		}

		// Validate notes
		if (!notes) {
			throw new Error('Notes is required');
		}

		if (typeof notes !== 'object') {
			throw new Error('Notes should be an json object');
		}

		if (!webhook_handler || Object.values(webhookHandler).includes(webhook_handler) === false) {
			throw new Error('Valid Webhook handler is required');
		}

		notes.webhook_handler = webhook_handler;
		notes.payment_via = 'THREE-STYLE';

		// Create order
		let payload = {
			amount: netAmount,
			notes,
			receipt,
			currency: currency,
			payment_capture: 1,
		};

		return RazorpayClient(chosenGateway).orders.create(payload);
	} catch (error) {
		return { error: error.message };
	}
};
