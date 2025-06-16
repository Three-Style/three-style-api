/**
 * @author Brijesh Prajapati
 * @description Remove Book
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { BooksRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Book > Remove Book');

	let adminAuthData = req.headers.adminAuthData;
	let { book_id } = req.body;

	if (!book_id || !isValidObjectId(book_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Valid Book id is required');
	}

	book_id = ObjectId.createFromHexString(book_id);

	let payload = {
		updatedBy: adminAuthData.id,
		status: false,
	};

	try {
		let updateResult = await BooksRepo.findOneAndUpdate({ _id: book_id }, payload, { new: true });
		return updateResult ? response(res, httpStatus.OK, 'Book removed successfully') : response(res, httpStatus.NOT_FOUND, 'Incorrect Book ID');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
