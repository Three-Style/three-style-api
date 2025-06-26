const unirest = require('unirest');
const { logger } = require('../services');
// const process = require('process');
// const WhatsAppToken = process.env.WhatsAppToken;
// const phoneNumberID = process.env.phoneNumberID;
let WhatsAppToken;
let phoneNumberID;

// if (!WhatsAppToken || !phoneNumberID) {
// 	console.error(new Error('WhatsAppToken or phoneNumberID is not defined in environment variables.'));
// }

const BaseURL = `https://crm.officialwa.com/api/meta/v19.0/${phoneNumberID}/messages`;

/**
 * @author Brijesh Prajapati
 * @param {String} toMobileNumber
 * @param {String} templateName
 * @param {Object} body
 * @returns
 */
async function sendMessage(toMobileNumber, templateName, body) {
	if (!toMobileNumber) throw new Error('toMobileNumber is required');
	if (!templateName) throw new Error('templateName is required');
	if (!body || !body.components) throw new Error('body and body.components are required');

	const requestBody = {
		to: toMobileNumber,
		recipient_type: 'individual',
		type: 'template',
		template: {
			language: {
				policy: 'deterministic',
				code: 'en_US',
			},
			name: templateName,
			components: body.components,
		},
	};

	return await unirest
		.post(BaseURL)
		.headers({
			'Content-Type': 'application/json',
			Authorization: `Bearer ${WhatsAppToken}`,
		})
		.send(requestBody)
		.then((response) => {
			if (response.status === 200) {
				logger.info(`[WhatsAppHelper] Message sent successfully: ${JSON.stringify(response.body)}`);
				return response.body;
			} else {
				throw new Error(`Failed to send message: ${JSON.stringify(response.body)}`);
			}
		})
		.catch((error) => {
			logger.error(`[WhatsAppHelper] ${error.stack}`);
			throw error;
		});
}

module.exports.sendMessage = sendMessage;
