const { pick } = require('lodash');
const { deleteCache } = require('./cache-manager');
const response = require('../../utils/response');
const httpStatus = require('http-status');

const GeneralCache = require('../../services/node-cache')('General');
const CacheKeysConstant = require('../../common/cache_key');
require('./cache-listeners');

module.exports.DeleteGeneralCache = (req, res) => {
	const QueryOptions = pick(req.query, ['keys', 'prefix']);

	try {
		let result = deleteCache(GeneralCache, QueryOptions);

		if (result) {
			return response(
				res,
				httpStatus.OK,
				'Cache deleted successfully',
				{
					common_keys: Object.keys(CacheKeysConstant),
				},
				undefined,
				{
					query_options: ['keys', 'prefix'],
					prefix: 'It will delete all cache with prefix. Example: @getStudentProject',
					keys: 'It will delete specific cache key if exist. Example: @getStudentProject:1',
				}
			);
		}

		return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something went wrong');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
