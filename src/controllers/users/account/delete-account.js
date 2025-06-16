/**
 * @author Brijesh Prajapati
 * @description Delete Account
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ userStatus } = require('../../../common'),
	response = require('../../../utils/response');
const { deleteCache } = require('../../cache-manager/cache-manager');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Deactivate ');

	let { userAuthData } = req.headers;
	const UserID = userAuthData.id;

	UserRepo.findByIdAndUpdate(UserID, { status: userStatus.deleted, updatedBy: UserID }, { new: true })
		.then(async (result) => {
			if (result) {
				if (result.status === userStatus.deleted) {
					deleteCache('Authorization', { key: String(UserID) });
					return response(res, httpStatus.OK, 'User account has been deleted successfully');
				}
			}

			return response(res, httpStatus.BAD_REQUEST, 'User account could not deleted successfully');
		})
		.catch((error) => {
			return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
		});
};
