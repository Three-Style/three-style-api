/**
 * @author Brijesh Prajapati
 * @description Get User Information
 */

const httpStatus = require('http-status'),
	{ UserRepo, UserServiceRepo, UserFitnessCourseRepo, UserBooksRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { UserProfilePrefix } = require('../../../common/cache_key');
const { getCacheMetadata } = require('../../cache-manager/cache-manager');
const GeneralCache = require('../../../services/node-cache')('General');
const CacheTTL = 60 * 60;

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Get User');

	let { userAuthData } = req.headers;

	try {
		const CacheKey = UserProfilePrefix + userAuthData.id;

		if (GeneralCache.has(CacheKey)) {
			return response(res, httpStatus.OK, 'success', GeneralCache.get(CacheKey), undefined, {
				cache: getCacheMetadata({
					cacheName: 'General',
					key: CacheKey,
					prefix: UserProfilePrefix,
				}),
			});
		}

		// DB: Find
		let result = await UserRepo.findById(userAuthData.id).select('-password -authToken -fcm_token').lean();

		let userServices = await UserServiceRepo.find({ user_id: result._id });

		userServices = userServices.map((service) => service.service);

		let resultPayload = {
			user: result,
			active_services: userServices,
			purchasedCourse: false,
			purchasedBook: false,
		};

		let userCourse = await UserFitnessCourseRepo.find({ user_id: result._id }).countDocuments();
		if (userCourse > 0) {
			resultPayload.purchasedCourse = true;
		}

		let userBook = await UserBooksRepo.find({ user_id: result._id }).countDocuments();
		if (userBook > 0) {
			resultPayload.purchasedBook = true;
		}

		GeneralCache.set(CacheKey, resultPayload, CacheTTL);

		return response(res, httpStatus.OK, 'success', resultPayload);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
