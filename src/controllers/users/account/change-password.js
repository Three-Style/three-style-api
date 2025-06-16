/**
 * @author Brijesh Prajapati
 * @description Change Password of Client User
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ bcryptjs, jwt, nodemailer, nodeCache } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response'),
	{ randomDigit } = require('../../../utils/random'),
	fs = require('fs'),
	{ userStatus, CacheConstants } = require('../../../common');
const GeneralCache = nodeCache('General');
const process = require('process');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Change Password');

	let { password, resetToken, old_password } = req.body,
		{ userAuthData } = req.headers,
		updatedBy;

	// For Reset Password
	if (req.path == '/account/reset-password') {
		if (!resetToken) return response(res, httpStatus.SERVICE_UNAVAILABLE, 'Reset Token Required');
	} else {
		updatedBy = userAuthData.id;
		if (!old_password) {
			return response(res, httpStatus.BAD_REQUEST, 'old password is required');
		}
	}

	try {
		// Validation
		if (isEmpty(password)) {
			return response(res, httpStatus.BAD_REQUEST, 'Password is required');
		}

		// [FOR: RESET PASSWORD] Decode Token
		let decodeResetToken;

		if (resetToken) {
			decodeResetToken = await jwt.verify(resetToken);

			if (!decodeResetToken) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid Token');
			}

			// Token Validation
			if (decodeResetToken.id || decodeResetToken.purpose == 'RESET-PASSWORD') {
				let userResult = await UserRepo.findOne({
					_id: decodeResetToken.id,
					status: userStatus.active,
					authToken: decodeResetToken.authToken,
				});

				if (!userResult) {
					return response(res, httpStatus.BAD_REQUEST, 'Invalid Token', { error: 'Token and Actual Data not match' });
				}
			} else {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid Token', { error: 'User ID not found. Token may not for reset password' });
			}
		}

		// Password Hash using Bcrypt JS
		password = await bcryptjs.hash(password);

		// For: Check Old password
		if (old_password && !resetToken) {
			// DB: Find User Password
			let userResult = await UserRepo.findOne({ _id: userAuthData ? userAuthData.id : decodeResetToken.id }).select('password');

			// Match Hash
			let matchPassword = bcryptjs.compare(old_password, userResult.password);

			if (!matchPassword) {
				return response(res, httpStatus.FORBIDDEN, 'Old password is incorrect');
			}
		}

		// DB: Find & Update
		let result = await UserRepo.findByIdAndUpdate(
				{ _id: userAuthData ? userAuthData.id : decodeResetToken.id },
				{
					password,
					authToken: randomDigit(),
					updatedBy: updatedBy || decodeResetToken.id,
					emailVerified: true,
					lock: false,
				},
				{ new: true }
			).select('+authToken'),
			token = jwt.sign({
				id: result._id,
				email: result.email,
				createdOn: String(new Date()),
				authToken: result.authToken,
				via: 'USER-CHANGE-PASSWORD-BY-USER',
				purpose: 'AUTHORIZATION',
				note: 'Token generated while changing password',
			});

		if (!result) {
			return response(res, httpStatus.FORBIDDEN, 'Incorrect ID');
		}

		// Send Alert Email
		let emailTemplate = process.cwd() + '/src/templates/change-user-password.html',
			HTMLPage = fs.readFileSync(emailTemplate, 'utf8'),
			lockToken = jwt.sign(
				{
					id: result._id,
					email: result.email,
					createdOn: String(new Date()),
					authToken: result.authToken,
					via: 'CHANGE-PASSWORD',
					purpose: 'LOCK-ACCOUNT',
					note: 'User can lock account from email link valid for 30 days',
				},
				'30d'
			);

		let accountDisableURL = `${req.protocol}://fggroup.in/verify/lock-account.html?token=${lockToken}`;

		HTMLPage = HTMLPage.replace('$name', `${result.first_name || 'User'} ${result.lastName || ''}`)
			.replace('$email', result.email)
			.replace('$lockToken', accountDisableURL);

		nodemailer(undefined, result.email, 'Security Alert! Password Changed', HTMLPage);

		GeneralCache.emit(CacheConstants.UserProfileUpdateEvent, { user_id: result._id });
		return response(res, httpStatus.OK, 'success', { authorization: token });
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
