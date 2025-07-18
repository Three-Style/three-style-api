/**
 * @author Brijesh Prajapati
 * @description Login into Admin Account and Get Authorization Token
 */

const httpStatus = require('http-status'),
	response = require('../../../utils/response');

const Platforms = {
	three_style: 'three_style',
};

module.exports = async (req, res) => {
	const logger = req.logger;
	logger.info('Controller > Admin > Account > Universal Access');

	try {
		let accounts_access = [
			{
				platform: Platforms.three_style,
				access: req.headers.authorization,
			},
		];

		return response(res, httpStatus.OK, 'Accounts access granted', accounts_access);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
