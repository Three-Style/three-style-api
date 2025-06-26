/**
 * @author Brijesh Prajapati
 * @description Create User Account
 */

const httpStatus = require('http-status'),
	{ UserRepo, OtpRepo } = require('../../../database'),
	{ bcryptjs, nodemailer, jwt, DayJS } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response'),
	{ email: emailRegex, mobile: mobileRegex } = require('../../../utils/regex'),
	{ userStatus, otpViaCode } = require('../../../common'),
	fs = require('fs');
const { randomDigit } = require('../../../utils/random');
const unirest = require('unirest');
const process = require('process');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Create User');

	let { first_name, last_name, email, password, mobile } = req.body;

	try {
		// Validation
		if (isEmpty(first_name) || isEmpty(last_name) || isEmpty(email) || isEmpty(password) || isEmpty(mobile)) {
			return response(res, httpStatus.BAD_REQUEST, 'First name, last name, mobile, password and email are required');
		}

		// Email Validation
		if (!(await emailRegex(email, true))) {
			return response(res, httpStatus.BAD_REQUEST, 'Disposable or temporary email is not supported');
		}

		// Mobile Validation
		if (!(await mobileRegex(mobile))) {
			return response(res, httpStatus.BAD_REQUEST, 'Mobile Number is not a valid');
		}

		let userResult = await UserRepo.findOne({ $or: [{ email }, { mobile }], status: { $nin: [userStatus.deleted] } });
		if (userResult) {
			return response(res, httpStatus.CONFLICT, 'Account with this email or mobile already exist');
		}

		// Hash password using BcryptJS
		password = await bcryptjs.hash(password);

		// DB Payload
		let payload = {
			first_name,
			last_name,
			email,
			mobile,
			password,
			authToken: randomDigit(6),
		};

		// DB: Create
		let result = await UserRepo.create(payload).then((result) => {
			UserRepo.findByIdAndUpdate(
				{ _id: result._id },
				{
					createdBy: result._id,
					updatedBy: result._id,
				}
			).catch();

			return result;
		});

		// Send Verification Email
		let emailTemplatePath = `${process.cwd()}/src/templates/new-ac-user-by-user.html`,
			templateHTML = await fs.readFileSync(emailTemplatePath, 'utf8'),
			token = jwt.sign(
				{
					id: result._id,
					email: result.email,
					createdOn: String(new Date()),
					authToken: payload.authToken,
					via: 'USER-REGISTRATION-BY-USER',
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
			.replace('$reject_request', rejectRequestURL);

		// fs.writeFileSync(emailTemplatePath + '--test.html', templateHTML)

		nodemailer('Three Style', result.email, 'Verify email address', templateHTML, 'Three Style');

		// Send Mobile Verification
		let otpPayload = {
			user_id: result._id,
			otp_code: randomDigit(5),
			isActive: true,
			via: otpViaCode.mobileVerification,
			expiredAt: DayJS().add(24, 'hours').toDate(),
		};

		let otpResult = await OtpRepo.create(otpPayload);

		// Send OTP
		const text = encodeURIComponent(`Your OTP is ${otpResult.otp_code} for Three Style. We highly recommend not share it with others.`);
		unirest
			.post(`http://sms.mobileadz.in/api/push.json?apikey=615b7adfe352e&sender=THREESTYLEF&mobileno=${result.mobile}&text=${text}`)
			.then((response) => {
				req.logger.info(JSON.stringify(response.body));
			})
			.catch((error) => {
				req.logger.error(error.stack);
			});

		// Send Access Token
		let authorization = await jwt.sign({
			id: result._id,
			email: result.email,
			authToken: payload.authToken,
			via: 'REGISTRATION',
			createdOn: String(new Date()),
			note: 'This is valid for resend verification email and OTP. Also It could be possible to access application.',
		});

		return response(res, httpStatus.OK, 'Email send for verification', { ...result, password: false, authToken: false, authorization });
	} catch (error) {
		req.logger.error(error.stack);

		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
