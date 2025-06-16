/**
 * @author Brijesh Prajapati
 * @description Modify Products Feedback
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductFeedbackRepo } = require('../../../database');
const { feedbackStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');

module.exports = async (req, res) => {
	req.logger.info('Controllers > Admin > Products Feedback > Update Products Feedback');

	const adminAuthData = req.headers.adminAuthData;

	try {
		let { feedback_id, status } = req.body;

		if (!status) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid status', { valid: Object.values(feedbackStatus) });
		}

		status = String(status).trim().toUpperCase();

		if (!Object.values(feedbackStatus).includes(status)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid status', { valid: Object.values(feedbackStatus) });
		}

		if (feedback_id && !isValidObjectId(feedback_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid feedback_id');
		}

		let updatePayload = {
			status: status,
			updatedBy: adminAuthData.id,
		};

		ProductFeedbackRepo.findOneAndUpdate({ _id: feedback_id, deleted: false }, updatePayload).exec();

		return response(res, httpStatus.OK, 'success');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
