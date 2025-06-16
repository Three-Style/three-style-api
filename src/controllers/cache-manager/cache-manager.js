const { isString } = require('lodash');
const NodeCache = require('node-cache');
const nodeCache = require('../../services/node-cache');
const { logger, Joi, DayJS } = require('../../services');
/**
 *
 * @param {import('../../services/node-cache').CacheName} NodeCacheObject
 * @param {Object} options
 * @param {String | String[]} options.keys
 * @param {String | String[]} options.prefix
 * @returns
 */
function deleteCache(NodeCacheObject, options = {}) {
	logger.verbose('deleteCache', { options });
	let { keys, prefix } = options;

	if (isString(NodeCacheObject)) {
		NodeCacheObject = nodeCache(NodeCacheObject);
	}

	if (NodeCacheObject instanceof NodeCache === false) {
		throw new Error('NodeCacheObject is required');
	}

	if (keys) {
		if (!Array.isArray(keys)) {
			keys = [keys];
		}

		keys.forEach((key) => NodeCacheObject.del(String(key)));
	}

	if (prefix) {
		if (!Array.isArray(prefix)) {
			prefix = [prefix];
		}

		prefix.forEach((prefix) => {
			NodeCacheObject.keys().forEach((key) => (key.startsWith(String(prefix)) ? NodeCacheObject.del(key) : null));
		});
	}

	if (!keys && !prefix) {
		NodeCacheObject.flushAll();
	}

	return true;
}

module.exports.deleteCache = deleteCache;

/**
 *
 * @param {object} params
 * @param {import('../../services/node-cache').CacheName} params.cacheName
 * @param {String} params.key
 * @param {String} params.prefix
 * @returns {{
 * cachePrefix:String,
 * cache:String,
 * cacheExpireAt:Date,
 * cacheExpiresIn:String,
 * cacheTTL:Number}}
 */
module.exports.getCacheMetadata = (params) => {
	const ParamsSchema = Joi.object({
		cacheName: Joi.string().required().valid('Exam', 'Authorization', 'General'),
		prefix: Joi.string().required(),
		key: Joi.string().required(),
	});

	const { error, value } = ParamsSchema.validate(params);

	if (error) throw new Error(error.message);
	params = value;

	const { cacheName, key, prefix } = params;

	const CacheObject = nodeCache(cacheName);

	const cacheTTL = CacheObject.getTtl(key);
	return {
		cache: cacheName,
		cachePrefix: prefix,
		cacheExpireAt: new Date(cacheTTL),
		cacheExpiresIn: DayJS(cacheTTL).fromNow(),
		cacheTTL: cacheTTL,
		cacheExpiresInMS: DayJS(cacheTTL).diff(DayJS(), 'seconds'),
	};
};
