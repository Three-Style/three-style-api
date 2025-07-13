// Export All CRON Jobs

const httpStatus = require('http-status');
const response = require('../../utils/response');
const process = require('process');
// const WhatsAppSend = require('./whatsapp-msg');
// const EmployeeRatingJobs = require('./employee-rating');
// const LeadsAutomationMsgCron = require('./lead-automation');

// Keep it imported in index.js, so that it can start on initialization
// require('./demo-lecture');
// require('./demo-rtp-session');
// require('./freemium');

// Auto Start Cron JOB for Production
if (process.env.NODE_ENV == 'production' && process.env.IS_THIS_LOCAL != 'true') {
	// courseCron.OnlineCourseReminderEmail.start()
	// courseCron.DoubtEmail.start()
	// Object.values(flexibleLearningEmailCron).forEach(item => item.start()) // Run all functions in flexibleLearningEmailCron
	// EmployeeRatingJobs.FetchEmployeeRating.start();
	// WhatsAppSend.SendWhatsappMsg.start();
	// LeadsAutomationMsgCron.LeadsAutomationMsg.start();
}

module.exports = (req, res) => {
	let { name, status } = req.params;

	// Valid Status
	if (status != 'start' && status != 'stop') {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid Status', {
			valid: ['start', 'stop'],
		});
	}

	// let jobStart = status == 'start';

	switch (name) {
		// case 'fetchEmployeeRatingJob':
		// 	jobStart ? EmployeeRatingJobs.FetchEmployeeRating.start() : EmployeeRatingJobs.FetchEmployeeRating.stop();
		// 	break;
		// case 'WhatsappMsgSend':
		// 	jobStart ? WhatsAppSend.SendWhatsappMsg.start() : WhatsAppSend.SendWhatsappMsg.stop();
		// 	break;
		case '':
			break;
		default:
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Job Name');
	}

	return response(res, httpStatus.OK, 'success');
};
