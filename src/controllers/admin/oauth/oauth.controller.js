const httpStatus = require('http-status');
const response = require('../../../utils/response');
const JWT = require('jsonwebtoken');
const process = require('process');
const oAuthJWTSecret = process.env.OAUTH_JWT_SECRET;
const { jwt } = require('../../../services');
const moment = require('moment');
const Issuer = 'three_style';
const Audience = 'oAuth';

/**
 * @author Brijesh Prajapati
 * @description generate JWT Token for Client
 */
const oauthTokenGenerator = (req, res) => {
	try {
		const requestToken = req.headers.authorization;
		let allowedMethods = [];
		let decodeRequestToken = JWT.verify(requestToken, oAuthJWTSecret);

		if (decodeRequestToken?.access_scope?.includes('read')) {
			allowedMethods.push('GET');
		}

		if (!allowedMethods.length) {
			return response(res, httpStatus.BAD_REQUEST, 'access scope not found');
		}

		const accessToken = {
			requestToken: requestToken,
			allowedMethods,
			id: decodeRequestToken.user_id,
			via: 'oAuth',
		};

		let oAuthToken = jwt.sign(accessToken, moment(decodeRequestToken.exp * 1000).diff(moment(), 'seconds') + 's', { issuer: Issuer, audience: Audience });

		return response(res, httpStatus.OK, 'success', { authorization: oAuthToken });
	} catch (error) {
		console.error(error);
		return response(res, httpStatus.EXPECTATION_FAILED, 'Something went wrong', error);
	}
};
module.exports = oauthTokenGenerator;
