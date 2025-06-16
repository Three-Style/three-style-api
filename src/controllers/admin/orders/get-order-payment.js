/**
 * @author Brijesh Prajapati
 * @description Get User Orders
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { getPayment } = require('../../razorpay');
const { Joi } = require('../../../services');
const { paymentGateway } = require('../../../common');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Orders > Get Payment');

	const BodySchema = Joi.object({
		razorpay_id: Joi.string()
			.pattern(/^(order_|pay_)/)
			.required(),
		gateway: Joi.string()
			.valid(...Object.values(paymentGateway))
			.required(),
	});

	const { error, value } = BodySchema.validate(req.body);

	if (error) return response(res, error);

	try {
		let result = await getPayment(value.razorpay_id, { gateway: value.gateway });

		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.BAD_REQUEST, error?.error?.description, error.error);
	}
};
