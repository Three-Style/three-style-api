/**
 * @author Brijesh Prajapati
 * @description Get Fitness Course Feedback
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { FitnessCourseFeedbackRepo } = require('../../../database');
const { feedbackStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Feedback > Get Fitness Course Feedback');

	try {
		let { course_id } = req.query;

		if (course_id && !isValidObjectId(course_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid course_id');
		}

		let findFilter = { status: feedbackStatus.approved, deleted: false };

		if (course_id) {
			findFilter.course_id = ObjectId.createFromHexString(course_id);
		}

		let feedbackResult = await FitnessCourseFeedbackRepo.find(findFilter)
			.select('feedback_point feedback_comment course_id createdAt user_id')
			.populate('course', { course_name: true })
			.populate('user', {
				first_name: true,
				last_name: true,
			});

		return response(res, httpStatus.OK, 'success', feedbackResult);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
