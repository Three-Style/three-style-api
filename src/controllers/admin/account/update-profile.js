/**
 * @author Brijesh Prajapati
 * @description Update Admin Profile
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Update Profile');

	const { full_name, mobile } = req.body;

	try {
		if (isEmpty(full_name)) {
			return response(res, httpStatus.BAD_REQUEST, 'Full Name, Email, and Mobile are required');
		}

		let { adminAuthData } = req.headers;

		// DB: Find & Update
		let result = await AdminRepo.findByIdAndUpdate({ _id: adminAuthData.id }, { full_name, mobile }, { new: true });

		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
