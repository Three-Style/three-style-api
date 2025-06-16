/**
 * @author Brijesh Prajapati
 * @description Get Order using Order ID
 * @param {string} razorpay_order_id
 */

const { winston: logger } = require('../../services');
const { paymentGateway } = require('../../common');
const { RazorpayClient } = require('../../services');

module.exports = async (razorpay_order_id, gateway) => {
	logger.info('Controller > Razorpay > Get Order');

	const chosenGateway = gateway || paymentGateway.razorpay;

	try {
		// Validate Params
		if (!razorpay_order_id) {
			throw new Error('Order ID is required');
		}

		// Validate Gateway
		if (gateway) {
			let validGateways = Object.values(paymentGateway);

			if (!validGateways.includes(gateway)) {
				throw new Error('Gateway is required');
			}
		}
		return RazorpayClient(chosenGateway).orders.fetch(razorpay_order_id);
	} catch (error) {
		return { error: error.message };
	}
};
