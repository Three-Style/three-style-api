/**
 * @author Brijesh Prajapati
 * @description Lock-Unlock User Profile
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ isEmpty, isBoolean } = require('lodash'),
	{ isValidObjectId } = require('mongoose'),
	response = require('../../../utils/response');
const { UserProfileUpdateEvent } = require('../../../common/cache_key');
const GeneralCache = require('../../../services/node-cache')('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Users > Unlock User');

	const { adminAuthData } = req.headers;
	const { user_id, lock } = req.body;

	try {
		if (isEmpty(user_id) || !isValidObjectId(user_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid User Id');
		}

		if (!isBoolean(lock)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid lock. Must be boolean.');
		}

		// DB: Find & Update
		let result = await UserRepo.findByIdAndUpdate({ _id: user_id }, { lock: lock, updatedBy: adminAuthData.id }, { new: true }).select('email first_name last_name mobile lock');

		if (!result) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid User Id');
		}

		GeneralCache.emit(UserProfileUpdateEvent, { user_id: result._id });

		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
