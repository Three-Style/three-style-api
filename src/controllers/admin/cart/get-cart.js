/**
 * @author Brijesh Prajapati
 * @description Get Product Cart
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductsRepo, ProductCartRepo } = require('../../../database');
const { ObjectId, isValidObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Product Cart > Get Cart Data');

	const { favorite_id } = req.query;

	try {
		let aggregatePipeline = [
			{
				$lookup: {
					from: ProductsRepo.collection.collectionName,
					let: { productID: '$product_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$_id', '$$productID'] }, { $eq: ['$status', true] }],
								},
							},
						},
						{
							$project: {
								createdAt: false,
								updatedAt: false,
								createdBy: false,
								updatedBy: false,
							},
						},
					],
					as: 'product_data',
				},
			},
			{ $replaceWith: { $mergeObjects: [{ $arrayElemAt: ['$product_data', 0] }, '$$ROOT'] } },
			{ $project: { product_data: false } },
			{
				$match: { status: true },
			},
		];

		if (favorite_id && !isValidObjectId(favorite_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid favorite_id');
		}

		if (favorite_id) {
			aggregatePipeline.unshift({
				$match: { _id: ObjectId.createFromHexString(favorite_id) },
			});
		}

		// DB: Aggregate
		const cartResult = await ProductCartRepo.aggregate(aggregatePipeline);

		if (cartResult.length > 0) {
			return response(res, httpStatus.OK, 'success', cartResult);
		} else {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid ID');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
