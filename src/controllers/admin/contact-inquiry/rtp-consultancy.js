/**
 * @author Brijesh Prajapati
 * @description Consultancy Bookings for RTP Programs
 */

const httpStatus = require('http-status'),
	{ RTPConsultancyRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports.getBookings = async (req, res) => {
	req.logger.info('Admin > Contact Inquiry > Get Inquiry');

	let bookingID = req.query.booking_id;
	let findQuery = {
		status: true,
	};

	if (bookingID) {
		findQuery._id = ObjectId.createFromHexString(bookingID);
	}

	try {
		const pagination = PaginationHelper.getPagination(req.query);
		const CountDocs = await RTPConsultancyRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);

		// DB: Find
		return RTPConsultancyRepo.find(findQuery)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(SortQuery)
			.populate('user', {
				first_name: true,
				last_name: true,
				email: true,
				mobile: true,
				mobileVerified: true,
				emailVerified: true,
			})
			.then((result) => {
				return response(res, httpStatus.OK, 'success', result, undefined, {
					pagination: PaginationInfo,
				});
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
