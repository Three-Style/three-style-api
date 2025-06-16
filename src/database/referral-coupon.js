/**
 * @author Brijesh Prajapati
 * @description Referral Coupon
 */

const mongoose = require('mongoose');
const admins = require('./admins');
const { itemType } = require('../common');
let required = true,
	trim = true;

const Schema = new mongoose.Schema(
	{
		coupon_code: { type: String, required, trim },
		title: { type: String, required, trim },
		expired_at: { type: Date },
		max_usage_count: { type: Number },
		usage_count: { type: Number, default: 0 },
		discount_type: { type: String },
		discount: { type: Number },
		item_type: { type: String, enum: Object.values(itemType) },
		assign_trainer: {
			name: { type: String, required: true, trim: true },
			trainer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'trainer', required: true },
		},
		is_active: { type: Boolean, default: true, required },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: admins.collection.collectionName, required },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: admins.collection.collectionName },
	},
	{
		timestamps: true,
	}
);
const CollectionName = 'referral_coupon';

module.exports = mongoose.model(CollectionName, Schema, CollectionName);
