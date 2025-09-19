/**
 * @author Brijesh Prajapati
 * @description Add Product (with Variants + Auto SKU)
 */

const httpStatus = require('http-status');
const { ProductsRepo, CategoriesRepo, FabricRepo, SubCategoriesRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Add Product');

	let adminAuthData = req.headers.adminAuthData;

	// Joi Schema
	const BodySchema = Joi.object({
		display_image: Joi.array().items(Joi.string()).required(),
		name: Joi.string().required(),
		price: Joi.number().min(1).required(),
		original_price: Joi.number().min(1).required(),
		discount_percentage: Joi.number().min(1).required(),
		short_description: Joi.string().required(),
		description: Joi.string().required(),
		categories: Joi.string().custom(JoiObjectIdValidator).required(),
		fabric: Joi.string().custom(JoiObjectIdValidator).required(),
		sub_categories: Joi.string().custom(JoiObjectIdValidator).required(),
		tags: Joi.array().items(Joi.string()).required(),
		variants: Joi.array()
			.items(
				Joi.object({
					color_name: Joi.string().required(),
					color_code: Joi.string().required(),
					size: Joi.string().allow('', null),
					images: Joi.array().items(Joi.string()).required(),
					stock: Joi.number().min(0).required(),
					sku_no: Joi.string().allow('', null),
				})
			)
			.min(1)
			.required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { display_image, name, price, original_price, discount_percentage, short_description, description, categories, fabric, sub_categories, tags, variants } = req.body;

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

		// 🔥 Find last SKU used globally (check all products + variants)
		let lastVariant = await ProductsRepo.aggregate([{ $unwind: '$variants' }, { $sort: { 'variants.sku_no': -1 } }, { $limit: 1 }]);

		let lastSkuNumber = 0;
		if (lastVariant.length > 0 && lastVariant[0].variants?.sku_no) {
			let lastSku = lastVariant[0].variants.sku_no || 'SKU-000';
			lastSkuNumber = parseInt(lastSku.replace('SKU-', '')) || 0;
		}

		// 🔥 Generate unique SKU for each variant
		variants = variants.map((variant, index) => {
			let newSkuNumber = lastSkuNumber + index + 1;
			return {
				...variant,
				sku_no: `SKU-${String(newSkuNumber).padStart(3, '0')}`, // SKU-001, SKU-002 ...
			};
		});

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
			variants,
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
