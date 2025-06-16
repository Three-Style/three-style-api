/**
 * @author Brijesh Prajapati
 * @description Get Admin Profile Information
 */

const httpStatus = require('http-status'),
	{ ContactInquiryRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');
const { MongoDBQueryBuilder, PaginationHelper } = require('../../../helpers');
const { isUndefined } = require('lodash');
const { ObjectId } = require('mongoose').Types;

module.exports.getInquiry = async (req, res) => {
	req.logger.info('Admin > Contact Inquiry > Get Inquiry');

	const { inquiry_id, unread_only } = req.query;

	try {
		let findQuery = { status: true };

		if (inquiry_id && !isValidObjectId(inquiry_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid inquiry_id');
		}

		inquiry_id && (findQuery._id = ObjectId.createFromHexString(inquiry_id));

		if (!isUndefined(unread_only) && unread_only == 'true') {
			findQuery.read_receipt = false;
		}

		if (!isUndefined(req.query.subject)) {
			findQuery.subject = {
				$regex: req.query.subject,
				$options: 'i',
			};
		}

		const SearchFields = ['_id', 'subject', 'name', 'email', 'mobile', 'message'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await ContactInquiryRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		// DB: Find
		return ContactInquiryRepo.find(findQuery)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(SortQuery)
			.lean()
			.then((result) => {
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

module.exports.readReceipt = async (req, res) => {
	req.logger.info('Admin > Contact Inquiry > Mark As Read');

	const { inquiry_id, read_receipt = true, additional_note } = req.body;
	const { adminAuthData } = req.headers;

	if (!isValidObjectId(inquiry_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid inquiry_id');
	}

	if (typeof read_receipt != 'boolean') {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid read value. It must be boolean');
	}

	let payload = {
		read_receipt,
		updatedBy: adminAuthData.id,
	};

	if (additional_note) {
		payload.additional_note = String(additional_note).trim();
	}

	ContactInquiryRepo.updateOne({ _id: inquiry_id }, payload).catch();

	return response(res, httpStatus.OK, 'success');
};
