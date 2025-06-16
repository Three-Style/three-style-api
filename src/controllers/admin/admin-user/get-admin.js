/**
 * @author Brijesh Prajapati
 * @description Get Admins Information
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Admin > Admin User > Get Admin');

	let { adminAuthData } = req.headers;
	let { adminID } = req.query;

	let findQuery = { status: true };

	adminID && (findQuery._id = ObjectId.createFromHexString(adminID));
	adminAuthData.franchise_id && (findQuery.franchise_id = ObjectId.createFromHexString(adminAuthData.franchise_id));
	try {
		// DB: Find
		return AdminRepo.aggregate([
			{
				$match: findQuery,
			},
			{
				$project: {
					authToken: false,
					password: false,
					'authenticator_secrets.secret': false,
				},
			},
		]).then((result) => {
			if (adminID) {
				result = result[0];
			}
			return result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.BAD_REQUEST, 'Invalid ID');
		});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
