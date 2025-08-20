/**
 * @author Brijesh Prajapati
 * @description Get Products (with Variants)
 */

const httpStatus = require('http-status');
const { ProductsRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Get Product');

	try {
		let findQuery = { status: true };

		// ✅ filter by product ID
		if (req.query.id) {
			if (!ObjectId.isValid(req.query.id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid id');
			}
			findQuery._id = req.query.id;
		}

		// ✅ fields to search
		// note: sku_no moved inside variants
		const SearchFields = ['_id', 'name', 'categories', 'fabric', 'sub_categories', 'variants.sku_no', 'variants.color_name', 'variants.size'];

		// ✅ build text search query
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		// pagination & sorting
		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);

		const CountDocs = await ProductsRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		// DB: Find
		return ProductsRepo.find(findQuery)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(SortQuery)
			.lean()
			.then((result) => {
				return response(res, httpStatus.OK, 'success', result, undefined, {
					pagination: PaginationInfo,
					search_fields: SearchFields,
				});
			})
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
