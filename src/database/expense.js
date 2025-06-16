/**
 * @author Brijesh Prajapati
 * @description Common Expense Schema.
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const MongooseSchema = new mongoose.Schema(
	{
		expense_number: { type: Number, required },
		expense_company: { type: String, required, trim },
		date: { type: Date, required, trim },
		expense_category: { type: String, required, trim },
		items: [
			{
				item_name: { type: String, required, trim },
				amount: { type: Number, trim },
			},
		],
		payment_method: { type: String },
		total_amount: { type: Number, required, trim },
		note: { type: String, trim },
		createdById: { type: ObjectId, trim },
		updatedById: { type: ObjectId, trim },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('expenses', MongooseSchema, 'expenses');
