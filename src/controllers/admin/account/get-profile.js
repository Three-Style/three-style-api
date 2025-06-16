/**
 * @author Brijesh Prajapati
 * @description Get All Admin Information
 */

const { getLoggerInstance } = require('../../../utils');
const getAdminUserController = require('../admin-user/get-admin');

module.exports = async (req, res) => {
	const logger = getLoggerInstance(req);
	logger.info('Controller > Admin > Account > Get Profile');

	let { adminAuthData } = req.headers;

	req.query.adminID = adminAuthData.id;
	return getAdminUserController(req, res);
};
