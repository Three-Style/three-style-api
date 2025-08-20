/**
 * @author Brijesh Prajapati
 * @description Modify Product (with Variants)
 */

const httpStatus = require('http-status');
const { ProductsRepo, CategoriesRepo, FabricRepo, SubCategoriesRepo } = require('../../../database');
const response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Update Product');

	let adminAuthData = req.headers.adminAuthData;

	// Joi validation schema
	const BodySchema = Joi.object({
		id: Joi.string().custom(JoiObjectIdValidator).required(),
		display_image: Joi.array().items(Joi.string()).optional(),
		name: Joi.string().optional(),
		price: Joi.number().min(1).optional(),
		original_price: Joi.number().min(1).optional(),
		discount_percentage: Joi.number().min(1).optional(),
		short_description: Joi.string().optional(),
		description: Joi.string().optional(),
		categories: Joi.string().custom(JoiObjectIdValidator).optional(),
		fabric: Joi.string().custom(JoiObjectIdValidator).optional(),
		sub_categories: Joi.string().custom(JoiObjectIdValidator).optional(),
		tags: Joi.array().items(Joi.string()).optional(),
		status: Joi.boolean().optional(),

		// ✅ New: variants array for update
		variants: Joi.array()
			.items(
				Joi.object({
					_id: Joi.string().custom(JoiObjectIdValidator).optional(), // existing variant ID (for updating specific one)
					color_name: Joi.string().optional(),
					color_code: Joi.string().optional(),
					size: Joi.string().allow('', null).optional(),
					images: Joi.array().items(Joi.string()).optional(),
					stock: Joi.number().min(0).optional(),
					sku_no: Joi.string().allow('', null).optional(),
				})
			)
			.optional(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { id, display_image, name, price, original_price, discount_percentage, short_description, description, categories, fabric, sub_categories, tags, status, variants } = req.body;

	try {
		// Validate references
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

		let payload = {
			display_image,
			name,
			price,
			original_price,
			discount_percentage,
			short_description,
			description,
			categories,
			fabric,
			sub_categories,
			tags,
			updatedBy: adminAuthData.id,
		};

		if (status !== undefined) {
			payload.status = status;
		}

		if (variants) {
			// Replace full variants array with new one (simple approach)
			payload.variants = variants;
		}

		// DB: find & update
		return ProductsRepo.findOneAndUpdate({ _id: id }, payload, { new: true })
			.then((result) => (result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.OK, 'Incorrect product id')))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
