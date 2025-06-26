/**
 * @author Brijesh Prajapati
 * @description Get Product Tracking Details
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { OrdersRepo, ProductsRepo, UserMealProductRepo } = require('../../../database');
const { itemType, orderStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Meals > Get Meal Product Tracking');

	let { userAuthData } = req.headers;
	let { order_id, receipt_id } = req.query;

	let ordersFilter = {
		user_id: ObjectId.createFromHexString(userAuthData.id),
		$or: [
			{ order_item_type: itemType.clothing },
			{
				$and: [
					{ order_item_type: itemType.item_cart },
					{
						'multiple_items.item_type': itemType.clothing,
					},
				],
			},
		],
		status: orderStatus.success,
	};

	// Validate Order ID
	if (order_id) {
		if (!isValidObjectId(order_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Order ID');
		}

		ordersFilter._id = ObjectId.createFromHexString(order_id);
	}

	// as a user
	if (receipt_id) {
		ordersFilter.receipt_id = String(receipt_id);
	}

	try {
		let orderResult = await OrdersRepo.aggregate([
			{
				$lookup: {
					from: ProductsRepo.collection.name,
					let: { itemID: '$order_item_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$_id', '$$itemID'] }, { $eq: ['$status', true] }],
								},
							},
						},
					],
					as: 'product',
				},
			},
			{
				$unwind: { path: '$product', preserveNullAndEmptyArrays: true },
			},
			{
				$lookup: {
					from: UserMealProductRepo.collection.name,
					let: { userId: '$user_id', orderId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$user_id', '$$userId'] }, { $eq: ['$order_id', '$$orderId'] }],
								},
							},
						},
						{
							$lookup: {
								from: ProductsRepo.collection.name,
								let: { productIds: '$products.product_id' }, // All product_ids in the products array
								pipeline: [
									{
										$match: {
											$expr: {
												$in: ['$_id', '$$productIds'], // Match all product IDs in the products array
											},
										},
									},
									{
										$project: {
											name: true,
											display_image: true,
											status: true,
										},
									},
									{
										$project: {
											name: true,
											display_image: true,
											status: true,
										},
									},
								],
								as: 'product_details',
							},
						},
					],
					as: 'user_meal_product',
				},
			},
			{
				$unwind: { path: '$user_meal_product' },
			},
			{
				$project: {
					gateway_signature: false,
				},
			},
			{
				$match: {
					...ordersFilter,
				},
			},
		]);

		return response(res, httpStatus.OK, 'success', orderResult);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error.stack);
	}
};
