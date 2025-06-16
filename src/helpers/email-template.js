/**
 * @author Brijesh Prajapati
 * @description Replace Email Template with Data
 * @param {String} templateName
 */

const fs = require('fs');
const { winston: logger } = require('../services');
const process = require('process');
const templateDirectory = process.cwd() + '/src/templates';

const templates = {
	FWG_INVOICE: process.cwd() + '/src/templates/invoice/fwg_invoice.html',
	FWG_FEATURE: process.cwd() + '/src/templates/feature/fwg_feature.html',
	FG_DIGITAL_INVOICE: process.cwd() + '/src/templates/invoice/fg_digital_invoice.html',
	FG_DIGITAL_FEATURE: process.cwd() + '/src/templates/feature/fg_digital_feature.html',
	FGIIT_INVOICE: process.cwd() + '/src/templates/invoice/fgiit_invoice.html',
	FGIIT_FEATURE: process.cwd() + '/src/templates/feature/fgiit_feature.html',
	FREE_SESSION_ADMIN: process.cwd() + '/src/templates/free-session-admin.html',
	FGIIT_BOOK_INVOICE: process.cwd() + '/src/templates/invoice/fgiit_book_invoice.html',
	FGIIT_BOOK_FEATURE: process.cwd() + '/src/templates/feature/fgiit_book_feature.html',
	FGMEALS_INVOICE: process.cwd() + '/src/templates/invoice/fgmeals_invoice.html',
	FGIIT_EBOOK_INVOICE: process.cwd() + '/src/templates/invoice/fgiit_ebook_invoice.html',
	FGIIT_EBOOK_FEATURE: process.cwd() + '/src/templates/feature/fgiit_ebook_feature.html',
	PYTHON_COURSE_INVOICE: process.cwd() + '/src/templates/invoice/python_course_invoice.html',
	PYTHON_COURSE_FEATURE: process.cwd() + '/src/templates/feature/python_course_feature.html',
	FGIIT_FITNESS_COURSE_CART_INVOICE: process.cwd() + '/src/templates/invoice/fgiit-fitness-course-cart-invoice.html',
	FGIIT_FITNESS_COURSE_CART_FEATURE: process.cwd() + '/src/templates/feature/fgiit-fitness-course-cart-feature.html',

	// Flexible Learning Course
	FL_LOGIN_DETAILS: templateDirectory + '/flexible-learning/login-details.html',
	FL_JOIN_COMMUNITY: templateDirectory + '/flexible-learning/join-community.html',
	FL_WATCH_REMINDER: templateDirectory + '/flexible-learning/watch-reminder.html',
	FL_PROGRESS_REPORT: templateDirectory + '/flexible-learning/progress-report.html',
	FL_3_DAYS_REMINDER: templateDirectory + '/flexible-learning/exam-reminder-3-days-before.html',
	FL_3_DAYS_REMINDER_NEW: templateDirectory + '/flexible-learning/exam-reminder-3-days.html',
	FL_PROJECT_REMINDER: templateDirectory + '/flexible-learning/project-reminder.html',
	FL_FEEDBACK_FORM: templateDirectory + '/flexible-learning/feedback-form-link.html',
	FL_CERTIFICATE: templateDirectory + '/flexible-learning/certificate.html',

	// Demo Lecture
	DL_REGISTRATION_SUCCESS: templateDirectory + '/demo-lectures/registration-success.html',
	DL_MEETING_LINK: templateDirectory + '/demo-lectures/meeting-link.html',
	DL_PURCHASE_DISCOUNT: templateDirectory + '/demo-lectures/discount-purchase.html',
	DL_CLIENT_REVIEWS: templateDirectory + '/demo-lectures/client-reviews.html',
	DL_LECTURE_VIDEO: templateDirectory + '/demo-lectures/lecture-videos.html',
	DL_PURCHASE_REMINDER: templateDirectory + '/demo-lectures/purchase-reminder.html',

	// Demo RTP Session
	RTP_REGISTRATION_SUCCESS: templateDirectory + '/demo-rtp-session/registration-success.html',
	RTP_MEETING_LINK: templateDirectory + '/demo-rtp-session/meeting-link.html',
	RTP_PURCHASE_DISCOUNT: templateDirectory + '/demo-rtp-session/discount-purchase.html',
	RTP_CLIENT_REVIEWS: templateDirectory + '/demo-rtp-session/client-reviews.html',
	RTP_PURCHASE_REMINDER: templateDirectory + '/demo-rtp-session/purchase-reminder.html',
	RTP_SESSION_VIDEO: templateDirectory + '/demo-rtp-session/lecture-videos.html',

	//Subscription Reminder
	SUBSCRIPTION_REMINDER: templateDirectory + '/subscriptions/subscription-reminder.html',
	SUBSCRIPTION_PAYMENT_LINK: templateDirectory + '/subscriptions/subscription-link-send.html',
	SUBSCRIPTION_TERM_CONDITION: templateDirectory + '/subscriptions/subscription-term-condition.html',

	//complaint Chatbot
	COMPLAINT_CHATBOT_FGIIT: templateDirectory + '/complaint_chatbot/complaint_chatbot_fgiit.html',
	COMPLAINT_CHATBOT_FWG: templateDirectory + '/complaint_chatbot/complaint_chatbot_fwg.html',
	COMPLAINT_CHATBOT_REPLY_FGIIT: templateDirectory + '/complaint_chatbot/complaint_chatbot_reply_fgiit.html',
	COMPLAINT_CHATBOT_REPLY_FWG: templateDirectory + '/complaint_chatbot/complaint_chatbot_reply_fwg.html',

	//Termination Letter
	TERMINATION_LETTER: templateDirectory + '/termination-letter.html',

	//INPTA
	INPTA_TRAINING_PARTNER: templateDirectory + '/inpta/tp_inpta.html',
	INPTA_TRAINING_CENTER: templateDirectory + '/inpta/tc_inpta.html',
	INPTA_TC_CERTIFICATE: templateDirectory + '/inpta/tc_certificate_inpta.html',
	INPTA_TC_AUDITOR: templateDirectory + '/inpta/tc_auditor_inpta.html',

	// Email OTP
	EMAIL_OTP: templateDirectory + '/user-email-otp.html',
};

/**
 *
 * @param {string} templateName
 * @param {object} data to replace {{variable}} in template
 * @returns
 */
module.exports = async (templateName, data = {}) => {
	logger.silly('Helpers > Email Template Helpers');
	if (!templateName || !data || typeof templateName !== 'string' || typeof data !== 'object') {
		throw new Error('templateName is required. templateName must be string and Data must be JSON.');
	}

	let templateCode = String(templateName).toUpperCase().trim();

	if (!templates[templateCode] && !(await fs.existsSync(templateName))) {
		logger.error(`[HELPER > EMAIL]: Template ${templates[templateCode] || templateName} not found.`);
		throw new Error(`Template ${templates[templateCode] || templateName} not found.`);
	}

	let fileContent;
	try {
		fileContent = await fs.readFileSync(templates[templateCode] || templateName, 'utf-8');

		// Replace JSON key with value in fileContent
		for (let key in data) {
			if (typeof data[key] != 'undefined') {
				fileContent = fileContent.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
			}
		}

		// Missing keys
		const findKeys = new RegExp(/{{(.*?)}}/, 'g'); // Starts with {{ and ends with }}
		var missingKeys = findKeys.exec(fileContent);

		if (!missingKeys) {
			return fileContent;
		}

		var missingKeysArray = new Set();
		while (missingKeys !== null) {
			missingKeysArray.add(missingKeys[1]);
			missingKeys = findKeys.exec(fileContent);
		}

		throw new Error(
			`[HELPER > EMAIL]: Missing keys in template ${templateName}. Missing values for ${Array.from(missingKeysArray)
				.map((k) => `'${k}'`)
				.join(', ')}`
		);
	} catch (error) {
		throw new Error('[HELPER > EMAIL]: File Reading Error. ' + error.message);
	}
};

module.exports.templates = templates;
