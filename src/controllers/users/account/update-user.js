/**
 * @author Brijesh Prajapati
 * @description Update Client User
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	response = require('../../../utils/response'),
	{ mobile: mobileRegex, email: emailRegex } = require('../../../utils/regex');
const moment = require('moment');
const { UserProfileUpdateEvent } = require('../../../common/cache_key');
const { isUndefined, isString } = require('lodash');
const { isValidObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const GeneralCache = require('../../../services/node-cache')('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Update Profile');

	let { first_name, last_name, mobile, profile_image, email, birth_date, country, address_line_1, address_line_2, city, state, pin_code, fcm_token, document } = req.body;
	let { userAuthData } = req.headers,
		updatedBy = userAuthData.id;

	try {
		let payload = {
			updatedBy,
			$set: {},
		};

		let userResult = await UserRepo.findOne({ _id: userAuthData.id });

		// Email & Mobile Validation
		if (mobile && userResult.mobile != mobile) {
			if (!mobileRegex(mobile)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid mobile number. Make sure mobile number must be 10 digit long.');
			}

			payload.mobile = String(mobile);
			payload.mobileVerified = false;
		}

		if (email && userResult.email != email) {
			email = String(email).toLowerCase().trim();

			if ((await emailRegex(email, true)) == false) {
				return response(res, httpStatus.FORBIDDEN, 'Invalid Email address. Make sure email address is not temporary or disposable.');
			}

			payload.email = String(email);
			payload.emailVerified = false;
		}

		if (!isUndefined(document)) {
			if (!Array.isArray(document)) {
				return response(res, httpStatus.BAD_REQUEST, 'Valid document must be array', {
					example: [
						{
							document_type: 'identity',
							file: 'development/identity-card.jpeg',
							label: 'optional',
						},
					],
				});
			}

			let findInvalidItems = document.filter((item) => {
				if (!item || isUndefined(item.document_type) || isUndefined(item.file) || !isString(item.document_type) || !isString(item.file)) return true;

				return false;
			});

			if (findInvalidItems.length) {
				return response(res, httpStatus.BAD_REQUEST, 'Valid Identity is required', {
					example: [
						{
							document_type: 'identity',
							file: 'development/identity-card.jpeg',
							label: 'optional',
						},
					],
				});
			}

			if (Array.isArray(document) && document.length > 0) {
				payload.$set.document = [];
				document.forEach((doc) => {
					if ((isString(doc.file) && doc.file && isString(doc.document_type) && doc.document_type) || isString(doc.label) || doc.label) {
						if (doc._id && isValidObjectId(doc._id)) {
							payload.$set.document.push({
								_id: doc._id,
								file: doc.file,
								document_type: doc.document_type,
								label: doc.label || 'Other',
							});
						} else {
							payload.$set.document.push({
								file: doc.file,
								document_type: doc.document_type,
								label: doc.label || 'Other',
							});
						}
					}
				});
			} else {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid document. It should be an array of object');
			}
		}

		// Optional Field
		first_name ? (payload.first_name = String(first_name)) : null;
		last_name ? (payload.last_name = String(last_name)) : null;
		profile_image ? (payload.profile_image = String(profile_image)) : null;
		document ? (payload.document = document) : null;

		if (birth_date) {
			birth_date = new Date(birth_date);
			if (!moment(birth_date).isValid()) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid birth date');
			}

			if (moment(birth_date).isAfter(moment().subtract(13, 'years'))) {
				return response(res, httpStatus.BAD_REQUEST, 'You must be at least 13 years old to register.');
			}

			payload.birth_date = moment(birth_date).format('YYYY-MM-DD');
		}

		if (!isUndefined(address_line_1)) {
			payload.$set['address.address_line_1'] = String(address_line_1);
		}

		if (!isUndefined(address_line_2)) {
			payload.$set['address.address_line_2'] = String(address_line_2);
		}

		if (!isUndefined(city)) {
			payload.$set['address.city'] = String(city);
		}

		if (!isUndefined(state)) {
			payload.$set['address.state'] = String(state);
		}

		if (!isUndefined(country)) {
			payload.$set['address.country'] = String(country);
		}

		if (!isUndefined(pin_code)) {
			payload.$set['address.pin_code'] = String(pin_code);
		}

		if (!isUndefined(fcm_token)) {
			payload.fcm_token = String(fcm_token);
		}

		// DB: Update
		UserRepo.findByIdAndUpdate(userAuthData.id, payload, { new: true })
			.select('-password -authToken -fcm_token')
			.then((result) => {
				GeneralCache.emit(UserProfileUpdateEvent, { user_id: userAuthData.id });
				return result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.FORBIDDEN, 'Incorrect user ID');
			});
	} catch (error) {
		req.logger.error('error');
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
