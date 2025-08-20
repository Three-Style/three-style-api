/**
 * @author Brijesh Prajapati
 * @description Product with Variants
 */
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const variantSchema = new mongoose.Schema(
	{
		color_name: { type: String, trim: true }, // e.g. "Red"
		color_code: { type: String, trim: true }, // e.g. "#FF0000"
		size: { type: String, trim: true }, // e.g. "M", "L", "XL" (optional, keep null if not needed)
		images: [{ type: String }], // product photos for this variant
		stock: { type: Number, default: 0 },
		sku_no: { type: String, trim: true },
	},
	{ _id: true } // keep _id so each variant can be uniquely identified
);

const productSchema = new mongoose.Schema(
	{
		name: { type: String, trim: true },
		display_image: [{ type: String }], // main product display image(s)
		price: { type: Number },
		original_price: { type: Number },
		discount_percentage: { type: Number },
		short_description: { type: String },
		description: { type: String },

		categories: { type: ObjectId, ref: 'categories' },
		sub_categories: { type: ObjectId, ref: 'sub_categories' },
		fabric: { type: ObjectId, ref: 'fabric' },

		tags: [{ type: String }],

		variants: [variantSchema], // array of variants (colors, sizes, etc.)

		createdBy: { type: ObjectId, trim: true },
		updatedBy: { type: ObjectId, trim: true },
		status: { type: Boolean, default: true },
		is_deleted: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('products', productSchema, 'products');
