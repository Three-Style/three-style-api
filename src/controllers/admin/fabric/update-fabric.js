/**
 * @author Brijesh Prajapati
 * @description Modify Fabric
 */

const httpStatus = require('http-status');
const { FabricRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Fabric > Update Fabric');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		id: Joi.string().custom(JoiObjectIdValidator).required(),
		name: Joi.string().required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { id, name } = req.body;

	try {
		let payload = { name, createdBy: adminAuthData.id, updatedBy: adminAuthData.id };

		// DB: find & update
		return FabricRepo.findOneAndUpdate({ _id: id, status: true }, payload, { new: true })
			.then((result) => (result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.OK, 'Incorrect Fabric id')))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
