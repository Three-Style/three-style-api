/**
 * @author Brijesh Prajapati
 * @description Add Fabric
 */

const httpStatus = require('http-status');
const { FabricRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Fabric > Add Fabric');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		name: Joi.string().required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { name } = req.body;

	try {
		let payload = {
			name,
			createdBy: adminAuthData.id,
			updatedBy: adminAuthData.id,
		};

		// DB: Create
		return FabricRepo.create(payload)
			.then((result) => response(res, httpStatus.OK, 'success', result))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
