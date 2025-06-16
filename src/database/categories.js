/**
 * @author Brijesh Prajapati
 * @description Categories
 */
const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const categories = new mongoose.Schema(
	{
		display_image: { type: String },
		name: { type: String, required },
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
		status: { type: Boolean, required, trim, default: true },
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('categories', categories, 'categories');
