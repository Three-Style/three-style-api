/**
 * @author Brijesh Prajapati
 * @description Create & Login Management
 */

const httpStatus = require('http-status'),
	{ UserRepo, OtpRepo, UserServiceRepo } = require('../../../database'),
	{ jwt, nodeCache, DayJS, logger } = require('../../../services'),
	response = require('../../../utils/response'),
	{ email: emailRegex, mobile: mobileRegex } = require('../../../utils/regex'),
	{ userStatus, otpViaCode, common_environment, CacheConstants, userService } = require('../../../common'),
	{ randomDigit } = require('../../../utils/random'),
	unirest = require('unirest');

const GeneralCache = nodeCache('General');
const bypassAuthorizedMobile = ['9033849692', '6354051487'];
const process = require('process');
const { MongoDBErrorParser, WhatsAppHelper } = require('../../../helpers');

module.exports.createLoginUser = async (req, res) => {
	req.logger.info('Controller > User > Account > Authorization > Create Login User');

	let { mobile, email, service } = req.body;

	try {
		mobile = mobile ? String(mobile).trim() : null;
		email = email ? String(email).trim() : null;
		let findUser;

		if (!mobile && !email) {
			return response(res, httpStatus.BAD_REQUEST, 'Mobile Number or email address is required');
		} else if (email) {
			// Email Validation
			email = String(email).toLowerCase().trim();
			if (!(await emailRegex(email, true))) {
				return response(res, httpStatus.BAD_REQUEST, 'Disposable or temporary email is not supported');
			}
			findUser = await UserRepo.findOne({ email, status: { $nin: [userStatus.deleted] } });
		} else if (mobile) {
			mobile = String(mobile);
			if (!mobileRegex(mobile)) {
				return response(res, httpStatus.BAD_REQUEST, 'Mobile Number is not a valid');
			}

			findUser = await UserRepo.findOne({ mobile, status: { $nin: [userStatus.deleted] } });
		}

		let OTP, generatedOTP;

		if (!findUser) {
			let createUserResult;
			if (mobile) {
				// Mobile Validation
				createUserResult = await createUser({ mobile });
				generatedOTP = await getOTP({ user_id: createUserResult.user_id, via: otpViaCode.mobileVerification });
			}

			if (email) {
				createUserResult = await createUser({ email });
				generatedOTP = await getOTP({ user_id: createUserResult.user_id, via: otpViaCode.emailVerification });
			}

			if (process.env.NODE_ENV === common_environment.development || bypassAuthorizedMobile.includes(mobile)) {
				OTP = generatedOTP.otp_code;
			}

			return response(res, httpStatus.OK, `OTP has been sent ${email ? 'on your email' : 'on your mobile'}`, { OTP });
		} else if (findUser.status != userStatus.active) {
			return response(res, httpStatus.BAD_REQUEST, 'User account has been deactivated.');
		} else if (findUser.lock) {
			return response(res, httpStatus.BAD_REQUEST, 'User account has been locked.');
		}

		generatedOTP = await getOTP({ user_id: findUser._id, via: email ? otpViaCode.emailVerification : otpViaCode.mobileVerification });

		if (process.env.NODE_ENV === common_environment.development || bypassAuthorizedMobile.includes(mobile)) {
			OTP = generatedOTP.otp_code;
		}

		if (service) {
			if (!Object.values(userService).includes(service)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid service type.', { valid_service: Object.values(userService) });
			}

			await UserServiceRepo.findOne({
				service: service,
				user_id: findUser._id,
			}).then((result) => {
				if (!result) {
					UserServiceRepo.create({
						service: service,
						user_id: findUser._id,
						status: true,
						createdBy: findUser._id,
						updatedBy: findUser._id,
					});
				}

				if (result && result.status == false) {
					return response(res, httpStatus.FORBIDDEN, `We have suspended ${service} service on your account`);
				}
			});
		}

		return response(res, httpStatus.OK, `OTP has been sent ${email ? 'on your email' : 'on your mobile'}`, { OTP });

		// DB: Create user
		async function createUser(data) {
			let payload = {
				...data,
				first_name: 'FG',
				last_name: 'USER',
			};

			let createUserResult = await UserRepo.create(payload).catch((error) => response(res, MongoDBErrorParser(error)));

			if (service) {
				UserServiceRepo.create({
					service: service,
					user_id: createUserResult._id,
					status: true,
					createdBy: createUserResult._id,
					updatedBy: createUserResult._id,
				});
			}

			return {
				for: Object.keys(data)[0],
				user_id: createUserResult._id,
			};
		}

		// DB : Check & Get OTP
		async function getOTP(data) {
			let otpResult = await OtpRepo.findOne({ user_id: data.user_id, via: data.via, isActive: true, expiredAt: { $gte: DayJS().add(1, 'hours').toDate() } }).sort({ createdAt: -1 });

			if (otpResult) {
				sendOTP({ via: otpResult.via, otp: otpResult.otp_code });
				return otpResult;
			}

			let payload = {
				user_id: data.user_id,
				otp_code: randomDigit(6),
				via: data.via,
				send_to: email || mobile,
				expiredAt: DayJS().add(24, 'hours').toDate(),
			};

			return OtpRepo.create(payload).then(async (result) => {
				sendOTP({ via: result.via, otp: result.otp_code });
				return result;
			});
		}

		// DB: Send OTP
		async function sendOTP(data) {
			if (process.env.NODE_ENV === common_environment.development) {
				req.logger.verbose("OTP won't be sent in development mode");
			}

			if (data.via == otpViaCode.mobileVerification && process.env.NODE_ENV != common_environment.development) {
				// Send OTP SMS
				const text = encodeURIComponent(`Your OTP is ${data.otp} for Three Style. We highly recommend not share it with others.`);
				unirest
					.post(`http://sms.mobileadz.in/api/push.json?apikey=615b7adfe352e&sender=THREESTYLEF&mobileno=${mobile}&text=${text}`)
					.then((response) => {
						req.logger.info(JSON.stringify(response.body));
					})
					.catch((error) => {
						req.logger.error(error.stack);
					});

				// Send OTP Whatsapp
				let msgBody = {
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: data.otp,
								},
							],
						},
					],
				};

				WhatsAppHelper.sendMessage(mobile, 'otp_send_for_mobile_login', msgBody).catch((error) => logger.error(error.stack));
			}
			// else {

			//     // Send Verification Email
			//     let emailTemplatePath = `${process.cwd()}/src/templates/user-email-otp.html`,
			//         templateHTML = await fs.readFileSync(emailTemplatePath, 'utf8')

			//     templateHTML = templateHTML.replace('$otp_code', `${data.otp}`)
			//         // fs.writeFileSync(emailTemplatePath + '--test.html', templateHTML)

			//     nodemailer('Three Style', email, 'Verify email address', templateHTML, 'Three Style');
			// }
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.verifyUser = async (req, res) => {
	req.logger.info('Controller > User > Account > Authorization > Verify User');

	let { mobile, email, otp } = req.body;

	try {
		let findUserQuery = {
			status: userStatus.active,
			lock: { $ne: true },
		};

		if (email) {
			findUserQuery.email = String(email).toLowerCase().trim();

			if (!(await emailRegex(email, true))) {
				return response(res, httpStatus.BAD_REQUEST, 'Disposable or temporary email is not supported');
			}
		} else if (mobile) {
			findUserQuery.mobile = Number(mobile);

			if (!mobileRegex(mobile)) {
				return response(res, httpStatus.BAD_REQUEST, 'Mobile Number is not a valid');
			}
		}

		if (!otp) {
			return response(res, httpStatus.BAD_REQUEST, 'OTP is required');
		}

		return UserRepo.findOne(findUserQuery)
			.then(async (findUser) => {
				if (!findUser) {
					return response(res, httpStatus.UNAUTHORIZED, 'Invalid User');
				}

				OtpRepo.findOne({
					user_id: findUser._id,
					via: email ? otpViaCode.emailVerification : otpViaCode.mobileVerification,
					isActive: true,
					otp_code: otp,
					send_to: email || mobile,
				})
					.sort({ createdAt: -1 })
					.then(async (otpResult) => {
						if (!otpResult) {
							return response(res, httpStatus.BAD_REQUEST, 'Invalid OTP');
						}

						OtpRepo.findOneAndUpdate({ _id: otpResult._id }, { isActive: false }).catch();
						// Verification Update
						if (otpResult.via == otpViaCode.emailVerification && !findUser.emailVerified) {
							findUser = await UserRepo.findOneAndUpdate({ _id: findUser._id }, { emailVerified: true }, { new: true }).catch();
						} else if (otpResult.via == otpViaCode.mobileVerification && !findUser.mobileVerified) {
							findUser = await UserRepo.findOneAndUpdate({ _id: findUser._id }, { mobileVerified: true }, { new: true }).catch();
						}

						// Send Access Token
						let authorization = jwt.sign({
							id: findUser._id,
							email: findUser.email,
							user_id: findUser.uid,
							authToken: findUser.authToken,
							via: 'AUTHORIZATION',
							createdOn: String(new Date()),
						});

						console.log('UserServiceRepo :- ', UserServiceRepo);

						UserServiceRepo.find({ user_id: findUser._id, status: true }).then((userServices) => {
							userServices = userServices.map((service) => service.service);

							let { emailVerified, mobileVerified, uid, _id, first_name, last_name, profile_image, country_code } = findUser;

							let responsePayload = {
								authorization,
								emailVerified,
								mobileVerified,
								mobile: findUser.mobile,
								email: findUser.email,
								country_code,
								uid,
								_id,
								first_name,
								last_name,
								profile_image,
								active_services: userServices,
							};

							GeneralCache.emit(CacheConstants.UserProfileUpdateEvent, { user_id: findUser._id });
							return response(res, httpStatus.OK, 'success', responsePayload);
						});
					})
					.catch((error) => {
						return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
					});
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
