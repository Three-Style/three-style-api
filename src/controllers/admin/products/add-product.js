/**
 * @author Brijesh Prajapati
 * @description Add Product
 */

const httpStatus = require('http-status');
const { ProductsRepo, CategoriesRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { randomDigit } = require('../../../utils/random');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Add Product');

	let adminAuthData = req.headers.adminAuthData;
	let random_sku_no = randomDigit();

	const BodySchema = Joi.object({
		display_image: Joi.array().items(Joi.string()).required(),
		name: Joi.string().required(),
		price: Joi.number().min(1).required(),
		discount_price: Joi.number().min(1).required(),
		discount_percentage: Joi.number().min(1).required(),
		description: Joi.string().required(),
		categories: Joi.string().required(),
		fabric: Joi.string().required(),
		sub_categories: Joi.string().required(),
		stock: Joi.number().min(1).required(),
		color: Joi.string().required(),
		tags: Joi.array().items(Joi.string()).required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { display_image, name, price, discount_price, discount_percentage, description, categories, fabric, sub_categories, stock, color, tags } = req.body;

	try {
		if (categories) {
			const categoriesData = await CategoriesRepo.findById(categories);
			if (!categoriesData) {
				response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', 'Category not found');
			}
		}

		let payload = {
			display_image,
			name,
			price,
			discount_price,
			discount_percentage,
			description,
			categories,
			fabric,
			sub_categories,
			stock,
			sku_no: random_sku_no,
			color,
			tags,
			createdBy: adminAuthData.id,
			updatedBy: adminAuthData.id,
		};

		// DB: Create
		return ProductsRepo.create(payload)
			.then((result) => response(res, httpStatus.OK, 'success', result))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
