/**
 * @author Brijesh Prajapati
 * @description Product Review
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const product_like = new mongoose.Schema(
	{
		product_id: { type: ObjectId, required, trim, ref: 'products' },
		user_id: { type: ObjectId, required, ref: 'users' },
		isLike: { type: Boolean, default: true },
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
		status: { type: Boolean, default: true },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('product_like', product_like, 'product_like');
