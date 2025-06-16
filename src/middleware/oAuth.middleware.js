const httpStatus = require('http-status');
const response = require('../utils/response');
const { jwt: ServiceJWT } = require('../services');
const oAuthConfig = require('../config/oAuthRoute');
const oAuthRoutes = oAuthConfig.oAuthRoutes;
const Issuer = 'three_style';
const Audience = 'oAuth';

const oAuthMiddleware = (req, res, next) => {
	req.logger.info('Middleware > oAuth Middleware');

	try {
		const { authorization } = req.headers;
		const decodedToken = ServiceJWT.verify(authorization, { issuer: Issuer, audience: Audience });
		if (!decodedToken) return response(res, httpStatus.UNAUTHORIZED, 'Invalid Token', undefined, '#OAUTH_FAILED');

		const requestDomain = req.headers.host.split(':')[0];

		if (decodedToken.allowedMethods) {
			if (!decodedToken.allowedMethods.includes(req.method)) return response(res, httpStatus.FORBIDDEN, 'API key does not allow this method', undefined, '#OAUTH_FAILED');
		} else {
			return response(res, httpStatus.FORBIDDEN, 'API key does not allow this method', undefined, '#OAUTH_FAILED');
		}

		let isRouteAllowed = oAuthRoutes.find((route) => route.path === req.originalUrl && route.method === req.method);

		if (isRouteAllowed) {
			req.logger.info('Middleware > oAuth Middleware > Route is allowed for Franchise');
			req.logger.info(`[OAuth] Domain: ${requestDomain} | User: ${decodedToken.id}`);

			req.headers.adminAuthData = decodedToken;
			return next();
		} else {
			return response(res, httpStatus.FORBIDDEN, 'API key does not allow this route', undefined, '#OAUTH_FAILED');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error, '#OAUTH_FAILED');
	}
};
module.exports = oAuthMiddleware;
