const httpStatus = require('http-status'),
	{ UserRepo, UserServiceRepo } = require('../database'),
	{ jwt, nodeCache } = require('../services'),
	{ isEmpty } = require('lodash'),
	response = require('../utils/response'),
	{ userStatus } = require('../common');

const emailExcludeRoute = ['/account/resend-verification-email', '/account/resend-verification-otp'];
const AuthorizationCache = nodeCache('Authorization');

module.exports = (req, res, next) => {
	req.logger.info('Middleware > User Authentication');

	try {
		const authorization = req.headers.authorization || req.cookies.authorization;

		if (isEmpty(authorization)) {
			return response(res, httpStatus.UNAUTHORIZED, 'Token is required');
		}

		// Decode Token
		let tokenResult = jwt.verify(authorization);

		if (!tokenResult) {
			return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token. User may not found or account is deactivated');
		}

		const cacheKey = tokenResult.id,
			cacheTTL = 60 * 5; // 5 minutes
		if (AuthorizationCache.has(cacheKey)) {
			req.headers.userAuthData = AuthorizationCache.get(cacheKey);
			AuthorizationCache.ttl(cacheKey, cacheTTL); // it will again set ttl to 5 minutes for active user
			req.logger.info(`[Middleware][Cached]: User Authentication Verified. UID: ${tokenResult.id}`);
			return next();
		}

		// Find User Using ID
		return UserRepo.findById(tokenResult.id).then(async (result) => {
			if (!result) {
				return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token');
			}

			const ActiveServices = await UserServiceRepo.find({ user_id: result._id, status: true }).select('service');

			if (result.status != userStatus.active) {
				return response(res, httpStatus.UNAUTHORIZED, 'User account has been removed. Please contact us.');
			}

			if (!result.mobileVerified && !result.emailVerified && !emailExcludeRoute.includes(req.path)) {
				return response(res, httpStatus.UNAUTHORIZED, 'User is not verified');
			}

			// Match Auth Token
			if (result.authToken != tokenResult.authToken) {
				return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token. Authentication Token does not match');
			}

			if (result.lock) {
				return response(res, httpStatus.FORBIDDEN, 'Account is locked by user for the security reason.');
			}

			// Store Decoded Token in Header [req.header.userAuthData]
			req.headers.userAuthData = { ...tokenResult, uid: result.uid, active_services: ActiveServices.map((item) => item.service) };

			AuthorizationCache.set(cacheKey, req.headers.userAuthData, cacheTTL); // 5 minutes

			req.logger.info(`[Middleware]: User Authentication Verified. UID: ${result._id}`);

			// Passed
			next();

			// Update Information
			if (req.headers['device-info']) {
				try {
					let UserAppDeviceInfo = JSON.parse(req.headers['device-info']);
					let updatePayload = {
						$set: {
							app_data: {
								...result.app_data,
								...UserAppDeviceInfo,
								is_beta: UserAppDeviceInfo.platform === 'Android' && UserAppDeviceInfo.app_version.includes('beta'),
							},
						},
					};

					UserRepo.findByIdAndUpdate(result._id, updatePayload).catch((error) => req.logger.error(error.stack));
				} catch (error) {
					req.logger.error(error.stack);
				}
			}
		});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'internalError', error);
	}
};
