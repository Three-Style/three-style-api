const { Joi } = require('../services');
const { isValidObjectId } = require('./mongodb-query-builder.helpers');

function JoiObjectIdValidator(value, helpers) {
	if (isValidObjectId(value)) {
		return value;
	} else {
		return helpers.error('string.objectId');
	}
}
module.exports.JoiObjectIdValidator = JoiObjectIdValidator;

module.exports.JoiObjectIdSchema = Joi.custom(JoiObjectIdValidator, 'ObjectId');

const JoiSearchSchema = Joi.object({
	search: Joi.string().trim().optional().allow('').default(null),
});
module.exports.JoiSearchSchema = JoiSearchSchema;

const JoiPaginationSchema = Joi.object({
	page: Joi.number().integer().min(1).optional(),
	limit: Joi.number().integer().min(1).default(25).optional(),
	skip: Joi.number().integer().min(0).optional(),
}).without('page', 'skip');
module.exports.JoiPaginationSchema = JoiPaginationSchema;

const JoiSortSchema = Joi.object({}).keys({
	sort: Joi.string().optional(),
	sortOrder: Joi.string().valid('asc', 'desc').optional(),
});
module.exports.JoiSortSchema = JoiSortSchema;
