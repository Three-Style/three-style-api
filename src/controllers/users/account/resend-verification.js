/**
 * @author Brijesh Prajapati
 * @description Get User Information
 */

const httpStatus = require('http-status'),
	fs = require('fs'),
	{ UserRepo, OtpRepo } = require('../../../database'),
	{ nodemailer, jwt, DayJS } = require('../../../services'),
	response = require('../../../utils/response'),
	{ randomDigit } = require('../../../utils/random'),
	{ otpViaCode } = require('../../../common');
const process = require('process');
const unirest = require('unirest');

module.exports.sendVerificationEmail = async (req, res) => {
	req.logger.info('Controller > User > Account > Resend Verification > Email');

	let { userAuthData } = req.headers;

	try {
		// DB: Find
		let result = await UserRepo.findOne({ _id: userAuthData.id }).lean();

		if (result.emailVerified) {
			return response(res, httpStatus.FORBIDDEN, 'Email already verified');
		}

		// Send Verification Email
		let emailTemplatePath = `${process.cwd()}/src/templates/new-ac-user-by-user.html`,
			templateHTML = await fs.readFileSync(emailTemplatePath, 'utf8'),
			token = jwt.sign(
				{
					id: result._id,
					email: result.email,
					createdOn: String(new Date()),
					authToken: result.authToken,
					via: 'USER-RESEND-VERIFICATION-BY-USER',
					purpose: 'VERIFY-EMAIL',
					note: 'Token generated while creating user account by user. valid for 5 days',
				},
				'5d'
			),
			acceptRequestURL = `${req.protocol}://fgGroup.in/verify/verify-email.html?token=${token}&choice=accept`,
			rejectRequestURL = `${req.protocol}://fgGroup.in/verify/verify-email.html?token=${token}&choice=reject`;

		templateHTML = templateHTML
			.replace('$name', `${result.first_name} ${result.last_name}`)
			.replace('$email', result.email)
			.replace('$accept_request', acceptRequestURL)
			.replace('$accept_request_link', acceptRequestURL)
			.replace('$reject_request', rejectRequestURL)
			.replace('$profileImage', result.profile_image || '');

		// fs.writeFileSync(emailTemplatePath + '--test.html', templateHTML)

		await nodemailer(undefined, result.email, 'Three Style Email Verification', templateHTML);

		result.password = result.authToken = undefined;
		return response(res, httpStatus.OK, 'Email resend successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.sendVerificationOTP = async (req, res) => {
	req.logger.info('Controller > User > Account > Resend Verification > Mobile OTP');

	let { userAuthData } = req.headers;

	// DB: Find
	let result = await UserRepo.findOne({ _id: userAuthData.id }).lean();

	if (result.mobileVerified) {
		return response(res, httpStatus.FORBIDDEN, 'Mobile already verified');
	}

	let otpResult = await OtpRepo.findOne({ user_id: result._id, isActive: true, via: otpViaCode.mobileVerification, expiredAt: { $gte: DayJS().add(1, 'hours').toDate() } });

	if (!otpResult) {
		let otpPayload = {
			user_id: result._id,
			otp_code: randomDigit(5),
			isActive: true,
			via: otpViaCode.mobileVerification,
			expiredAt: DayJS().add(24, 'hours').toDate(),
		};

		// SEND SMS API HERE
		otpResult = await OtpRepo.create(otpPayload);
	}

	const text = encodeURIComponent(`Your OTP is ${otpResult.otp_code} for Three Style. We highly recommend not share it with others. Gomzi`);
	unirest
		.post(`http://sms.mobileadz.in/api/push.json?apikey=615b7adfe352d&sender=GOMZIF&mobileno=${result.mobile}&text=${text}`)
		.then((response) => {
			req.logger.info(JSON.stringify(response.body));
		})
		.catch((error) => {
			req.logger.error(error.stack);
		});

	return response(res, httpStatus.OK, `OTP has been sent on this ${result.country_code}${result.mobile}`, undefined, 'ERR#OTP-RESEND');
};
