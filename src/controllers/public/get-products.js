/**
 * @author Brijesh Prajapati
 * @description Get Product with Review, Like
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { ProductsRepo, ProductLikeRepo, FabricRepo, SubCategoriesRepo, CategoriesRepo } = require('../../database');

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Get product');

	// Check User is logged in
	// let { userAuthData } = req.headers;

	// let user_id;

	// if (userAuthData) {
	// 	user_id = userAuthData.id;
	// }

	// Get Products
	let productResult = await ProductsRepo.aggregate([
		// {
		// 	$lookup: {
		// 		from: ProductLikeRepo.collection.collectionName,
		// 		let: { productID: '$_id' },
		// 		// pipeline: [
		// 		// 	{
		// 		// 		$match: {
		// 		// 			$expr: {
		// 		// 				$and: [{ $eq: ['$user_id', ObjectId.createFromHexString(user_id)] }, { $eq: ['$product_id', '$$productID'] }, { $eq: ['$status', true] }],
		// 		// 			},
		// 		// 		},
		// 		// 	},
		// 		// ],
		// 		as: 'user_like',
		// 	},
		// },
		{
			$unwind: { path: '$user_like', preserveNullAndEmptyArrays: true },
		},
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
					{
						$count: 'total_like',
					},
				],
				as: 'like_count',
			},
		},
		{ $replaceWith: { $mergeObjects: [{ $arrayElemAt: ['$like_count', 0] }, '$$ROOT'] } },
		{
			$project: { like_count: false },
		},
		// {
		// 	$lookup: {
		// 		from: ProductsReviewRepo.collection.collectionName,
		// 		let: { productID: '$_id' },
		// 		pipeline: [
		// 			{
		// 				$match: {
		// 					$expr: {
		// 						$and: [{ $eq: ['$user_id', ObjectId.createFromHexString(user_id)] }, { $eq: ['$product_id', '$$productID'] }, { $eq: ['$status', true] }],
		// 					},
		// 				},
		// 			},
		// 		],
		// 		as: 'user_reviews',
		// 	},
		// },
		{
			$unwind: { path: '$user_reviews', preserveNullAndEmptyArrays: true },
		},
		// Populate category
		{
			$lookup: {
				from: CategoriesRepo.collection.collectionName,
				localField: 'categories',
				foreignField: '_id',
				as: 'categories',
			},
		},
		{ $unwind: { path: '$categories', preserveNullAndEmptyArrays: true } },
		// Populate sub_categories
		{
			$lookup: {
				from: SubCategoriesRepo.collection.collectionName,
				localField: 'sub_categories',
				foreignField: '_id',
				as: 'sub_categories',
			},
		},
		{ $unwind: { path: '$sub_categories', preserveNullAndEmptyArrays: true } },
		// Populate fabric
		{
			$lookup: {
				from: FabricRepo.collection.collectionName,
				localField: 'fabric',
				foreignField: '_id',
				as: 'fabric',
			},
		},
		{ $unwind: { path: '$fabric', preserveNullAndEmptyArrays: true } },
		// {
		// 	$lookup: {
		// 		from: ProductsReviewRepo.collection.collectionName,
		// 		let: { productID: '$_id' },
		// 		pipeline: [
		// 			{
		// 				$match: {
		// 					$expr: {
		// 						$and: [{ $eq: ['$product_id', '$$productID'] }, { $eq: ['$status', true] }],
		// 					},
		// 				},
		// 			},
		// 			{
		// 				$project: {
		// 					createdBy: false,
		// 					updatedBy: false,
		// 					createdAt: false,
		// 					updatedAt: false,
		// 					status: false,
		// 				},
		// 			},
		// 			{
		// 				$lookup: {
		// 					from: UserRepo.collection.collectionName,
		// 					let: { userID: '$user_id' }, // user_id from ProductsReviewRepo
		// 					pipeline: [
		// 						{
		// 							$match: {
		// 								$expr: {
		// 									$and: [
		// 										{
		// 											$eq: ['$_id', '$$userID'],
		// 										},
		// 										{
		// 											$eq: ['$status', 'ACTIVE'],
		// 										},
		// 									],
		// 								},
		// 							},
		// 						},
		// 						{
		// 							$project: {
		// 								first_name: true,
		// 								last_name: true,
		// 								_id: false,
		// 							},
		// 						},
		// 					],
		// 					as: 'userData',
		// 				},
		// 			},
		// 			{ $replaceWith: { $mergeObjects: [{ $arrayElemAt: ['$userData', 0] }, '$$ROOT'] } },
		// 			{
		// 				$project: {
		// 					userData: false,
		// 				},
		// 			},
		// 		],
		// 		as: 'reviews',
		// 	},
		// },
	]);

	if (req.query.id) {
		productResult = productResult.filter(({ _id }) => _id == req.query.id)[0];
		return response(res, httpStatus.OK, 'success', productResult);
	}

	return response(res, httpStatus.OK, 'success', productResult);
};
