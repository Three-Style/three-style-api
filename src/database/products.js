/**
 * @author Brijesh Prajapati
 * @description Product
 */
const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let trim = true;

const products = new mongoose.Schema(
	{
		display_image: [{ type: String }],
		name: { type: String },
		price: { type: Number },
		discount_price: { type: Number },
		discount_percentage: { type: Number },
		description: { type: String },
		categories: { type: ObjectId, ref: 'categories' },
		fabric: { type: ObjectId, ref: 'fabric' },
		sub_categories: { type: ObjectId, ref: 'sub_categories' },
		stock: { type: Number },
		sku_no: { type: String },
		color: {
			color_name: { type: String },
			color_code: { type: String },
		},
		tags: [{ type: String }],
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
		status: { type: Boolean, trim, default: true },
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('products', products, 'products');
