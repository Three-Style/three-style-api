/**
 * @author Brijesh Prajapati
 * @description Update Book Record
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');

const { BooksRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Book > Update Book');

	let adminAuthData = req.headers.adminAuthData;
	let { book_id, book_title, description, amount, cover_image } = req.body;

	if (!book_id || !isValidObjectId(book_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Valid Book id is required');
	}

	book_id = ObjectId.createFromHexString(book_id);

	let payload = {
		updatedBy: adminAuthData.id,
	};

	if (book_title) {
		book_title = String(book_title).trim();
		payload.book_title = book_title;
	}

	if (description) {
		description = String(description).trim();
		payload.description = description;
	}

	if (amount) {
		amount = Number(amount);

		if (isNaN(amount) || amount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Amount must be a number and greater than 0');
		}

		payload.amount = amount;
	}

	if (cover_image) {
		payload.cover_image = String(cover_image);
	}

	try {
		let updateResult = await BooksRepo.findOneAndUpdate({ _id: book_id }, payload, { new: true });
		return updateResult ? response(res, httpStatus.OK, 'Book created successfully', updateResult) : response(res, httpStatus.NOT_FOUND, 'Incorrect Book ID');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
