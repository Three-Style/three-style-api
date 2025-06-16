/**
 * @author Brijesh Prajapati
 * @description Product feedback Like/Unlike
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductsRepo, ProductLikeRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Product Feedback > Like/Unlike');

	let { userAuthData } = req.headers;
	let createdBy = userAuthData.id;
	let updatedBy = userAuthData.id;

	let { product_id, like } = req.body;

	try {
		if (!product_id || !isValidObjectId(product_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Valid product_id is required');
		}

		// Validate Product Existence
		let productResult = await ProductsRepo.findOne({ _id: product_id });
		if (!productResult) {
			return response(res, httpStatus.NOT_FOUND, 'Invalid product_id');
		}

		if (like === 'UNLIKE') {
			let deleteResult = await ProductLikeRepo.deleteOne({ product_id, user_id: createdBy });
			if (deleteResult.deletedCount === 0) {
				return response(res, httpStatus.NOT_FOUND, 'No like record found to remove');
			}
			return response(res, httpStatus.OK, 'Unliked successfully');
		}

		let isLike = like === 'LIKE';
		let existingLike = await ProductLikeRepo.findOne({ product_id, user_id: createdBy });

		if (existingLike) {
			if (existingLike.isLike === isLike) {
				return response(res, httpStatus.OK, 'No change needed');
			}
			existingLike.isLike = isLike;
			existingLike.updatedBy = updatedBy;
			await existingLike.save();
		} else {
			let payload = {
				product_id,
				user_id: createdBy,
				isLike,
				createdBy,
				updatedBy,
				status: true,
			};
			await ProductLikeRepo.create(payload);
		}

		return response(res, httpStatus.OK, 'Like status updated successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
