/**
 * @author Brijesh Prajapati
 * @description Login into Admin Account and Get Authorization Token
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ bcryptjs, jwt } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { MFAMethods } = require('../../../common');
const { verifySecret } = require('./authenticator/authenticator.controller');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Login');

	try {
		const { email, password, authenticator_token } = req.body;

		// Validation
		if (isEmpty(email) || isEmpty(password)) {
			return response(res, httpStatus.BAD_REQUEST, 'Email and password is required');
		}

		// DB: Find
		let result = await AdminRepo.findOne({ email, status: true }).select('+password +authToken');

		if (result) {
			// Compare Hash Password
			const isPasswordMatch = bcryptjs.compare(password, result.password);

			if (!isPasswordMatch) return response(res, httpStatus.BAD_REQUEST, 'Invalid Email or Password');

			let authorization = {
				id: result._id,
				type: result.type,
				franchise_id: result?.franchise_id,
				authToken: result.authToken,
				via: 'LOGIN',
			};

			if (result?.MFA_enabled?.length > 0) {
				try {
					let validatorResult = await MFAValidator({ authenticator_token, user_id: result._id });
					authorization.MFA = validatorResult.MFA;
					authorization.secret_id = validatorResult.secret_id;
				} catch (error) {
					return response(res, error.code || httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error.data, error.customCode);
				}
			}

			authorization = jwt.sign(authorization, '30d');

			return response(res, httpStatus.OK, 'Always send header as "authorization" for authorization Required APIs', { authorization });
		} else {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Email or Password');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

const MFAValidator = async ({ authenticator_token, user_id }) => {
	// Authenticator Token
	if (authenticator_token && user_id) {
		await verifySecret(user_id, authenticator_token)
			.then((result) => Promise.resolve({ MFA: MFAMethods.authenticator, secret_id: result.secret_id }))
			.catch((error) => Promise.reject({ MFA: MFAMethods.authenticator, code: httpStatus.FORBIDDEN, message: error || 'Invalid authenticator_token.', customCode: '#AUTHENTICATOR_CODE_INVALID' }));
	} else {
		// Fallback if no MFA method value is provided
		return Promise.reject({
			MFA: MFAMethods.authenticator,
			code: httpStatus.PRECONDITION_REQUIRED,
			message: 'Multi-Factor Authentication is enabled. Please authenticate with authenticator.',
			customCode: '#MFA_REQUIRED',
		});
	}
};
