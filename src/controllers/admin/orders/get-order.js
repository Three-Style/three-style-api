/**
 * @author Brijesh Prajapati
 * @description Get User Orders
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { nodeCache, Joi } = require('../../../services');
const {
	OrdersRepo,
	UserRepo,
	FitnessCourseRepo,
	UserFitnessCourseRepo,
	FitnessPlanRepo,
	UserFitnessPlanRepo,
	DigitalPlansRepo,
	UserDigitalPlansRepo,
	BooksRepo,
	UserBooksRepo,
	ProductsRepo,
	UserMealProductRepo,
	EBookRepo,
	UserEBooksRepo,
	INPTAPurchaseItemsRepo,
} = require('../../../database');
const { userStatus, itemType, orderStatus } = require('../../../common');
const moment = require('moment');
const { GetOrderPrefix } = require('../../../common/cache_key');
const { omitBy, isNull } = require('lodash');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { convertToObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const { JoiObjectIdValidator, JoiSearchSchema, JoiPaginationSchema, JoiSortSchema } = require('../../../helpers/joi-custom-validators.helpers');
const { getCacheMetadata } = require('../../cache-manager/cache-manager');
const GeneralCache = nodeCache('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Orders > Get Orders');

	const _metadata = {
		item_type: Object.values(itemType),
		order_status: Object.values(orderStatus),
	};

	try {
		const BodySchema = Joi.object()
			.keys({
				order_id: Joi.string().custom(JoiObjectIdValidator).optional(),
				receipt_id: Joi.string().optional(),
				user_id: Joi.string().custom(JoiObjectIdValidator).optional(),
				item_type: Joi.alternatives()
					.try(
						Joi.array()
							.items(Joi.string().valid(...Object.values(itemType)))
							.optional(),
						Joi.string()
							.valid(...Object.values(itemType))
							.optional()
					)
					.custom((value) => {
						if (typeof value === 'string') {
							return [value];
						}
						return value;
					}),
				order_status: Joi.alternatives()
					.try(
						Joi.array()
							.items(Joi.string().valid(...Object.values(orderStatus)))
							.optional(),
						Joi.string()
							.valid(...Object.values(orderStatus))
							.optional()
					)
					.custom((value) => {
						if (typeof value === 'string') {
							return [value];
						}
						return value;
					}),
				from_date: Joi.date().optional(),
				to_date: Joi.date().optional(),
			})
			.concat(JoiSearchSchema)
			.concat(JoiPaginationSchema)
			.concat(JoiSortSchema);

		const { error, value: Params } = BodySchema.validate(req.query);

		if (error) return response(res, error);

		const CacheKey = GetOrderPrefix + JSON.stringify(Params),
			cacheTTL = 60 * 2;

		if (GeneralCache.has(CacheKey)) {
			let { data: cachedData, metadata: cachedMetadata } = GeneralCache.get(CacheKey);
			Object.assign(cachedMetadata, {
				cache: getCacheMetadata({
					cacheName: 'General',
					key: CacheKey,
					prefix: GetOrderPrefix,
				}),
			});
			return response(res, httpStatus.OK, 'success', cachedData, undefined, cachedMetadata);
		}

		let findQuery = {};

		if (Params.order_id) findQuery._id = convertToObjectId(Params.order_id);
		if (Params.receipt_id) findQuery.receipt_id = Params.receipt_id;
		if (Params.user_id) findQuery.user_id = convertToObjectId(Params.user_id);
		if (Params.order_status) findQuery.status = { $in: Params.order_status };

		if (Params.item_type) {
			const FilterItemType = Params.item_type.filter((item) => item != itemType.item_cart);

			findQuery.$and = [
				{
					$or: [
						{
							order_item_type: { $in: Params.item_type },
						},
						{
							order_item_type: itemType.item_cart,
							'multiple_items.item_type': { $in: FilterItemType },
						},
					],
				},
			];
		}

		if (Params.from_date) findQuery.createdAt = { $gte: moment(new Date(Params.from_date)).startOf('day').toDate() };

		if (Params.to_date) {
			if (findQuery.createdAt) {
				findQuery.createdAt.$lte = moment(new Date(Params.to_date)).endOf('day').toDate();
			} else {
				findQuery.createdAt = { $lte: moment(new Date(Params.to_date)).endOf('day').toDate() };
			}
		}

		var orderProjection = {
			createdBy: false,
			user_type: false,
			gateway_signature: false,
			updatedBy: false,
		};

		const SearchFields = [
			'_id',
			'receipt_id',
			'user_id',
			'gateway_order_id',
			'gateway_transaction_id',
			'order_item_id',
			'order_item_type',
			'invoice_id',
			'multiple_items[].item_id',
			'multiple_items[]._id',
		];

		if (findQuery.$or) {
			findQuery.$or.push(...MongoDBQueryBuilder.searchTextQuery(Params.search, SearchFields, { operator: 'or' }).$or);
		} else {
			Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(Params.search, SearchFields));
		}

		const pagination = PaginationHelper.getPagination(Params, { maxLimit: 50 });
		const CountDocs = await OrdersRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, Params);
		const SortQuery = MongoDBQueryBuilder.sortQuery(Params.sort, Params.sortOrder);

		var orderResult = await OrdersRepo.find(findQuery)
			.select(orderProjection)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(SortQuery)
			.populate('user_info', 'country_code email emailVerified first_name last_name mobile mobileVerified status profile_image', UserRepo, { status: userStatus.active })

			.populate('fitness_course', 'course_name coaching_mode amount course_category duration_days status currency', FitnessCourseRepo)
			.populate('fitness_course_subscription', 'duration start_date end_date order_id course_id', UserFitnessCourseRepo)

			.populate('fitness_plan', 'plan_name duration amount', FitnessPlanRepo)
			.populate('fitness_plan_subscription', 'duration start_date end_date order_id', UserFitnessPlanRepo)

			.populate('books', 'book_title amount', BooksRepo)
			.populate('book_subscription', undefined, UserBooksRepo)

			.populate('ebook', 'ebook_title amount', EBookRepo)
			.populate('ebook_purchase_info', undefined, UserEBooksRepo)

			.populate('digital_plan', 'plan_name duration_days amount', DigitalPlansRepo)
			.populate('digital_plan_subscription', undefined, UserDigitalPlansRepo)

			.populate('product', 'name price display_image', ProductsRepo)
			.populate('user_meal_product', undefined, UserMealProductRepo)

			.populate('inpta', 'name price', INPTAPurchaseItemsRepo);

		orderResult = await Promise.all(
			orderResult.map(async (order) => {
				// Check if the order is an item_cart, and populate its items if necessary
				if (order.order_item_type !== itemType.item_cart) {
					return order;
				}

				// Populate items for item_cart type orders
				order = await order.populateItems();

				if (order.toJSON) {
					order = order.toJSON();
				}

				return omitBy(order, isNull);
			})
		);

		orderResult = await Promise.all(
			orderResult.map(async (order) => {
				if (order.toJSON) {
					order = order.toJSON();
				}
				return omitBy(order, isNull);
			})
		);

		Object.assign(_metadata, { pagination: PaginationInfo, search_fields: SearchFields });

		GeneralCache.set(CacheKey, { data: JSON.parse(JSON.stringify(orderResult)), metadata: _metadata }, cacheTTL);
		return response(res, httpStatus.OK, 'success', orderResult, undefined, _metadata);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
