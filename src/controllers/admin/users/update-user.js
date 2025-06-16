/**
 * @author Brijesh Prajapati
 * @description Update User Profile
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ isEmpty, isUndefined, isBoolean, isString } = require('lodash'),
	response = require('../../../utils/response');
const moment = require('moment');
const { ObjectId } = require('mongoose').Types;
const { UserProfileUpdateEvent } = require('../../../common/cache_key');
const { isValidObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const { Joi } = require('../../../services');
const { JoiObjectIdSchema } = require('../../../helpers/joi-custom-validators.helpers');
const GeneralCache = require('../../../services/node-cache')('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Users > Update User');

	const { adminAuthData } = req.headers;

	try {
		const BodySchema = Joi.object({}).keys({
			id: JoiObjectIdSchema.required(),
			first_name: Joi.string().optional(),
			last_name: Joi.string().optional(),
			alumni: Joi.boolean().optional(),
			address_line_1: Joi.string().optional(),
			address_line_2: Joi.string().optional(),
			city: Joi.string().optional(),
			state: Joi.string().optional(),
			country: Joi.string().optional(),
			pin_code: Joi.string().optional(),
			birth_date: Joi.string().optional(),
			notes: Joi.string().optional(),
			document: Joi.array()
				.items(
					Joi.object({
						_id: JoiObjectIdSchema.optional(),
						file: Joi.string()
							.uri({
								relativeOnly: true,
							})
							.required(),
						document_type: Joi.string().valid('identity').trim().required(),
						label: Joi.string().optional(),
					})
				)
				.optional(),
		});

		const { error, value } = BodySchema.validate(req.body);

		if (error) return response(res, error);

		const { id, first_name, last_name, alumni, address_line_1, address_line_2, city, state, country, pin_code, birth_date, notes, document } = value;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Id');
		}

		let payload = {
			$set: {
				updatedBy: adminAuthData.id,
			},
		};

		if (isEmpty(first_name) || isEmpty(last_name)) {
			return response(res, httpStatus.BAD_REQUEST, 'First name & last name is required');
		}

		payload.$set.first_name = String(first_name);
		payload.$set.last_name = String(last_name);
		payload.$set.notes = String(notes);

		if (!isUndefined(alumni)) {
			if (isBoolean(alumni)) {
				payload.$set.alumni = alumni;
			} else {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid alumni value. It should be boolean');
			}
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

		if (!isUndefined(birth_date)) {
			if (moment(new Date(birth_date)).isValid()) {
				payload.$set.birth_date = moment(new Date(birth_date)).format('YYYY/MM/DD');
			} else {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid birth date. It should be in YYYY/MM/DD format');
			}
		}

		if (!isUndefined(document)) {
			if (Array.isArray(document) && document.length > 0) {
				payload.$set.document = payload.$set.document || [];
				document.forEach((doc) => {
					if (isString(doc.file) && doc.file && isString(doc.document_type) && doc.document_type && isString(doc.label) && doc.label) {
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

		// DB: Find & Update
		let result = await UserRepo.findByIdAndUpdate({ _id: id }, payload, { new: true }).select('-password -authToken -fcm_token');

		if (!result) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Id');
		}

		GeneralCache.emit(UserProfileUpdateEvent, { user_id: result._id });

		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
