const httpStatus = require('http-status');

/**
 *
 * @param {import("razorpay/dist/types/api").INormalizeError} error
 * @returns {object}
 */
function errorParser(error) {
	let code = error.statusCode;
	let message = error.error.description;

	return {
		status: code,
		message: message,
		response: httpStatus[`${code}_NAME`],
	};
}

module.exports = errorParser;
