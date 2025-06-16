/**
 * @author Brijesh Prajapati
 * @description Change Password of Admin
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ bcryptjs, jwt } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { randomDigit } = require('../../../utils/random');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Update Password');

	let { password, old_password } = req.body,
		{ adminAuthData } = req.headers;

	try {
		// Validation
		if (isEmpty(password) || isEmpty(old_password)) {
			return response(res, httpStatus.BAD_REQUEST, 'Password is required');
		}

		// Password Hash using Bcrypt JS
		password = await bcryptjs.hash(password);

		// For: Check Old password
		// DB: Find User Password
		let userResult = await AdminRepo.findOne({ _id: adminAuthData.id }).select('+password').lean();

		// Match Hash
		let matchPassword = bcryptjs
			.compare(old_password, userResult.password)
			.then(() => true)
			.catch(() => false);

		if (!matchPassword) {
			return response(res, httpStatus.FORBIDDEN, 'Old password is incorrect');
		}

		// DB: Find & Update
		const authToken = randomDigit(6);

		AdminRepo.findByIdAndUpdate(
			{ _id: userResult._id },
			{
				password,
				authToken: authToken,
			}
		)
			.exec()
			.catch((error) => req.logger.error(error));

		let authorization = jwt.sign({
			id: userResult._id,
			type: userResult.type,
			authToken: authToken,
			via: 'CHANGE-PASSWORD',
		});

		return response(res, httpStatus.OK, 'Please Send Header as authorization for "authorization" Required APIs', { authorization });
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
