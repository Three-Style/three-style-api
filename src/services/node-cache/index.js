const NodeCache = require('node-cache');

/**
 * @typedef {'Exam'|'Authorization'|'General'} CacheName
 */

const ExamCache = new NodeCache({
	stdTTL: 60,
	useClones: true,
	deleteOnExpire: true,
});

const AuthorizationCache = new NodeCache({
	stdTTL: 60,
	useClones: true,
	deleteOnExpire: true,
});

const GeneralCache = new NodeCache({
	stdTTL: 60,
	useClones: true,
	deleteOnExpire: true,
});

/**
 * @description Node Cache Service
 * @param {('Exam'|'Authorization'|'General')} CacheName name of cache instance
 * @returns {NodeCache}
 */
module.exports = (CacheName) => {
	switch (CacheName) {
		case 'Exam':
			return ExamCache;
		case 'Authorization':
			return AuthorizationCache;
		case 'General':
			return GeneralCache;
		default:
			return null;
	}
};
