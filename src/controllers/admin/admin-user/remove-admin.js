/**
 * @author Brijesh Prajapati
 * @description Remove Admin
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');
const { adminType } = require('../../../common');

module.exports = async (req, res) => {
	req.logger.info('Admin > Admin User > Remove Admin');

	let { id } = req.body,
		{ adminAuthData } = req.headers;

	try {
		// Validation
		if (isEmpty(id) || !isValidObjectId(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Id');
		}

		if (adminAuthData.type != adminType.master) {
			return response(res, httpStatus.FORBIDDEN, 'Insufficient Permission');
		}

		// DB: Find & Update
		let result = await AdminRepo.findByIdAndUpdate(
			{ _id: id, type: adminType.admin },
			{
				status: false,
			}
		);

		return result ? response(res, httpStatus.OK, 'success') : response(res, httpStatus.FORBIDDEN, 'Invalid Id');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
