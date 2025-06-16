const { SubscriptionType } = require('../common');

/**
 * @author Brijesh Prajapati
 * @description Subscription Schema
 */
const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;
const SubscriptionPlan = require('./subscription_plan');

const subscription = new mongoose.Schema(
	{
		plan_id: { type: String, required, trim },
		razorpay_subscription_id: { type: String, required, trim },
		short_url: { type: String, required, trim },
		remaining_count: { type: Number, required, trim },
		total_count: { type: Number, required, trim },
		quantity: { type: Number, required, trim },
		start_at: { type: Date, trim },
		expire_by: { type: Date, trim },
		end_at: { type: Date, trim },
		charge_at: { type: Date, trim },
		current_start: { type: Date, trim },
		current_end: { type: Date, trim },
		ended_at: { type: Date, trim },
		addons: {
			name: { type: String, trim },
			amount: { type: Number, trim },
			currency: { type: String, trim },
		},
		notes: { type: Object },
		notification: {
			email: { type: Boolean, default: true },
			whatsapp: { type: Boolean, default: true },
			push: { type: Boolean, default: true },
		},
		offer_id: { type: String, trim },
		user_id: { type: ObjectId, required, ref: 'users' },
		subscriptionBy: { type: String, required },
		createdBy: { type: ObjectId, required },
		updatedBy: { type: ObjectId, required },
		status: {
			type: String,
			required,
			trim,
			enum: Object.values(SubscriptionType),
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

subscription.virtual('subscription_plan', {
	ref: SubscriptionPlan.collection.collectionName,
	localField: 'plan_id',
	foreignField: 'razorpay_plan_id',
	justOne: true,
});

module.exports = mongoose.model('subscription', subscription, 'subscription');
