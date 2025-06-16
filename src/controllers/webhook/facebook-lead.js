/**
 * @author Brijesh Prajapati
 * @description Webhook for Facebook Lead
 */

const httpStatus = require('http-status');
const { winston: logger } = require('../../services');
const response = require('../../utils/response');
// const { getAdLeadsData } = require('../insights/GraphAPI/helpers');
// const { setLeadToDataBase } = require('../admin/facebook-lead-automation/lead.controller');

module.exports = async (req, res) => {
	if (req.body.object === 'page') {
		// for (const entry of req.body.entry) {
		// 	for (const change of entry.changes) {
		// 		const { ad_id, leadgen_id } = change.value;

		// 		logger.info(`New Lead Change Detected for ad_id: ${ad_id}, leadgen_id: ${leadgen_id}`);

		// 		const AdLeadData = await getAdLeadsData(leadgen_id);
		// 		if (AdLeadData.error) {
		// 			logger.error(`Failed to fetch lead data: ${AdLeadData.error.error.message}`);
		// 			return response(res, httpStatus.INTERNAL_SERVER_ERROR, AdLeadData.error.error.message || 'Something went wrong', AdLeadData.error.error);
		// 		}

		// 		const leadData = AdLeadData.field_data;
		// 		let phoneNumber = leadData.find((field) => field.name === 'phone_number')?.values[0];

		// 		if (phoneNumber) {
		// 			phoneNumber = phoneNumber.replace(/^\+91/, '');
		// 		}

		// 		await setLeadToDataBase(leadData, phoneNumber, ad_id, AdLeadData);
		// 	}
		// }
		// logger.info('Lead Received from Webhook');
		return response(res, httpStatus.OK);
	} else {
		logger.error('Facebook Webhook Verification Failed');
		return response(res, httpStatus.OK);
	}
};
