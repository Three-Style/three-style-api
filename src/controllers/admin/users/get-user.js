/**
 * @author Brijesh Prajapati
 * @description Get Users
 */

const httpStatus = require('http-status');
const { UserRepo, UserServiceRepo } = require('../../../database');
const { userStatus } = require('../../../common');
const response = require('../../../utils/response');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Users > Get User');

	let queryUserID = req.query.id;

	req.query.maxLimit = 1000;

	try {
		var findQuery = {
				status: { $ne: userStatus.deleted },
			},
			serviceFilter = {
				status: true,
			};

		if (queryUserID) {
			if (ObjectId.isValid(queryUserID) == false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid id');
			}

			findQuery._id = ObjectId.createFromHexString(queryUserID);
			serviceFilter.user_id = ObjectId.createFromHexString(queryUserID);
		}

		const SearchFields = ['_id', 'first_name', 'last_name', 'uid', 'email', 'mobile'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query, { maxLimit: req.query.maxLimit });
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await UserRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		return Promise.all([
			UserRepo.find(findQuery, { password: false, authToken: false, fcm_token: false }).skip(pagination.skip).limit(pagination.limit).sort(SortQuery).lean(),
			UserServiceRepo.find(serviceFilter, { createdAt: false, createdBy: false, updatedAt: false, updatedBy: false }, { lean: true }),
		])
			.then(([UserResult, UserServiceResult]) => {
				var result = UserResult.map((user) => {
					user.active_services = UserServiceResult.filter((service) => service.user_id.equals(user._id));
					return user;
				});

				return response(res, httpStatus.OK, 'success', result, undefined, {
					pagination: PaginationInfo,
					search_fields: SearchFields,
				});
			})
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
