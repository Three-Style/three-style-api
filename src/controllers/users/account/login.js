/**
 * @author Brijesh Prajapati
 * @description Login into Admin Account and Get Authorization Token
 */

const httpStatus = require('http-status'),
	{ UserRepo, UserServiceRepo, OtpRepo } = require('../../../database'),
	{ bcryptjs, jwt, nodemailer, DayJS } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response'),
	{ userStatus, otpViaCode } = require('../../../common');
const { deleteCache } = require('../../cache-manager/cache-manager');
const { randomDigit } = require('../../../utils/random');
const fs = require('fs');
const { regexValidateUtil } = require('../../../utils');
const { MongoDBErrorParser } = require('../../../helpers');
const process = require('process');

module.exports = async (req, res) => {
	req.logger.info('Controller > Users > Account > Login');

	try {
		let { email, password } = req.body;

		// Validation
		if (isEmpty(email) || isEmpty(password)) {
			return response(res, httpStatus.BAD_REQUEST, 'Email and password is required');
		}

		let checkDisposable = process.env.NODE_ENV === 'production';

		if ((await regexValidateUtil.email(email, checkDisposable)) == false) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Email');
		}

		// DB: Find
		let result = await UserRepo.findOne({ email, status: { $ne: userStatus.deleted } });

		if (result) {
			let userServices = await UserServiceRepo.find({ user_id: result._id });

			userServices = userServices.map((service) => service.service);

			// Account Status
			if (result.status == userStatus.deactivate) {
				return response(res, httpStatus.FORBIDDEN, 'Account Access Disabled');
			}

			if (result.lock == true) {
				return response(res, httpStatus.FORBIDDEN, 'Account Locked. To Unlock, use forget password and set new password');
			}

			// Compare Hash Password
			const isPasswordMatch = bcryptjs.compare(password, result.password);

			if (!isPasswordMatch) return response(res, httpStatus.UNAUTHORIZED, 'Invalid Email or Password');

			let authorization = jwt.sign({
				id: result._id,
				email: result.email,
				authToken: result.authToken,
				via: 'LOGIN',
				createdOn: String(new Date()),
			});

			deleteCache('General', { prefix: result._id });

			let { emailVerified, mobileVerified, uid, _id, first_name, last_name, email, profile_image, mobile, country_code } = result;

			let responsePayload = {
				authorization,
				emailVerified,
				mobileVerified,
				mobile,
				country_code,
				uid,
				_id,
				first_name,
				last_name,
				email,
				profile_image,
				active_services: userServices,
			};

			if (result.emailVerified == false && result.mobileVerified == false) {
				return response(res, httpStatus.UNAUTHORIZED, 'Please verify your email and mobile number', responsePayload, 'ERR#VERIFICATION-REQUIRED');
			}

			return response(res, httpStatus.OK, 'Please Send Header as authorization for "authorization" Required APIs', responsePayload);
		} else {
			// create new account and send otp
			password = await bcryptjs.hash(password);

			let payload = {
				email,
				password,
				authToken: randomDigit(6),
			};

			let createUserResult = await createUser(payload);

			if (createUserResult) {
				let otpPayload = {
					user_id: createUserResult._id,
					otp_code: randomDigit(5),
					isActive: true,
					via: otpViaCode.emailVerification,
					expiredAt: DayJS().add(24, 'hours').toDate(),
				};

				OtpRepo.create(otpPayload).catch();

				let emailTemplatePath = `${process.cwd()}/src/templates/user-email-otp.html`,
					templateHTML = await fs.readFileSync(emailTemplatePath, 'utf8');

				templateHTML = templateHTML.replace('$otp_code', `${otpPayload.otp_code}`);
				// fs.writeFileSync(emailTemplatePath + '--test.html', templateHTML)

				nodemailer('Three Style', email, 'Verify email address', templateHTML, 'Three Style');

				return response(
					res,
					httpStatus.OK,
					'OTP has been sent',
					{
						email: email,
						emailVerified: false,
						mobileVerified: false,
						_id: createUserResult._id,
					},
					'ERR#VERIFICATION-REQUIRED'
				);
			}

			return response(res, httpStatus.UNAUTHORIZED, 'Invalid Email or Password');
		}

		// DB: Create user
		async function createUser(data) {
			let payload = {
				...data,
				first_name: 'FG',
				last_name: 'USER',
			};

			let createUserResult = await UserRepo.create(payload).catch((error) => response(res, MongoDBErrorParser(error)));

			return createUserResult;
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
