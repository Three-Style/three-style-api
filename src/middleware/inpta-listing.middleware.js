const httpStatus = require('http-status'),
	response = require('../utils/response'),
	{ userService } = require('../common');

module.exports = (req, res, next) => {
	req.logger.info('Middleware > User INPTA Listing');

	try {
		const { userAuthData } = req.headers;

		if (!userAuthData) {
			return response(res, httpStatus.UNAUTHORIZED, 'User is not authorized');
		}

		if (userAuthData?.active_services?.find((service) => service === userService.inptaListing)) {
			return next();
		} else if (userAuthData?.type == 'MASTER') {
			return next();
		} else {
			return response(res, httpStatus.FORBIDDEN, 'User is not allowed to access this service');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'internalError', error);
	}
};
