/**
 * @author Brijesh Prajapati
 * @description Employee Profile
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const EmployeeDocumentSchema = new mongoose.Schema({
	document_type: { type: String, required: true },
	link: { type: String, required: true, trim: true },
});

const employee = new mongoose.Schema(
	{
		position: { type: String, required, trim },
		salary: { type: String, trim },
		account_details: {
			bank_name: { type: String, trim },
			account_number: { type: String, trim },
			IFSC: { type: String, trim },
		},
		address: { type: String, trim },
		photo: { type: String, trim },
		proof: { type: String, trim },
		document: [EmployeeDocumentSchema],
		memo: [String],
		createdBy: { type: ObjectId, trim },
		updatedBy: { type: ObjectId, trim },
		employee_code: { type: String, trim },
		in_time: { type: String, trim },
		out_time: { type: String, trim },
		joining_date: { type: String, trim },
		notice: { type: Number, trim },
		status: { type: Boolean, default: true },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('employee', employee, 'employee');
