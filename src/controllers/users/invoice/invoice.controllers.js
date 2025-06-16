const httpStatus = require('http-status');
const { response } = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdSchema } = require('../../../helpers/joi-custom-validators.helpers');
const { InvoiceRepo } = require('../../../database');

// module.exports.getInvoiceController = async function (req, res) {
// 	try {

// 	} catch (error) {

// 	}
// }

module.exports.signInvoiceController = async function (req, res) {
	try {
		req.logger.info('Controllers > User > Invoice > Confirm Invoice');
		const { userAuthData } = req.headers;

		const BodySchema = Joi.object({
			invoice_id: JoiObjectIdSchema.required(),
			signature_image: Joi.string().uri({ relativeOnly: true }).required(),
		});

		const { error, value } = BodySchema.validate(req.body);

		if (error) return response(res, error);
		const { invoice_id, signature_image } = value;

		let getInvoice = await InvoiceRepo.findOne({ _id: invoice_id, user_id: userAuthData.id });

		if (!getInvoice) {
			return response(res, httpStatus.NOT_FOUND, 'Invoice not found.');
		}

		getInvoice.set('user_confirmation_signature_image', signature_image);

		getInvoice
			.save()
			.then((result) => {
				return response(res, httpStatus.OK, 'Invoice updated successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
