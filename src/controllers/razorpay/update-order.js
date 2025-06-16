/**
 * @author Brijesh Prajapati
 * @description It will update order notes
 * @response Razorpay Response
 * @param {string} id
 * @param {Object} notes
 */

const { winston: logger } = require('../../services');
const { paymentGateway } = require('../../common');
const { RazorpayClient } = require('../../services');

module.exports = ({ id, notes, gateway }) => {
	logger.info('Controller > Razorpay > Update Order');

	const chosenGateway = gateway || paymentGateway.razorpay;

	try {
		if (!id) {
			throw new Error('ID is required');
		}

		// Validate notes
		if (!notes) {
			throw new Error('Notes is required');
		}

		if (typeof notes !== 'object') {
			throw new Error('Notes should be an json object');
		}

		// Validate Gateway
		if (gateway) {
			let validGateways = Object.values(paymentGateway);

			if (!validGateways.includes(gateway)) {
				throw new Error('Gateway is required');
			}
		}

		notes.payment_domain = 'THREE-STYLE';

		return RazorpayClient(chosenGateway).orders.edit(id, { notes: notes });
	} catch (error) {
		return { error: error.message };
	}
};
