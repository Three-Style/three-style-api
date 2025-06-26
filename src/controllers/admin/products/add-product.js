/**
 * @author Brijesh Prajapati
 * @description Add Product
 */

const httpStatus = require('http-status');
const { ProductsRepo, CategoriesRepo, FabricRepo, SubCategoriesRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
// const { randomDigit } = require('../../../utils/random');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Add Product');

	let adminAuthData = req.headers.adminAuthData;
	// let random_sku_no = randomDigit();

	const BodySchema = Joi.object({
		display_image: Joi.array().items(Joi.string()).required(),
		name: Joi.string().required(),
		price: Joi.number().min(1).required(),
		discount_price: Joi.number().min(1).required(),
		discount_percentage: Joi.number().min(1).required(),
		description: Joi.string().required(),
		categories: Joi.string().custom(JoiObjectIdValidator).required(),
		fabric: Joi.string().custom(JoiObjectIdValidator).required(),
		sub_categories: Joi.string().custom(JoiObjectIdValidator).required(),
		stock: Joi.number().min(1).required(),
		color: Joi.object({
			color_name: Joi.string().required(),
			color_code: Joi.string().required(),
		}).required(),
		tags: Joi.array().items(Joi.string()).required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { display_image, name, price, discount_price, discount_percentage, description, categories, fabric, sub_categories, stock, color, tags } = req.body;

	try {
		if (categories) {
			const categoriesData = await CategoriesRepo.findById(categories);
			if (!categoriesData) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', 'Category not found');
			}
		}
		if (fabric) {
			const fabricData = await FabricRepo.findById(fabric);
			if (!fabricData) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', 'Fabric not found');
			}
		}
		if (sub_categories) {
			const subCategoriesData = await SubCategoriesRepo.findById(sub_categories);
			if (!subCategoriesData) {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', 'Sub Category not found');
			}
		}

		let new_sku_no;

		const lastProduct = await ProductsRepo.findOne().sort({ sku_no: -1 });

		if (lastProduct && lastProduct.sku_no) {
			new_sku_no = String(parseInt(lastProduct.sku_no) + 1).padStart(4, '0');
		} else {
			new_sku_no = '0001';
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
			sku_no: new_sku_no,
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
