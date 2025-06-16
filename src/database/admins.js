/**
 * @author Brijesh Prajapati
 * @description Admin Profile Information
 */

const mongoose = require('mongoose'),
	{ adminType } = require('../common'),
	{ randomDigit } = require('../utils/random'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true,
	unique = true;

const admins = new mongoose.Schema(
	{
		full_name: { type: String, required, trim, default: adminType.master },
		email: { type: String, required, trim, lowercase: true, unique },
		mobile: { type: String, required, trim },
		password: { type: String, required },
		country_id: { type: ObjectId, ref: 'country' },
		type: { type: String, required, trim, enum: Object.values(adminType), default: adminType.admin },
		status: { type: Boolean, default: true },
		authToken: { type: Number, default: () => randomDigit() },
		MFA_enabled: [{ type: String, enum: ['authenticator', 'email', 'sms'] }],
		authenticator_secrets: [{ secret: { type: String, required, trim }, remark: { type: String, required } }],
		franchise_id: { type: ObjectId, ref: 'franchises' },
		employee_id: { type: ObjectId, ref: 'employee' },
		trainer_id: { type: ObjectId, ref: 'trainer' },
		createdBy: { type: ObjectId, ref: 'admins' },
		updatedBy: { type: ObjectId, ref: 'admins' },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

admins.virtual('franchise', {
	ref: 'franchises',
	localField: 'franchise_id',
	foreignField: '_id',
	justOne: true,
});

admins.virtual('employee', {
	ref: 'employee',
	localField: 'employee_id',
	foreignField: '_id',
	justOne: true,
});

module.exports = mongoose.model('admins', admins, 'admins');
