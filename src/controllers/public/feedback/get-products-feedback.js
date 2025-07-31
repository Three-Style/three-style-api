/**
 * @author Brijesh Prajapati
 * @description Get Fitness Course Feedback
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ProductFeedbackRepo } = require('../../../database');
const { feedbackStatus } = require('../../../common');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Feedback > Get Product Feedback');

	try {
		let { product_id } = req.query;

		if (product_id && !isValidObjectId(product_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid product_id');
		}

		let findFilter = { status: feedbackStatus.approved, deleted: false };

		if (product_id) {
			findFilter.product_id = ObjectId.createFromHexString(product_id);
		}

		let feedbackResult = await ProductFeedbackRepo.find(findFilter).select('feedback_point feedback_comment product_id createdAt user_id').populate('product', { name: true }).populate('user', {
			first_name: true,
			last_name: true,
			profile_image: true,
		});

		return response(res, httpStatus.OK, 'success', feedbackResult);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
