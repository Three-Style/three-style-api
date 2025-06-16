/**
 * @author Brijesh Prajapati
 * @description Common Invoice Schema. It may be extended to order invoice, user invoice, etc.
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;
const UserModel = require('./users');

let required = true,
	trim = true;

const MongooseSchema = new mongoose.Schema(
	{
		user_id: { type: ObjectId, ref: UserModel.collection.collectionName },
		invoice_number: { type: Number, required },
		invoice_category: { type: String, required, trim },
		date: { type: Date, required, trim },
		name: { type: String, required, trim },
		email: { type: String, trim, lowercase: true },
		mobile: { type: String, trim },
		branch_name: { type: String, required, trim },
		billing_address: {
			address_line_1: { type: String, trim },
			city: { type: String, trim },
			state: { type: String, trim },
			pin_code: { type: String, trim },
		},
		items: [
			{
				item_name: { type: String, required, trim },
				amount: { type: Number, trim },
				totalAmount: { type: Number, trim },
				quantity: { type: Number, trim, default: 1 },
			},
		],
		bank_details: {
			account_type: { type: String, trim },
			bank_name: { type: String, trim },
			account_number: { type: String, trim },
			branch_code: { type: String, trim },
		},
		payment_method: { type: String },
		net_amount: { type: Number, required, trim },
		paid_amount: { type: Number, trim },
		note: { type: String, trim },
		createdById: { type: ObjectId, trim },
		updatedById: { type: ObjectId, trim },
		user_confirmation_signature_image: { type: String, trim },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

MongooseSchema.virtual('user', {
	ref: UserModel.collection.collectionName,
	localField: 'user_id',
	foreignField: '_id',
	justOne: true,
});

module.exports = mongoose.model('invoices', MongooseSchema, 'invoices');
