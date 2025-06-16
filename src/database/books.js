/**
 * @author Brijesh Prajapati
 * @description Records of Books
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const books = new mongoose.Schema(
	{
		book_title: { type: String, required, trim },
		description: { type: String, trim },
		cover_image: { type: String, trim },
		amount: { type: Number, required, trim },
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
		status: { type: Boolean, required, default: true },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('books', books, 'books');
