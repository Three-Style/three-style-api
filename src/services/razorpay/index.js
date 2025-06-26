const logger = require('../winston'),
	razorpay = require('razorpay');
const { paymentGateway } = require('../../common');
const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'Service:Razorpay',
	},
});

/**
 * @author Brijesh Prajapati
 * @description Initializes a Razorpay instance with the given credentials and logs the status.
 * @param {string} key_id - The key ID for the Razorpay instance.
 * @param {string} key_secret - The key secret for the Razorpay instance.
 * @param {string} name - The name identifier for logging purposes.
 * @returns {import('razorpay') & { key_id: string }} - The initialized Razorpay instance with the key_id property.
 */
const initializeRazorpay = (key_id, key_secret, name) => {
	try {
		const instance = new razorpay({
			key_id,
			key_secret,
		});
		// Attach key_id as a property for easy access
		instance.key_id = key_id;
		CustomLogger.info(`[${name}]: Successful`);
		return instance;
	} catch (error) {
		CustomLogger.error(`[${name}]: Failed to Initialize Object.`, error);
		return null;
	}
};

let Razorpay = initializeRazorpay(process.env.RAZORPAY_KEY, process.env.RAZORPAY_SECRET, paymentGateway.razorpay);

/**
 * @author Brijesh Prajapati
 * @description Retrieves the appropriate Razorpay instance based on the specified gateway.
 * @param {('RAZORPAY')} gateway - The gateway identifier.
 * @returns {import('razorpay') & { key_id: string }} - The corresponding Razorpay instance.
 * @throws {Error} Throws an error if the gateway is invalid.
 */
module.exports = (gateway) => {
	if (Object.values(paymentGateway).includes(gateway) == false) {
		CustomLogger.error('Invalid Gateway');
		throw new Error('Invalid Gateway');
	}

	if (gateway === paymentGateway.razorpay) {
		return Razorpay;
	} else {
		CustomLogger.error('Invalid Gateway');
		throw new Error('Invalid Gateway');
	}
};
