/**
 * @author Brijesh Prajapati
 * @description Remove Feedback
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductsReviewRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Product Feedback > Remove Feedback');

	let { userAuthData } = req.headers,
		updatedBy = userAuthData.id;

	let { feedback_id } = req.body;

	try {
		if (!feedback_id || !isValidObjectId(feedback_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Valid feedback_id is required');
		}

		let payload = {
			updatedBy,
			status: false,
		};

		// Update
		ProductsReviewRepo.findOneAndUpdate({ _id: feedback_id }, payload).catch();

		return response(res, httpStatus.CREATED, 'Success');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
