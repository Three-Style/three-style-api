/**
 * @author Brijesh Prajapati
 * @description Add User
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { MongoDBErrorParser } = require('../../../helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Users > Create User');

	const { adminAuthData } = req.headers;
	const { first_name, last_name, mobile, email } = req.body;

	try {
		if (isEmpty(first_name) || isEmpty(last_name) || isEmpty(mobile) || isEmpty(email)) {
			return response(res, httpStatus.BAD_REQUEST, 'First name, last name and mobile number are required');
		}

		if (await UserRepo.exists({ mobile })) {
			return response(res, httpStatus.BAD_REQUEST, 'Mobile number already exists. It is possible that you have deleted this user. Please contact developer for more details.');
		}

		if (await UserRepo.exists({ email })) {
			return response(res, httpStatus.BAD_REQUEST, 'Mobile number already exists. It is possible that you have deleted this user. Please contact developer for more details.');
		}

		// DB: Find & Update
		return UserRepo.create({ first_name, last_name, mobile, email, createdBy: adminAuthData.id, updatedBy: adminAuthData.id })
			.then((result) => {
				result = result.toJSON();
				delete result.authToken;
				delete result.password;
				return response(res, httpStatus.OK, 'success', result);
			})
			.catch((error) => response(res, MongoDBErrorParser(error)));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
