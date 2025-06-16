/**
 * @author Brijesh Prajapati
 * @description Transactional Information for Users
 */

const mongoose = require('mongoose');
const UserRepo = require('./users');
const ProductSchema = require('./products');
const BookSchema = require('./books');
const { itemType, userStatus } = require('../common');
const { logger } = require('../services');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const CollectionName = 'order_carts';

const itemSchema = new Schema(
	{
		item_id: { type: ObjectId, required: true },
		item_type: { type: String, required: true, enum: Object.values(itemType) },
		quantity: { type: Number, required: true },
		notes: { type: Object }, // To store any additional information related to the item.
	},
	{
		timestamps: true,
	}
);

const schema = new Schema(
	{
		user_id: { type: ObjectId, required: true, ref: UserRepo.collection.collectionName },
		items: [itemSchema],
		item_type: { type: String, required: true, enum: Object.values(itemType) }, // As of now, cart supports only one type of item at a time.
		is_purchased: { type: Boolean, required: true, default: false }, // User may purchase the cart, in that case, it will be marked as purchased and active false.
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

schema.index({ user_id: 1 });

schema.virtual('user', {
	ref: UserRepo.collection.collectionName,
	localField: 'user_id',
	foreignField: '_id',
	justOne: true,
	options: {
		projection: {
			first_name: true,
			last_name: true,
			email: true,
			mobile: true,
			profile_image: true,
			country_code: true,
			status: true,
		},
	},
	match: {
		status: { $ne: userStatus.deleted },
	},
});

schema.methods.populateItems = async function () {
	const populatedItems = await Promise.all(
		this.items.map(async (item) => {
			let populatedItem = null;

			// Determine which model to query based on item_type
			switch (item.item_type) {
				case itemType.meals:
					populatedItem = await ProductSchema.findById(item.item_id).select('name price display_image');
					break;
				case itemType.pure_go_meals:
					populatedItem = await ProductSchema.findById(item.item_id).select('name price display_image');
					break;
				case itemType.books:
					populatedItem = await BookSchema.findById(item.item_id).select('book_title amount cover_image');
					break;
				// Add additional cases for other item types if necessary
				default:
					populatedItem = false; // Handle the case for an unknown item type
			}

			// Ensure the populated item is not null
			if (!populatedItem && populatedItem !== false) {
				logger.warn(`[${CollectionName}.methods.populateItems]: No item found for ${item.item_type} with ID ${item.item_id} for order ID ${this._id}`);
			}

			return populatedItem;
		})
	);

	// Set the populated items in the document under `items_details`
	this._doc.items_details = populatedItems.filter((item) => item !== null);
	return this;
};

module.exports = mongoose.model(CollectionName, schema, CollectionName);
