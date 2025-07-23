/**
 * @author Brijesh Prajapati
 * @description Get statistics for student user
 */

const httpStatus = require('http-status');
const { nodeCache } = require('../../../services');
const response = require('../../../utils/response');
const { DashboardStudentStatsPrefix } = require('../../../common/cache_key');
const { getCacheMetadata } = require('../../cache-manager/cache-manager');
const GeneralCache = nodeCache('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Dashboard > Get Student Stats');
	res.set('Deprecation', true);
	res.set('Warning', 'This endpoint is deprecated and will be removed in future versions. Please use Insights API (/admin/v1/insights/three-style).');

	const CacheKey = DashboardStudentStatsPrefix,
		CacheTTL = 60 * 5;

	if (GeneralCache.has(CacheKey)) {
		return response(res, httpStatus.OK, 'success', GeneralCache.get(CacheKey), undefined, {
			cache: getCacheMetadata({
				cacheName: 'General',
				key: CacheKey,
				prefix: DashboardStudentStatsPrefix,
			}),
		});
	}

	const result = {
		counts: {},
	};

	GeneralCache.set(CacheKey, result, CacheTTL);
	return response(res, httpStatus.OK, 'success', result);
};
