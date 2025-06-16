/**
 * @author Brijesh Prajapati
 * @description Get Book Tracking Details
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { OrdersRepo, BooksRepo, UserBooksRepo } = require('../../../database');
const { itemType, orderStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { addItemsToArrayAtIndex } = require('../../../utils');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator, JoiSearchSchema, JoiPaginationSchema, JoiSortSchema } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Books > Get Book Tracking (Multiple Books Support)');

	const { userAuthData } = req.headers;

	let findQuery = {
		user_id: MongoDBQueryBuilder.convertToObjectId(userAuthData.id),
		$or: [
			{
				order_item_type: itemType.books,
			},
			{
				order_item_type: itemType.item_cart,
				'multiple_items.item_type': itemType.books,
			},
		],
		status: orderStatus.success,
	};

	const BodySchema = Joi.object({})
		.keys({
			order_id: Joi.custom(JoiObjectIdValidator).optional(),
			receipt_id: Joi.string().optional(),
		})
		.concat(JoiSearchSchema)
		.concat(JoiPaginationSchema)
		.concat(JoiSortSchema);

	const { error, value } = BodySchema.validate(req.query);

	if (error) return response(res, error);

	// Validate Order ID
	if (value.order_id) {
		if (!isValidObjectId(value.order_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Order ID');
		}

		findQuery._id = MongoDBQueryBuilder.convertToObjectId(value.order_id);
	}

	// as a user
	if (value.receipt_id) {
		findQuery.receipt_id = String(value.receipt_id);
	}

	const SearchFields = ['_id', 'receipt_id'];
	const searchORQuery = MongoDBQueryBuilder.searchTextQuery(value.search, SearchFields, { operator: 'or' });
	findQuery.$or.concat(searchORQuery.$or);

	const pagination = PaginationHelper.getPagination(value);
	const SortQuery = MongoDBQueryBuilder.sortQuery(value.sort, value.sortOrder);

	try {
		let pipelineObject = [
			{
				$match: findQuery,
			},
			{
				$lookup: {
					from: BooksRepo.collection.name,
					let: { itemID: '$order_item_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$_id', '$$itemID'] }, { $eq: ['$status', true] }],
								},
							},
						},
						{
							$project: {
								book_title: true,
								description: true,
								cover_image: true,
								display_image: true,
								status: true,
							},
						},
					],
					as: 'books',
				},
			},
			{
				$lookup: {
					from: UserBooksRepo.collection.name,
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
								from: BooksRepo.collection.name,
								let: { bookIds: { $ifNull: ['$books.book_id', ['$book_id']] } },
								pipeline: [
									{
										$match: {
											$expr: {
												$in: ['$_id', '$$bookIds'],
											},
										},
									},
									{
										$project: {
											book_title: true,
											description: true,
											cover_image: true,
											display_image: true,
											status: true,
										},
									},
								],
								as: 'book_details',
							},
						},
					],
					as: 'user_book',
				},
			},
			{
				$addFields: {
					books: {
						$cond: {
							if: { $eq: ['$order_item_type', itemType.books] },
							then: '$books',
							else: {
								$reduce: {
									input: '$user_book.book_details',
									initialValue: [],
									in: { $concatArrays: ['$$value', '$$this'] },
								},
							},
						},
					},
					'user_book.book_details': null,
				},
			},
			{
				$unwind: { path: '$user_book', preserveNullAndEmptyArrays: true },
			},
			{
				$project: {
					gateway_signature: false,
				},
			},
			{
				$facet: {
					total: [{ $count: 'total' }],
					data: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
				},
			},
		];

		if (Object.keys(SortQuery).length) addItemsToArrayAtIndex(pipelineObject, 1, { $sort: SortQuery });

		OrdersRepo.aggregate(pipelineObject).then((result) => {
			let data = result[0].data;
			const CountDocs = result[0]?.total[0]?.total || 0;
			const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

			let metadata = {
				pagination: PaginationInfo,
				search_fields: SearchFields,
			};

			return response(res, httpStatus.OK, 'success', data, undefined, metadata);
		});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error.stack);
	}
};
