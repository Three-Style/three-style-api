/**
 * @author Brijesh Prajapati
 * @description Hash String using bcrypt JS
 * @module https://www.npmjs.com/package/bcryptjs
 */

const bcryptjs = require('bcryptjs'),
	logger = require('../winston'),
	{ logging, bcryptjs: option } = require('../../config/default.json');
const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'Service:bcryptjs',
	},
});

module.exports.hash = async (string) => {
	if (logging.bcryptjs && option.salt > 10) {
		CustomLogger.warn('Recommend to salt less than 10 to make hash faster');
		CustomLogger.info('Creating Hash');
	}

	return new Promise((resolve, reject) => {
		bcryptjs.genSalt(option.salt, (error, salt) => {
			if (string && !error) {
				bcryptjs.hash(string, salt, (error, hash) => {
					if (hash) {
						if (logging.bcryptjs) {
							CustomLogger.info('Hash: ' + hash);
						}
						resolve(hash);
					} else {
						CustomLogger.error('' + error);
						reject(error);
					}
				});
			} else {
				CustomLogger.info('String is required to create hash');
				reject(error);
			}
		});
	});
};

/**
 * Compares a string with a hash using bcryptjs.
 *
 * @param {string} string - The string to compare.
 * @param {string} hash - The hash to compare against.
 * @returns {boolean} - Returns true if the string matches the hash, false otherwise.
 */
module.exports.compare = (string, hash) => {
	const result = bcryptjs.compareSync(string, hash);
	if (result) {
		logging.bcryptjs ? CustomLogger.info('Hash matched ' + true) : null;
		return true;
	} else {
		logging.bcryptjs ? CustomLogger.info('Hash not matched') : null;
		return false;
	}
};
