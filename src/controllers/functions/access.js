const { AdminRepo } = require('../../database');
const { JoiObjectIdValidator, JoiSearchSchema, JoiPaginationSchema, JoiSortSchema } = require('../../helpers/joi-custom-validators.helpers');
const { Joi } = require('../../services');
const { ObjectId } = require('mongoose').Types;

/**
 * @author Brijesh Prajapati
 * @description This function is used to get accessible employees for an authorized Employee
 * - This function currently supports only for Admin Employee
 * @param {string} AuthorizedEmployeeID - Authorized Employee ID
 * @param {object} params - Request parameters
 * @param {ObjectId|ObjectId[]} params.employees
 * @param {number} params.skip
 * @param {number} params.limit // Default 10
 * @param {number} params.page
 * @param {string} params.sortBy
 * @param {string} params.sortOrder
 * @param {object} params.project
 * @returns {Promise<Array>} - Array of accessible employees
 */
async function getAccessibleEmployees(AuthorizedEmployeeID, params = {}) {
	if (!AuthorizedEmployeeID || ObjectId.isValid(AuthorizedEmployeeID) === false) {
		throw new Error('Invalid Authorized Employee ID');
	}

	const paramsSchema = Joi.object({
		employees: Joi.alternatives(
			Joi.custom(JoiObjectIdValidator).custom((v) => [v]),
			Joi.array().items(Joi.custom(JoiObjectIdValidator))
		),
		project: Joi.object().default({
			password: false,
			authToken: false,
			fcm_token: false,
			platform: false,
		}),
	})
		.concat(JoiSearchSchema)
		.concat(JoiPaginationSchema)
		.concat(JoiSortSchema);

	let { error, value } = paramsSchema.validate(params, { stripUnknown: true });

	if (error) throw error;
	else params = value;

	const AuthorizedEmployee = await AdminRepo.findById(new ObjectId(AuthorizedEmployeeID));

	return [AuthorizedEmployee];
}

module.exports.getAccessibleEmployees = getAccessibleEmployees;
