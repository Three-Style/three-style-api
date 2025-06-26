/**
 * @author Brijesh Prajapati
 * @description User FG Meals Product
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;
const ProductsRepo = require('./products');
const { shipmentStatus } = require('../common');

let required = true,
	trim = true;

const user_meal_product = new mongoose.Schema(
	{
		product_id: { type: ObjectId, ref: 'products' },
		products: [
			{
				product_id: { type: ObjectId, required, ref: ProductsRepo },
				variation_id: { type: ObjectId },
			},
		],
		user_id: { type: ObjectId, required, trim, ref: 'users' },
		order_id: { type: ObjectId, required, trim, ref: 'orders' },
		status: { type: Boolean, default: true, required },
		quantity: { type: Number },
		tracking: [
			{
				shipment_status: { type: String, required, enum: Object.values(shipmentStatus) },
				updatedAt: { type: Date, default: () => new Date() },
				updatedBy: { type: ObjectId, ref: 'admins' },
				status: { type: Boolean, default: true, required },
			},
		],
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('user_meal_product', user_meal_product, 'user_meal_product');
