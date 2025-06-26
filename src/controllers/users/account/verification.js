/**
 * @author Brijesh Prajapati
 * @description Verify OTP/Emailaa
 */

const httpStatus = require('http-status'),
	{ UserRepo, OtpRepo } = require('../../../database'),
	{ jwt } = require('../../../services'),
	{ userStatus, otpViaCode } = require('../../../common'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { deleteCache } = require('../../cache-manager/cache-manager');

module.exports.emailVerification = async (req, res) => {
	req.logger.info('Controller > User > Account > Verification');

	let { token, choice } = req.query,
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

	// For Valid Token
	let userResult = await UserRepo.findOne({
		_id: decodedToken.id,
		authToken: decodedToken.authToken,
		status: { $eq: userStatus.active },
	});

	deleteCache('General', { prefix: userResult._id });

	// If Active User not found
	if (!userResult) {
		return response(res, httpStatus.FORBIDDEN, undefined, {
			...responseInterface,
			status: `We couldn't find your <b> active </b> account. Your token may expired due to change/reset password/already verified.`,
			message: `Sorry! Contact us to activate account.`,
		});
	}

	// If already verified
	if (userResult.emailVerified && userResult.email == decodedToken.email && !choice) {
		return response(res, httpStatus.OK, undefined, {
			...responseInterface,
			status: `Your account already verified for ${decodedToken.email}.`,
			message: `Please login and access various features. <input type="hidden" value="https://threestyle.in?action=Login" id="hiddenRedirect">`,
			name: `${userResult.first_name} ${userResult.last_name || ''}`,
			email: userResult.email,
			redirect_path: '/index.html?action=Login',
		});
	}

	// If user choose to reject approval from email
	if (choice && String(choice).toLowerCase() == 'reject') {
		// Remove User Account
		return UserRepo.findOneAndDelete({ _id: decodedToken.id, email: decodedToken.email }, { status: userStatus.deleted }).then((result) => {
			if (!result) {
				return response(res, httpStatus.FORBIDDEN, undefined, {
					...responseInterface,
					status: `We couldn't find your account with this email address.`,
					message: `Sorry! Your account may removed or email address changed.`,
				});
			}

			return response(res, httpStatus.OK, undefined, {
				...responseInterface,
				status: `We removed your account.`,
				message: `Sorry! We'll never disturb you until this email address wakes up again in our application.`,
			});
		});
	}

	return UserRepo.findByIdAndUpdate({ _id: decodedToken.id, email: decodedToken.email }, { updatedBy: decodedToken.id, emailVerified: true }, { new: true }).then((result) => {
		if (!result) {
			return response(res, httpStatus.FORBIDDEN, undefined, {
				...responseInterface,
				status: `We couldn't find your account with this email address.`,
				message: `Sorry! Your account may removed or email address changed.`,
				email: decodedToken.email,
			});
		}

		// Success
		return response(res, httpStatus.OK, undefined, {
			...responseInterface,
			status: `Your email address has been verified <i style="color:green"> ✓ </i>`,
			message: `You can access our website without any restriction. <input type="hidden" value="https://threestyle.in?action=Login" id="hiddenRedirect">`,
			name: `${result.first_name} ${result.last_name || ''}`,
			email: result.email,
			redirect_path: '/index.html?action=Login',
		});
	});
};

module.exports.mobileVerification = async (req, res) => {
	req.logger.info('Controller > User > Account > Mobile Verification');

	let { otp, mobile } = req.body;

	if (!otp || isEmpty(otp) || !mobile || isEmpty(mobile)) {
		return response(res, httpStatus.BAD_REQUEST, 'mobile & OTP required', undefined);
	}

	let userResult = await UserRepo.findOne({ mobile: mobile, status: userStatus.active }).select('+authToken').catch();

	if (!userResult) {
		return response(res, httpStatus.BAD_REQUEST, 'No any account registered with this mobile number');
	}

	let otpResult = await OtpRepo.findOne({ user_id: userResult._id, isActive: true, via: otpViaCode.mobileVerification }).sort({ created_at: -1 });
	if (!otpResult) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid Code');
	}

	if (otpResult.otp_code != otp) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid OTP');
	}

	OtpRepo.findByIdAndUpdate({ _id: otpResult._id }, { isActive: false, updatedBy: userResult._id }).catch();

	return UserRepo.findByIdAndUpdate({ _id: userResult._id }, { updatedBy: userResult._id, mobileVerified: true }, { new: true }).then(async (result) => {
		if (!result) {
			return response(res, httpStatus.FORBIDDEN, `Sorry! Your account may removed or email address changed.`);
		}

		let authorization = await jwt.sign({
			id: userResult._id,
			email: userResult.email,
			authToken: userResult.authToken,
			via: 'OTP Verification',
			createdOn: String(new Date()),
		});

		deleteCache('General', { prefix: userResult._id });

		// Success
		return response(res, httpStatus.OK, 'Your mobile number has been verified', { authorization });
	});
};

module.exports.emailVerification = async (req, res) => {
	req.logger.info('Controller > User > Account > Mobile Verification');

	let { otp, email } = req.body;

	if (!otp || isEmpty(otp) || !email || isEmpty(email)) {
		return response(res, httpStatus.BAD_REQUEST, 'email & OTP required', undefined);
	}

	let userResult = await UserRepo.findOne({ email: email, status: userStatus.active }).select('+authToken').catch();

	if (!userResult) {
		return response(res, httpStatus.BAD_REQUEST, 'No any account registered with this email');
	}

	let otpResult = await OtpRepo.findOne({ user_id: userResult._id, isActive: true, via: otpViaCode.emailVerification }).sort({ created_at: -1 });
	if (!otpResult) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid Code');
	}

	if (otpResult.otp_code != otp) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid OTP');
	}

	OtpRepo.findByIdAndUpdate({ _id: otpResult._id }, { isActive: false, updatedBy: userResult._id }).catch();

	return UserRepo.findByIdAndUpdate({ _id: userResult._id }, { updatedBy: userResult._id, emailVerified: true }, { new: true }).then(async (result) => {
		if (!result) {
			return response(res, httpStatus.FORBIDDEN, `Sorry! Your account may removed or email address changed.`);
		}

		let authorization = await jwt.sign({
			id: userResult._id,
			email: userResult.email,
			authToken: userResult.authToken,
			via: 'OTP Verification',
			createdOn: String(new Date()),
		});

		deleteCache('General', { prefix: userResult._id });

		// Success
		return response(res, httpStatus.OK, 'Your email has been verified', { authorization });
	});
};
