/**
 * @author Brijesh Prajapati
 * @description Get Book
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { BooksRepo } = require('../../../database');
const { ObjectId } = require('mongoose').Types;
const { isValidObjectId } = require('mongoose');
const { MongoDBQueryBuilder, PaginationHelper } = require('../../../helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Book > Get Book');

	try {
		let findQuery = { status: true };

		if (req.query.book_id) {
			if (!isValidObjectId(req.query.book_id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid book id');
			}

			findQuery._id = ObjectId.createFromHexString(req.query.book_id);
		}

		const SearchFields = ['_id', 'book_title'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query);
		const CountDocs = await BooksRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);

		return BooksRepo.find(findQuery)
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
