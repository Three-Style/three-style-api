/**
 * @author Brijesh Prajapati
 * @description Get Product with Review, Like (with Variants)
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { ProductsRepo, ProductLikeRepo, FabricRepo, SubCategoriesRepo, CategoriesRepo } = require('../../database');

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Get product');

	try {
		let pipeline = [
			// === Likes Count ===
			{
				$lookup: {
					from: ProductLikeRepo.collection.collectionName,
					let: { productID: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$product_id', '$$productID'] }, { $eq: ['$status', true] }],
								},
							},
						},
						{ $count: 'total_like' },
					],
					as: 'like_count',
				},
			},
			{
				$addFields: {
					like_count: { $ifNull: [{ $arrayElemAt: ['$like_count.total_like', 0] }, 0] },
				},
			},

			// === Populate category ===
			{
				$lookup: {
					from: CategoriesRepo.collection.collectionName,
					localField: 'categories',
					foreignField: '_id',
					as: 'categories',
				},
			},
			{ $unwind: { path: '$categories', preserveNullAndEmptyArrays: true } },

			// === Populate sub_categories ===
			{
				$lookup: {
					from: SubCategoriesRepo.collection.collectionName,
					localField: 'sub_categories',
					foreignField: '_id',
					as: 'sub_categories',
				},
			},
			{ $unwind: { path: '$sub_categories', preserveNullAndEmptyArrays: true } },

			// === Populate fabric ===
			{
				$lookup: {
					from: FabricRepo.collection.collectionName,
					localField: 'fabric',
					foreignField: '_id',
					as: 'fabric',
				},
			},
			{ $unwind: { path: '$fabric', preserveNullAndEmptyArrays: true } },

			// === Keep variants intact ===
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					short_description: 1,
					price: 1,
					original_price: 1,
					discount_percentage: 1,
					display_image: 1,
					tags: 1,
					status: 1,
					categories: 1,
					sub_categories: 1,
					fabric: 1,
					variants: 1, // ✅ includes color, size, sku_no, stock
					like_count: 1,
				},
			},
		];

		let productResult = await ProductsRepo.aggregate(pipeline);

		// If specific ID is requested
		if (req.query.id) {
			productResult = productResult.find(({ _id }) => String(_id) === req.query.id);
			if (!productResult) {
				return response(res, httpStatus.NOT_FOUND, 'Product not found');
			}
			return response(res, httpStatus.OK, 'success', productResult);
		}

		return response(res, httpStatus.OK, 'success', productResult);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
