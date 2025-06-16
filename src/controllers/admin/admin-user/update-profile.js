/**
 * @author Brijesh Prajapati
 * @description Update Admin Profile
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Admin User > Update Profile');

	const { full_name, mobile, email, id } = req.body;

	try {
		let { adminAuthData } = req.headers;

		if (isEmpty(full_name) || isEmpty(mobile) || isEmpty(email)) {
			return response(res, httpStatus.BAD_REQUEST, 'Name, Email, and Mobile are required');
		}

		if (isEmpty(id) || !isValidObjectId(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid ID');
		}

		let payload = {
			full_name,
			mobile,
			email,
			updatedBy: adminAuthData.id,
		};

		// DB: Find & Update
		let result = await AdminRepo.findByIdAndUpdate({ _id: id }, payload, { new: true });

		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
