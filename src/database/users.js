/**
 * @author Brijesh Prajapati
 * @description User Profile Information
 */

const mongoose = require('mongoose'),
	{ userStatus } = require('../common'),
	{ randomDigit } = require('../utils/random'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true,
	unique = true;

const users = new mongoose.Schema(
	{
		uid: { type: String, required, trim, unique, default: () => randomDigit() },
		first_name: { type: String, required, trim },
		last_name: { type: String, required, trim },
		email: { type: String, trim, lowercase: true },
		mobile: { type: String, trim },
		country_code: { type: String, default: '+91' },
		mobileVerified: { type: Boolean, required, trim, default: false },
		emailVerified: { type: Boolean, required, trim, default: false },
		password: { type: String },
		lock: { type: Boolean, default: false },
		authToken: { type: Number, trim, default: () => randomDigit(6) },
		status: { type: String, required, trim, enum: Object.values(userStatus), default: userStatus.active },
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
		profile_image: { type: String, trim },
		birth_date: { type: String },
		notes: { type: String, trim },
		alumni: { type: Boolean, default: false, required },
		document: [{ file: { type: String, trim }, document_type: { type: String, trim, enum: ['identity'] }, label: { type: String, trim } }],
		address: {
			address_line_1: { type: String, trim },
			address_line_2: { type: String, trim },
			city: { type: String, trim },
			state: { type: String, trim },
			country: { type: String, trim },
			pin_code: { type: String, trim },
		},
		migrated: Date,
		app_data: {
			platform: String,
			app_version: String,
			build_number: Number,
			is_beta: Boolean,
		},
		fcm_token: String,
		favorite_items: [{ type: ObjectId, ref: 'business_listings' }],
	},
	{
		timestamps: true,
	}
);

users.virtual('services', {
	ref: 'user_services',
	localField: '_id',
	foreignField: 'user_id',
});

module.exports = mongoose.model('users', users, 'users');
