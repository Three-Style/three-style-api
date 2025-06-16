/**
 * @author Brijesh Prajapati
 * @description Get Products Feedback
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductFeedbackRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controllers > Admin > Products Feedback > Get Products Feedback');

	try {
		let { feedback_id } = req.query;

		if (feedback_id && !isValidObjectId(feedback_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid feedback_id');
		}

		let findQuery = { deleted: false };

		if (feedback_id) {
			findQuery._id = ObjectId.createFromHexString(feedback_id);
		}

		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await ProductFeedbackRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		return ProductFeedbackRepo.find(findQuery)
			.populate('product', {
				name: true,
				display_image: true,
			})
			.populate('user', {
				first_name: true,
				last_name: true,
				mobile: true,
				profile_image: true,
			})
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(SortQuery)
			.lean()
			.then((result) => {
				return response(res, httpStatus.OK, 'success', result, undefined, {
					pagination: PaginationInfo,
				});
			})
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
