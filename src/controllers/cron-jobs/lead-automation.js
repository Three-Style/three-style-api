// /**
//  * @author Brijesh Prajapati
//  * @description Cron Job for Sending WhatsApp Messages on Facebook leads
//  */

// const { CronJob } = require('cron');
// const { logger } = require('../../services');
// const { getAdLeadsGenData } = require('../insights/GraphAPI/helpers');
// const LeadAutomationRepo = require('../insights/GraphAPI/database/lead_automation.js');
// const LeadDataRepo = require('../insights/GraphAPI/database/lead.js');
// const { setLeadToDataBase } = require('../admin/facebook-lead-automation/lead.controller');

// // '*/5 * * * *' -> Every 5 Minutes
// const leadsAutomationMsgCron = new CronJob('*/5 * * * *', async () => {
// 	try {
// 		logger.info(`CRONJOB: [leadsAutomationMsgCron]: ${new Date().toString()}`);

// 		const FacebookAdsId = await LeadAutomationRepo.find();
// 		if (FacebookAdsId.length === 0) {
// 			logger.warn('No FacebookAdsId found');
// 		}
// 		for (const adsData of FacebookAdsId) {
// 			logger.info(`New Lead Change Detected for ad_id: ${adsData.ads_id}`);
// 			const LeadsGenData = await getAdLeadsGenData(adsData.ads_id);
// 			if (LeadsGenData.length === 0) {
// 				logger.warn('No LeadsGenData found');
// 			}
// 			for (const leads of LeadsGenData) {
// 				const leadData = leads.field_data;

// 				let phoneNumber = leadData.find((field) => field.name === 'phone_number')?.values[0];
// 				if (phoneNumber) {
// 					phoneNumber = phoneNumber.replace(/^\+91/, '');
// 				}

// 				const LeadAdsUserData = await LeadDataRepo.find({ leadgen_id: leads.id });
// 				if (LeadAdsUserData.length === 0) {
// 					await setLeadToDataBase(leadData, phoneNumber, adsData.ads_id, leads);
// 				}
// 			}
// 		}
// 	} catch (error) {
// 		logger.error('Error executing leadsAutomationMsgCron: ' + error.message);
// 	}
// });

// module.exports = {
// 	LeadsAutomationMsg: leadsAutomationMsgCron,
// };
