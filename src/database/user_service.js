/**
 * @author Smit Luvani
 * @description Keeps track of the user services
 * @example Meals, Digital, Teaching, etc.
 */

const mongoose = require('mongoose'),
	{ userService } = require('../common'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const user_services = new mongoose.Schema(
	{
		user_id: { type: ObjectId, required, ref: 'users' },
		service: { type: String, required, trim, enum: Object.values(userService) },
		status: { type: Boolean, trim, required, default: true },
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('user_services', user_services, 'user_services');
