/**
 * @author Brijesh Prajapati
 * @description Modify Product
 */

const httpStatus = require('http-status');
const { ProductsRepo } = require('../../../database');
const response = require('../../../utils/response');
const { Joi } = require('../../../services');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Update Product');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		display_image: Joi.array().items(Joi.string()).optional(),
		name: Joi.string().optional(),
		price: Joi.number().min(1).optional(),
		discount_price: Joi.number().min(1).optional(),
		discount_percentage: Joi.number().min(1).optional(),
		description: Joi.string().optional(),
		categories: Joi.string().optional(),
		fabric: Joi.string().optional(),
		sub_categories: Joi.string().optional(),
		stock: Joi.number().min(1).optional(),
		color: Joi.string().optional(),
		tags: Joi.array().items(Joi.string()).optional(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { id, display_image, name, price, discount_price, discount_percentage, description, categories, fabric, sub_categories, stock, color, tags, status } = req.body;

	try {
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
			color,
			tags,
			createdBy: adminAuthData.id,
			updatedBy: adminAuthData.id,
		};
		if (status != undefined) {
			payload.status = status;
		}

		// DB: find & update
		return ProductsRepo.findOneAndUpdate({ _id: id, status: true }, payload, { new: true })
			.then((result) => (result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.OK, 'Incorrect product id')))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
