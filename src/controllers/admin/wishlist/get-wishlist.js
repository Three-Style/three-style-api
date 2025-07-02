/**
 * @author Brijesh Prajapati
 * @description Get Wishlist
 */

const httpStatus = require('http-status');

const { WishlistRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Wishlist > Get Wishlist');

	try {
		let findQuery = { status: true };

		if (req.query.id) {
			if (!ObjectId.isValid(req.query.id)) return response(res, httpStatus.BAD_REQUEST, 'Invalid id');

			findQuery._id = req.query.id;
		}

		const SearchFields = ['_id', 'user_id', 'product_id'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await WishlistRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		// DB: Find
		return WishlistRepo.find(findQuery)
			.populate('user_id')
			.populate('product_id')
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
