/**
 * @author Brijesh Prajapati
 * @description Lock Account
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ jwt } = require('../../../services'),
	{ userStatus } = require('../../../common'),
	{ randomDigit } = require('../../../utils/random'),
	response = require('../../../utils/response');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Lock Account');

	let { token } = req.query,
		decodedToken = jwt.verify(token);

	let responseInterface = {
		status: '',
		message: '',
		name: '',
		email: '',
	};

	if (!token || !decodedToken) {
		return response(res, httpStatus.EXPECTATION_FAILED, undefined, {
			...responseInterface,
			status: `Failed 😢. We cannot process with this request.`,
			message: `Sorry! We couldn't verify your email address.`,
		});
	}

	if (decodedToken.purpose != 'LOCK-ACCOUNT') {
		return response(res, httpStatus.EXPECTATION_FAILED, undefined, {
			...responseInterface,
			status: `Inappropriate activity suspected`,
			message: `Do not try again if your account already locked.`,
			email: decodedToken.email,
		});
	}

	// For Valid Token
	let userResult = await UserRepo.findOne(
		{
			_id: decodedToken.id,
			email: decodedToken.email,
			authToken: decodedToken.authToken,
			lock: false,
			status: { $ne: userStatus.deleted },
		},
		{ password: false, authToken: false }
	);

	// If Active User not found
	if (!userResult) {
		return response(res, httpStatus.EXPECTATION_FAILED, undefined, {
			...responseInterface,
			status: `We couldn't find your <b> active </b>/<b> unlocked </b> account. Your token may expired due to change/reset password.`,
			message: `Do not try again if your account already locked.`,
			email: decodedToken.email,
		});
	}

	let result = await UserRepo.findOneAndUpdate(
		{ _id: userResult._id },
		{
			lock: true,
			authToken: randomDigit(),
			updatedBy: userResult._id,
		}
	);

	if (result) {
		return response(res, httpStatus.EXPECTATION_FAILED, undefined, {
			...responseInterface,
			status: `Thank your taking action to protect your account.`,
			message: `We have locked your account. You can activate again by reset password or contact our team`,
			name: `${userResult.first_name} ${userResult.last_name}`,
			email: decodedToken.email,
		});
	} else {
		return response(res, httpStatus.EXPECTATION_FAILED, undefined, {
			...responseInterface,
			status: `Failed! We're sorry to inform you that we can't lock your account. Please contact us immediately to prevent misuse or unauthorized access.`,
			message: `Sorry! Contact us to save your account from unauthorized hands.`,
			name: ``,
			email: decodedToken.email,
		});
	}
};
