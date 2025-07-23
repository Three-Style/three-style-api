/**
 * @author Brijesh Prajapati
 * @description Get Users who are enrolled in any course
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');
const { pickBy } = require('lodash');
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
		// aaa
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
