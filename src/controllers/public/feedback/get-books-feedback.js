/**
 * @author Brijesh Prajapati
 * @description Get Books Feedback
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { BooksFeedbackRepo } = require('../../../database');
const { feedbackStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Feedback > Get Books Feedback');

	try {
		let { book_id } = req.query;

		if (book_id && !isValidObjectId(book_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid book_id');
		}

		let findFilter = { status: feedbackStatus.approved, deleted: false };

		if (book_id) {
			findFilter.book_id = ObjectId.createFromHexString(book_id);
		}

		let feedbackResult = await BooksFeedbackRepo.find(findFilter).select('feedback_point feedback_comment book_id createdAt user_id').populate('book', { book_title: true }).populate('user', {
			first_name: true,
			last_name: true,
		});

		return response(res, httpStatus.OK, 'success', feedbackResult);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
