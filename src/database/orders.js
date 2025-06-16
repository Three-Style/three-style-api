/**
 * @author Brijesh Prajapati
 * @description Transactional Information for Users
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId,
	{ userType, purchaseMode, paymentGateway, orderStatus, itemType } = require('../common'),
	{ randomDigit } = require('../utils/random');
const { PaymentCurrency } = require('../common/razorpay-webhook');
const required = true,
	trim = true;
const InvoiceSchema = require('./invoice');
const UserSchema = require('./users');
const BooksSchema = require('./books');
const EBooksSchema = require('./e-books');
const ProductSchema = require('./products');
const { logger } = require('../services');

const orders = new mongoose.Schema(
	{
		receipt_id: { type: String, required, unique: true, default: () => randomDigit() },
		user_id: { type: ObjectId, required, ref: UserSchema.collection.collectionName },
		purchase_mode: { type: String, required, enum: Object.values(purchaseMode) },
		gateway: { type: String, enum: Object.values(paymentGateway) },
		gateway_transaction_id: String, // payment_id or transaction_id
		gateway_order_id: { type: String, trim },
		gateway_signature: String,
		amount: Number,
		payment_breakdowns: {
			paid_amount: Number,
		},
		currency: { type: String, required, default: PaymentCurrency.INR, enum: Object.values(PaymentCurrency) },
		order_item_id: { type: ObjectId },
		order_item_type: { type: String, required, enum: Object.values(itemType) },
		multiple_items: [
			{
				item_id: { type: ObjectId, required },
				item_type: {
					type: String,
					required,
					enum: [itemType.fitness_course, itemType.books, itemType.meals],
				},
				quantity: { type: Number, required },
				amount: { type: Number, required },
				notes: Object,
			},
		],
		createdBy: { type: ObjectId, required, trim },
		updatedBy: { type: ObjectId, required, trim },
		user_type: { type: String, required, trim, enum: Object.values(userType), default: userType.user },
		notes: { type: Object }, // For Any Reference or Note
		status: { type: String, required, trim, enum: Object.values(orderStatus), default: orderStatus.pending },
		invoice_id: { type: ObjectId, ref: InvoiceSchema.collection.collectionName },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

orders.virtual('user_info', {
	ref: UserSchema.collection.collectionName,
	localField: 'user_id',
	foreignField: '_id',
	justOne: true,
});

orders.virtual('books', {
	ref: BooksSchema.collection.collectionName,
	localField: 'order_item_id',
	foreignField: '_id',
	justOne: true,
});

orders.virtual('ebook', {
	ref: EBooksSchema.collection.collectionName,
	localField: 'order_item_id',
	foreignField: '_id',
	justOne: true,
});

orders.virtual('product', {
	ref: ProductSchema.collection.collectionName,
	localField: 'order_item_id',
	foreignField: '_id',
	justOne: true,
});

// Order_ID is attached with many different collections user_fitness_courses, user_fitness_plan, user_books, user_digital_plans, user_meal_product
orders.virtual('fitness_course_subscription', {
	ref: 'user_fitness_course',
	localField: '_id',
	foreignField: 'order_id',
});

orders.virtual('fitness_plan_subscription', {
	ref: 'user_fitness_plan',
	localField: '_id',
	foreignField: 'order_id',
	justOne: true,
});

orders.virtual('book_subscription', {
	ref: 'user_books',
	localField: '_id',
	foreignField: 'order_id',
	justOne: true,
});

orders.virtual('ebook_purchase_info', {
	ref: 'user_ebooks',
	localField: '_id',
	foreignField: 'order_id',
	justOne: true,
});

orders.virtual('digital_plan_subscription', {
	ref: 'user_digital_plans',
	localField: '_id',
	foreignField: 'order_id',
	justOne: true,
});

orders.virtual('user_meal_product', {
	ref: 'user_meal_product',
	localField: '_id',
	foreignField: 'order_id',
	justOne: true,
});

orders.methods.populateItems = async function () {
	// Ensure multiple_items exists and is an array
	if (!this.multiple_items || !Array.isArray(this.multiple_items)) {
		return this.toObject(); // Return the original order if there are no items
	}

	const populatedItems = await Promise.all(
		this.multiple_items.map(async (item) => {
			let populatedItem = null;

			// Determine which model to query based on item_type
			switch (item.item_type) {
				case itemType.books:
					populatedItem = await BooksSchema.findById(item.item_id).select('book_title amount');
					break;
				case itemType.ebooks:
					populatedItem = await EBooksSchema.findById(item.item_id).select('ebook_title amount');
					break;
				case itemType.meals:
					populatedItem = await ProductSchema.findById(item.item_id).select('name price display_image');
					break;
				default:
					populatedItem = null; // Handle the case for an unknown item type
			}

			// Ensure the populated item is not null
			if (!populatedItem) {
				logger.warn(`[orders.methods.populateItems] No item found for ${item.item_type} with ID ${item.item_id} in order ${this._id}`);
			}

			return populatedItem;
		})
	);

	// Return the order with the populated multiple_items
	return {
		...this.toObject(),
		[itemType.item_cart]: populatedItems,
	};
};

module.exports = mongoose.model('orders', orders, 'orders');
