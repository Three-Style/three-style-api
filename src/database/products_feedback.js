/**
 * @author Brijesh Prajapati
 * @description Products Feedback
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

const { feedbackStatus } = require('../common');

let required = true,
	trim = true;

const products_feedback = new mongoose.Schema(
	{
		product_id: { type: ObjectId, required, ref: 'products' },
		user_id: { type: ObjectId, required, ref: 'users' },
		feedback_point: { type: Number, required, enum: Array.from({ length: 5 }, (_, n) => n + 1) },
		feedback_comment: { type: String },
		status: { type: String, trim, default: 'PENDING', required, enum: Object.values(feedbackStatus) },
		deleted: { type: Boolean, default: false, required },
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

products_feedback.virtual('product', {
	ref: 'products',
	localField: 'product_id',
	foreignField: '_id',
	justOne: true,
});

products_feedback.virtual('user', {
	ref: 'users',
	localField: 'user_id',
	foreignField: '_id',
	justOne: true,
});

module.exports = mongoose.model('products_feedback', products_feedback, 'products_feedback');
