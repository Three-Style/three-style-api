/**
 * @author Brijesh Prajapati
 * @description Add Sub Categories
 */

const httpStatus = require('http-status');
const { SubCategoriesRepo, CategoriesRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Sub Categories > Add Sub Categories');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		name: Joi.string().required(),
		categories: Joi.string().custom(JoiObjectIdValidator).required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { name, categories } = req.body;

	try {
		if (categories) {
			const categoriesData = await CategoriesRepo.findById(categories);
			if (!categoriesData) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', 'Category not found');
			}
		}
		let payload = {
			name,
			categories,
			createdBy: adminAuthData.id,
			updatedBy: adminAuthData.id,
		};

		// DB: Create
		return SubCategoriesRepo.create(payload)
			.then((result) => SubCategoriesRepo.findById(result._id).populate('categories'))
			.then((populatedResult) => response(res, httpStatus.OK, 'success', populatedResult))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
