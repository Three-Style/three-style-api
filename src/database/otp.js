/**
 * @author Brijesh Prajapati
 * @description Records of otp
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const schema = new mongoose.Schema(
	{
		user_id: { type: ObjectId, required, trim, ref: 'users' },
		otp_code: { type: String, required, trim },
		isActive: { type: Boolean, required, default: true },
		via: { type: String, required, trim },
		send_to: { type: String, trim },
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
		expiredAt: Date,
	},
	{
		timestamps: true,
	}
);

schema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('otp', schema, 'otp');
