/**
 * @author Brijesh Prajapati
 * @description Modify Sub Categories
 */

const httpStatus = require('http-status');
const { SubCategoriesRepo, CategoriesRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Sub Categories > Update Sub Categories');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		id: Joi.string().custom(JoiObjectIdValidator).required(),
		name: Joi.string().required(),
		categories: Joi.string().custom(JoiObjectIdValidator).required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { id, name, categories } = req.body;

	try {
		if (categories) {
			const categoriesData = await CategoriesRepo.findById(categories);
			if (!categoriesData) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', 'Category not found');
			}
		}
		let payload = { name, categories, createdBy: adminAuthData.id, updatedBy: adminAuthData.id };

		// DB: find & update
		return SubCategoriesRepo.findOneAndUpdate({ _id: id, status: true }, payload, { new: true })
			.then((result) => (result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.OK, 'Incorrect Sub Categories id')))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
