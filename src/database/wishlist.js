/**
 * @author Brijesh Prajapati
 * @description Wishlist
 */
const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let trim = true;

const wishlist = new mongoose.Schema(
	{
		user_id: { type: ObjectId, ref: 'users' },
		product_id: { type: ObjectId, ref: 'products' },
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('wishlist', wishlist, 'wishlist');
