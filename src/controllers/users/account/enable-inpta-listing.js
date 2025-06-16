/**
 * @author Brijesh Prajapati
 * @description Update Client User
 */

const httpStatus = require('http-status'),
	{ UserServiceRepo } = require('../../../database'),
	{ nodeCache } = require('../../../services'),
	response = require('../../../utils/response');
const { userService, CacheConstants } = require('../../../common');
const GeneralCache = nodeCache('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Enable INPTA Listing');

	let { userAuthData } = req.headers,
		AuthorizedUserID = userAuthData.id;

	try {
		let payload = {
			user_id: userAuthData.id,
			service: userService.inptaListing,
			status: true,
			createdBy: AuthorizedUserID,
			updatedBy: AuthorizedUserID,
		};

		UserServiceRepo.findByIdAndUpdate(userAuthData.id, payload, { new: true, upsert: true })
			.then((result) => {
				GeneralCache.emit(CacheConstants.UserProfileUpdateEvent, { user_id: userAuthData.id });
				return response(res, httpStatus.OK, 'success', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		req.logger.error('error');
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
