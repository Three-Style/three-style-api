/**
 * @author Brijesh Prajapati
 * @description Product Cart
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const product_cart = new mongoose.Schema(
	{
		product_id: { type: ObjectId, required, trim },
		user_id: { type: ObjectId, required, ref: 'users' },
		quantity: { type: Number, default: true },
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
		status: { type: Boolean, trim, default: true },
		isPurchased: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('product_cart', product_cart, 'product_cart');
