/**
 * @author Brijesh Prajapati
 * @description Get Users who are enrolled in any course
 */

const httpStatus = require('http-status');
const { UserRepo, UserFitnessCourseRepo, FitnessCourseRepo } = require('../../../database');
const { userStatus } = require('../../../common');
const response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');
const { isUndefined, pickBy } = require('lodash');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Users > Get User');

	let { user_id, course_id, course_category, alumni } = pickBy(req.query);

	if (user_id && !isValidObjectId(user_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid user_id');
	}

	if (alumni) {
		alumni = String(alumni).trim();
		if (!['true', 'false'].includes(alumni)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid alumni. It should be true or false');
		}

		alumni = alumni === 'true';
	}

	var fitnessCourseQuery = {};
	if (course_id && !isValidObjectId(course_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid course_id');
	} else if (course_id) {
		fitnessCourseQuery._id = ObjectId.createFromHexString(course_id);
	}

	if (course_category && !['Online Course', 'Offline Course', 'Flexible Learning'].includes(String(course_category).trim())) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid course_category', { valid_course_category: ['Online Course', 'Offline Course', 'Flexible Learning'] });
	} else if (course_category) {
		fitnessCourseQuery.course_category = String(course_category).trim();
	}

	var userFitnessCourseFindQuery = {
		status: true,
	};
	if (user_id) {
		userFitnessCourseFindQuery.user_id = ObjectId.createFromHexString(user_id);
	}

	try {
		FitnessCourseRepo.find(fitnessCourseQuery, { _id: true }, { lean: true }).then((fitnessCourseResult) => {
			userFitnessCourseFindQuery.course_id = { $in: fitnessCourseResult.map((i) => i._id) };
			UserFitnessCourseRepo.find(userFitnessCourseFindQuery, { user_id: true }, { lean: true }).then(async (userFitnessCourseResult) => {
				let findQuery = { _id: { $in: userFitnessCourseResult.map((item) => item.user_id) }, status: { $ne: userStatus.deleted } };

				if (!isUndefined(alumni)) findQuery.alumni = alumni;

				const SearchFields = ['_id', 'first_name', 'last_name', 'uid', 'email', 'mobile'];
				Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

				const MaxLimit = 100;
				Object.assign(req.query, { maxLimit: MaxLimit });

				const pagination = PaginationHelper.getPagination(req.query, { maxLimit: MaxLimit });
				const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
				const CountDocs = await UserRepo.countDocuments(findQuery);
				const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

				return UserRepo.find(findQuery, { password: false, authToken: false, fcm_token: false })
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
			});
		});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
