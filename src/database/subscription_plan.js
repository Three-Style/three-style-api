/**
 * @author Brijesh Prajapati
 * @description Plan for subscription
 */
const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;
const { paymentGateway } = require('../common');
const FitnessCoursesSchema = require('./fitness_courses'),
	FitnessPlanSchema = require('./fitness_plan');
let required = true,
	trim = true;

const subscription_plan = new mongoose.Schema(
	{
		period: { type: String, required, trim },
		interval: { type: Number, required, trim },
		name: { type: String, required, trim },
		amount: { type: Number, required, trim },
		currency: { type: String, required, trim },
		description: { type: String, trim },
		course_id: { type: ObjectId, ref: FitnessCoursesSchema.collection.collectionName },
		plan_id: { type: ObjectId, ref: FitnessPlanSchema.collection.collectionName },
		notes: { type: Object },
		razorpay_plan_id: { type: String, required, trim },
		createdBy: { type: ObjectId, required },
		updatedBy: { type: ObjectId, required },
		status: { type: Boolean, required, default: true },
		gateway: { type: String, required, enum: Object.values(paymentGateway) },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

subscription_plan.virtual('fitness_course', {
	ref: FitnessCoursesSchema.collection.collectionName,
	localField: 'course_id',
	foreignField: '_id',
	justOne: true,
});

subscription_plan.virtual('fitness_plan', {
	ref: FitnessPlanSchema.collection.collectionName,
	localField: 'plan_id',
	foreignField: '_id',
	justOne: true,
});

module.exports = mongoose.model('subscription_plan', subscription_plan, 'subscription_plan');
