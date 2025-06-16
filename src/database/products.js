/**
 * @author Brijesh Prajapati
 * @description Product
 */
const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const products = new mongoose.Schema(
	{
		display_image: [{ type: String }],
		name: { type: String, required },
		price: { type: Number, required },
		discount_price: { type: Number },
		discount_percentage: { type: Number },
		description: { type: String, required },
		categories: { type: String, required },
		fabric: { type: String, required },
		sub_categories: { type: String, required },
		stock: { type: Number, required },
		sku_no: { type: Number, required },
		color: { type: String, required },
		tags: [{ type: String, required }],
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
		status: { type: Boolean, required, trim, default: true },
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('products', products, 'products');
