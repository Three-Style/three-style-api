/**
 * @author Brijesh Prajapati
 * @description Change Password of Admin
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ bcryptjs } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { adminType } = require('../../../common');

module.exports = async (req, res) => {
	req.logger.info('Admin > Admin User > Reset Admin Account Password');

	let { password, id } = req.body;

	try {
		// Validation
		if (isEmpty(password)) {
			return response(res, httpStatus.BAD_REQUEST, 'Password is required');
		}

		// Password Hash using Bcrypt JS
		password = await bcryptjs.hash(password);

		// DB: Find & Update
		let result = await AdminRepo.findByIdAndUpdate(
			{ _id: id, type: adminType.admin },
			{
				password,
				authToken: Math.floor(new Date().valueOf() * Math.random()),
			},
			{ new: true }
		);

		return result ? response(res, httpStatus.OK, 'success') : response(res, httpStatus.FORBIDDEN, 'Invalid Id');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
