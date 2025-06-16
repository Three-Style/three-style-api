/**
 * @author Brijesh Prajapati
 * @description Handle Employee form
 * @param {String} name
 * @param {String} location
 * @param {String} job_post
 * @param {String} type
 * @param {String} work_time
 * @param {Binary} expected_salary
 * @param {String} mobile
 * @param {String} email
 * @param {String} skill
 * @param {String} experience
 * @param {String} gender
 * @param {String} age
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { EmployeeApplicationRepo } = require('../../../database');

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Employee > Apply');

	const { name, email, mobile, expected_salary, work_time, type, job_post, location } = req.body;
	const { skill, experience, gender, age } = req.body;

	// Validate
	if (!name || !email || !mobile || !expected_salary || !work_time || !type) {
		return response(res, httpStatus.BAD_REQUEST, 'Please fill all the required fields');
	}

	let payload = {
		name,
		email,
		mobile,
		expected_salary,
		work_time,
		type,
		job_post,
		location,
	};

	skill ? (payload.skill = String(skill)) : null;
	experience ? (payload.experience = String(experience)) : null;
	gender ? (payload.gender = String(gender)) : null;
	age ? (payload.age = String(age)) : null;

	try {
		EmployeeApplicationRepo.create(payload).catch();

		return response(res, httpStatus.CREATED, 'Success');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
