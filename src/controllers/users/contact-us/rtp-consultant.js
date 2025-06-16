/**
 * @author Brijesh Prajapati
 * @description Book Consultancy for RTP Program
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { RTPConsultancyRepo } = require('../../../database');
const _ = require('lodash');

module.exports = async (req, res) => {
	req.logger.info('Controllers > Users > Contact Us > RTP Consultancy');

	let { userAuthData } = req.headers;
	let { age, weight, height, file_url, message, source, subject } = req.body;

	let payload = {};

	if (!_.isUndefined(age)) {
		age = parseInt(age);

		if (!_.isInteger(age)) {
			return response(res, httpStatus.BAD_REQUEST, 'Age must be an integer', { age: req.body.age, type: typeof age });
		}

		payload.age = age;
	}

	if (!_.isUndefined(weight)) {
		if (!_.isNumber(weight)) {
			return response(res, httpStatus.BAD_REQUEST, 'Weight must be an number', { weight: req.body.weight, type: typeof weight });
		}

		weight = Number(parseFloat(weight).toFixed(2));

		payload.weight = weight;
	}

	if (!_.isUndefined(height)) {
		if (!_.isNumber(height)) {
			return response(res, httpStatus.BAD_REQUEST, 'Height must be an number', { height: req.body.height, type: typeof height });
		}

		height = Number(parseFloat(height).toFixed(2));

		payload.height = height;
	}

	if (!_.isUndefined(file_url)) {
		payload.file_url = file_url;
	}

	if (!_.isUndefined(message)) {
		payload.message = message;
	}

	if (!_.isUndefined(source)) {
		payload.source = source;
	}

	if (!_.isUndefined(subject)) {
		payload.subject = subject;
	}

	if (Object.keys(payload).length === 0) {
		return response(res, httpStatus.BAD_REQUEST, 'Nothing to submit');
	}

	payload.user_id = userAuthData.id;
	payload.createdBy = userAuthData.id;

	try {
		let result = await RTPConsultancyRepo.create(payload);
		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error.stack);
	}
};
