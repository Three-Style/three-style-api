/**
 * @author Brijesh Prajapati
 * @description Remove User Profile
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ isEmpty } = require('lodash'),
	{ isValidObjectId } = require('mongoose'),
	response = require('../../../utils/response');
const { userStatus } = require('../../../common');
const { UserProfileUpdateEvent } = require('../../../common/cache_key');
const GeneralCache = require('../../../services/node-cache')('General');

module.exports = async (req, res) => {
	req.logger.info('Admin > Users > Remove User');

	const { id } = req.body;

	try {
		if (isEmpty(id) || !isValidObjectId(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Id');
		}

		// DB: Find & Update
		let result = await UserRepo.findByIdAndUpdate({ _id: id }, { status: userStatus.deleted }, { new: true }).select('-password -authToken');

		if (!result) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Id');
		}
		GeneralCache.emit(UserProfileUpdateEvent, { user_id: result._id });
		return response(res, httpStatus.OK, 'success');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
