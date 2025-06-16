/**
 * @author Brijesh Prajapati
 * @description Add Categories
 */

const httpStatus = require('http-status');
const { CategoriesRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Categories > Add Categories');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		display_image: Joi.string().required(),
		name: Joi.string().required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { display_image, name } = req.body;

	try {
		let payload = {
			display_image,
			name,
			createdBy: adminAuthData.id,
			updatedBy: adminAuthData.id,
		};

		// DB: Create
		return CategoriesRepo.create(payload)
			.then((result) => response(res, httpStatus.OK, 'success', result))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
