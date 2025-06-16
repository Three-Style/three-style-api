/**
 * @author Brijesh Prajapati
 * @description Create Feedback for Products
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductsRepo, ProductFeedbackRepo } = require('../../../database');
const { feedbackStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

const validPoint = Array.from({ length: 5 }, (_, n) => n + 1);

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Products Feedback > Create Feedback');

	let { userAuthData } = req.headers;

	let { feedback_point, feedback_comment, product_id } = req.body;

	// Validate Data
	if (!isValidObjectId(product_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid product_id');
	}

	product_id = ObjectId.createFromHexString(product_id);

	if (feedback_point) {
		feedback_point = parseInt(feedback_point);

		if (!validPoint.includes(feedback_point)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid feedback_point');
		}
	}

	if (feedback_comment) {
		feedback_comment = String(feedback_comment).trim();
	}

	let fitnessCourseResult = await ProductsRepo.findOne({ _id: product_id });

	if (!fitnessCourseResult) {
		return response(res, httpStatus.NOT_FOUND, 'Fitness Course Not Found');
	}

	// Create Feedback
	let feedbackPayload = {
		feedback_point,
		feedback_comment,
		product_id,
		user_id: userAuthData.id,
		createdBy: userAuthData.id,
		updateBy: userAuthData.id,
		status: feedbackStatus.pending,
	};

	ProductFeedbackRepo.create(feedbackPayload).catch((error) => req.logger.error(error.stack));

	return response(res, httpStatus.OK, 'Feedback Created Successfully');
};
