/**
 * @author Brijesh Prajapati
 * @description SMTP Mailer
 * @module https://www.npmjs.com/package/nodemailer
 * @tutorial https://nodemailer.com/about/
 * @example https://github.com/nodemailer/nodemailer/tree/master/examples
 */

const nodemailer = require('nodemailer'),
	logger = require('../winston');
const { email: emailRegex } = require('../../utils/regex');
const { common_environment } = require('../../common');
const blockList = ['void@razorpay.com'];
const process = require('process');
const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'Service:Nodemailer',
	},
});

// Check Secret
if (!process.env.NODEMAILER_HOST || !process.env.NODEMAILER_PORT || !process.env.NODEMAILER_USER || !process.env.NODEMAILER_PASSWORD) {
	CustomLogger.error('SMTP or Email or Password not found for current environment');
}

let transporterPayload = {
	service: process.env.NODEMAILER_HOST,
	port: process.env.NODEMAILER_PORT,
	debug: false,
	logger: false,
	auth: {
		user: process.env.NODEMAILER_USER,
		pass: process.env.NODEMAILER_PASSWORD,
	},
};

/**
 *
 * @param {string} fromMail
 * @param {string} toMail
 * @param {string} subject
 * @param {string} body
 * @param {string} senderName
 * @param {import('nodemailer/lib/mailer').Attachment[] | undefined} attachments
 * @returns
 */
module.exports = async (fromMail = process.env.NODEMAILER_EMAIL, toMail, subject, body, senderName, attachments) => {
	try {
		let transporter = nodemailer.createTransport(transporterPayload);

		if (!toMail || !subject || !body) {
			CustomLogger.error('Missing Required Parameter');
			return false;
		}

		if (!fromMail || !emailRegex(fromMail)) {
			CustomLogger.verbose('Invalid Email Address Provided. Value found ' + fromMail);
			return false;
		}

		if (!emailRegex(toMail)) {
			CustomLogger.verbose('Invalid Email Address Provided. Value found ' + fromMail);
			return false;
		}

		if (blockList.includes(toMail)) {
			CustomLogger.verbose('Email Address is manually blocked. Value found ' + toMail);
			return false;
		}

		if (process.env.NODE_ENV != common_environment.production) {
			subject = `[${process.env.NODE_ENV}] ${subject}`;
		}

		let fromMailAddress;

		if (senderName) {
			fromMailAddress = `${senderName} <${fromMail}>`;
		} else {
			fromMailAddress = `Three Style <${fromMail}>`;
		}

		let info = await transporter.sendMail({
			from: fromMailAddress, // sender address
			to: toMail, // list of receivers
			subject: subject, // Subject line
			html: body, // html body
			attachments: attachments || [],
		});

		CustomLogger.info('Email Sent to ' + [toMail].flat().join(', '));

		return info;
	} catch (error) {
		CustomLogger.error(error);
		return false;
	}
};
