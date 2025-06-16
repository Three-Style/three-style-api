/**
 * @author Brijesh Prajapati
 * @description Receive data from Google Sheets and send whatsapp msg
 */

const { reject } = require('lodash');
const { WhatsAppHelper } = require('../../helpers');
const { winston: logger } = require('../../services');
const response = require('../../utils/response');
const httpStatus = require('http-status');

module.exports = async (req, res) => {
	logger.info('Controller > Webhook > Google Sheets');
	response(res, httpStatus.OK);
	const { sheetData, sheet_name } = req.body;

	if (!sheetData || sheetData.length === 0) {
		throw new Error('No data received');
	}

	const mobileNumber = sheetData[3];

	if (!mobileNumber || isNaN(mobileNumber)) {
		return reject(`No valid mobile number found for data: ${sheetData}`);
	}

	if (sheet_name === 'FWG') {
		logger.info('Handling FWG sheet data');
		let body = {
			components: [
				{
					type: 'header',
					parameters: [
						{
							type: 'video',
							video: {
								link: '',
							},
						},
					],
				},
			],
		};
		WhatsAppHelper.sendMessage(mobileNumber, 'fwg_lead_msg_1', body).catch((error) => logger.error(error.stack));
	} else if (sheet_name === 'FGIIT') {
		logger.info('Handling FGIIT sheet data');
		let body = {
			components: [
				{
					type: 'header',
					parameters: [
						{
							type: 'image',
							image: {
								link: 'https://t3.ftcdn.net/jpg/04/46/86/94/360_F_446869446_yfJKlH4MoUnPo56r3i7NrOuYuZRNHoqf.jpg',
							},
						},
					],
				},
			],
		};
		WhatsAppHelper.sendMessage(mobileNumber, 'lead_automation_1', body).catch((error) => logger.error(error.stack));
	}

	req.logger.info(`Message sent to mobile number: ${mobileNumber}`);
};
