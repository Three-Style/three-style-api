const httpStatus = require('http-status'),
	{ AdminRepo } = require('../database'),
	{ jwt, nodeCache } = require('../services'),
	{ isEmpty } = require('lodash'),
	response = require('../utils/response');
const { MFAMethods } = require('../common');
const oAuthMiddleware = require('./oAuth.middleware');
const AuthorizationCache = nodeCache('Authorization');
const cacheTTL = 60 * 5;
const Audience = 'oAuth';

module.exports = async (req, res, next) => {
	req.logger.info('Middleware > Admin Middleware');

	try {
		const { authorization } = req.headers;

		if (isEmpty(authorization)) {
			return response(res, httpStatus.UNAUTHORIZED, 'Token is required');
		}

		// Decode Token
		let tokenResult = jwt.verify(authorization);

		if (tokenResult) {
			if (tokenResult?.aud === Audience) {
				return oAuthMiddleware(req, res, next);
			}

			const CacheKey = tokenResult.id;

			if (AuthorizationCache.has(CacheKey)) {
				req.headers.adminAuthData = AuthorizationCache.get(CacheKey);
				AuthorizationCache.ttl(CacheKey, cacheTTL); // it will again set ttl to 5 minutes for active user
				req.logger.info(`[Middleware][Cached]: User Authentication Verified. UID: ${tokenResult.id}`);

				if (tokenResult?.type) {
					// return franchiseMiddleware(req, res, next);
				} else {
					return next();
				}
			}

			// Find User Using ID
			let result = await AdminRepo.findOne({ _id: tokenResult.id, status: true }).select('+authToken').lean();

			if (result) {
				// Match Auth Token
				if (result.authToken != tokenResult.authToken) {
					return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token');
				}

				// Check MFA
				try {
					await MFAValidator(result, tokenResult);
				} catch (error) {
					return response(res, error.code || httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error.data, error.customCode);
				}

				// Store Decoded Token in Header [req.header.adminAuthData]
				req.headers.adminAuthData = tokenResult;
				AuthorizationCache.set(CacheKey, req.headers.adminAuthData, cacheTTL);

				// Passed
				return next();
			} else {
				return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token');
			}
		} else {
			return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'internalError', error);
	}
};

const MFAValidator = (result, token) =>
	new Promise((resolve, reject) => {
		if (result?.MFA_enabled?.length > 0) {
			if (!token.MFA) {
				return reject({ code: httpStatus.PRECONDITION_REQUIRED, message: 'MFA is required' });
			}

			if (!result.MFA_enabled.includes(token.MFA)) {
				return reject({ code: httpStatus.PRECONDITION_REQUIRED, message: 'MFA is not enabled' });
			}

			let isSecretExist;

			switch (token.MFA) {
				case MFAMethods.authenticator:
					if (!token.secret_id) {
						return reject({
							code: httpStatus.FORBIDDEN,
							message: 'Invalid Authenticator Code',
							data: { error: 'Token does not contain secret_id required for MFA method ' + MFAMethods.authenticator },
						});
					}

					var authenticatorData = result.authenticator_secrets || [];

					isSecretExist = authenticatorData.some((item) => {
						return String(item._id) == token.secret_id;
					});

					if (!isSecretExist) {
						return reject({ code: httpStatus.FORBIDDEN, message: 'Authenticator Secret Revoked', data: { error: 'secret expired' }, customCode: '#MFA_SECRET_REVOKED' });
					}

					return resolve(true);
			}
		}

		return resolve(true);
	});
