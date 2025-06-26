/**
 * @author Brijesh Prajapati
 * @description Handle Contact Us form
 * @param {String} name
 * @param {String} email
 * @param {String} mobile
 * @param {String} message
 * @param {String} subject
 * @param {Binary} file
 * @param {String} source
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { winston: logger, nodemailer } = require('../../services');
const { ContactInquiryRepo } = require('../../database');
const moment = require('moment');
const emailHelpers = require('../../helpers/email-template');
const { isValidObjectId } = require('mongoose');
const { ActionTopic } = require('../../common');
const { ObjectId } = require('mongoose').Types;
const valid_program = ['RTP', 'RTP 1.0', 'RTP 2.0', 'RTP 3.0', 'RTP 4.0', 'RTP 5.0'];
const { WhatsAppHelper } = require('../../helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Contact Us');

	const { name, email, mobile, message, subject, file, source, files, developer_notes } = req.body;

	// Validate
	if (!name || !email || !mobile || !message || !subject || !source) {
		return response(res, httpStatus.BAD_REQUEST, 'name, email, mobile, message, subject, source is required');
	}

	let payload = {
		name,
		email,
		mobile,
		message,
		subject,
		source,
		file,
	};

	if (developer_notes) {
		payload.developer_notes = {};

		let { topic, date, course_id, program, branch_id } = developer_notes;
		if (topic == ActionTopic.demoLecture) {
			if (!date || !course_id || !isValidObjectId(course_id)) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.date and valid developer_notes.course_id is required');
			}

			date = moment(new Date(date));

			if (!moment(date).isValid()) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.date is not valid');
			}

			if (moment(date).isBefore(moment())) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.date past date is not allowed');
			}

			date = date.toDate();
			payload.developer_notes = {
				topic,
				date,
				course_id: ObjectId.createFromHexString(course_id),
			};
		} else if (topic == ActionTopic.RTPSession) {
			if (!date || !program) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.date and valid developer_notes.course_id is required');
			}

			date = moment(new Date(date));

			if (!moment(date).isValid()) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.date is not valid');
			}

			if (moment(date).isBefore(moment())) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.date past date is not allowed');
			}

			if (!valid_program.includes(program)) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.program is not valid', { valid_program: valid_program });
			}

			date = date.toDate();
			payload.developer_notes = {
				topic,
				date,
				program: String(program),
			};
		}

		if (branch_id) {
			if (!isValidObjectId(branch_id)) {
				return response(res, httpStatus.BAD_REQUEST, 'developer_notes.branch_id is not valid');
			}

			payload.developer_notes.branch_id = ObjectId.createFromHexString(branch_id);
		}
	}

	if (files) {
		let filesArray = [];
		if (!Array.isArray(files)) {
			return response(res, httpStatus.BAD_REQUEST, 'files must be array');
		}

		let areFilesValid = (() => {
			let valid = true;
			files.every((item) => {
				if (!item?.url || typeof item.url !== 'string' || String(item.url).trim() === '') {
					valid = false;
					return false;
				}

				if (item?.remark && (typeof item?.remark !== 'string' || String(item?.remark).trim() === '')) {
					valid = false;
					return false;
				}

				filesArray.push({
					url: item.url,
					remark: String(item?.remark).trim() || undefined,
				});

				return true;
			});

			return valid;
		})();

		if (!areFilesValid) {
			return response(res, httpStatus.BAD_REQUEST, 'files is invalid. url and remark must be string. each file must be object and must have url value.');
		}

		payload.files = filesArray;
	}

	// let slotRegex = /Slot:\s*(.*?)$/;
	// let slotMatch = payload.message.match(slotRegex);
	// let slot = null;
	// if (slotMatch && slotMatch.length > 1) {
	// 	slot = slotMatch[1].trim();
	// }

	try {
		ContactInquiryRepo.create(payload)
			.then((result) => postInquiryAction(result))
			.catch();

		return response(res, httpStatus.OK, 'Success');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

/**
 *
 * @param {object} data
 */
const postInquiryAction = (data) => {
	logger.info('Controller > Public > Contact Us > [fn: postInquiryAction]');

	let { developer_notes } = data;

	switch (developer_notes?.topic) {
		case ActionTopic.demoLecture:
			postAction_DemoLecture(data);
			break;
		case ActionTopic.RTPSession:
			postAction_RTPSession(data);
			break;
		default:
			break;
	}

	postAction_sendWhatsappMsg(data);
};

const postAction_sendWhatsappMsg = async (data) => {
	logger.info('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_sendWhatsappMsg]');

	let { mobile, message, name, subject } = data;

	let slotRegex = /Slot:\s*(.*?)$/;
	let slotMatch = message.match(slotRegex);
	let slot = null;
	if (slotMatch && slotMatch.length > 1) {
		slot = slotMatch[1].trim();
	}

	let bodyInquiry = {
		components: [
			{
				type: 'body',
				parameters: [
					{
						type: 'text',
						text: name,
					},
				],
			},
		],
	};

	let bodyWebinarInquiry = {
		components: [
			{
				type: 'body',
				parameters: [
					{
						type: 'text',
						text: name,
					},
					{
						type: 'text',
						text: slot,
					},
					{
						type: 'text',
						text: 'https://us02web.zoom.us/j/83211392333?pwd=hTOJ4FuyDj2iojcSIXXwWVvnKXIEOs.1',
					},
				],
			},
		],
	};

	let bodyFGIITWebinarInquiry = {
		components: [
			{
				type: 'body',
				parameters: [
					{
						type: 'text',
						text: name,
					},
					{
						type: 'text',
						text: slot,
					},
					{
						type: 'text',
						text: 'https://us02web.zoom.us/j/84329404144?pwd=Ve2TMYgtquSBVoYliZ37Suh2pl9igD.1',
					},
				],
			},
		],
	};

	// --- Send WhatsApp Message ---
	if (mobile) {
		if (subject === 'Freemium_Fwg') {
			await WhatsAppHelper.sendMessage(mobile, 'freemium_fwg_first', bodyInquiry).catch((error) => logger.error(error.stack));
		} else if (subject === 'Freemium_Fgiit') {
			await WhatsAppHelper.sendMessage(mobile, 'freemium_fgiit_first', bodyInquiry).catch((error) => logger.error(error.stack));
		} else if (subject === 'FWG Webinar Inquiry') {
			await WhatsAppHelper.sendMessage(mobile, 'fwg_webinar_msg', bodyWebinarInquiry).catch((error) => logger.error(error.stack));
		} else if (subject === 'FGIIT Webinar Inquiry') {
			await WhatsAppHelper.sendMessage(mobile, 'fgiit_webinar', bodyFGIITWebinarInquiry).catch((error) => logger.error(error.stack));
		} else {
			await WhatsAppHelper.sendMessage(mobile, 'inquiry_msg_website', bodyInquiry).catch((error) => logger.error(error.stack));
		}
	}
};

/**
 *
 * @param {{email:string,developer_notes:{course_id:string,date:Date}}} data
 * @returns {boolean}
 */
const postAction_DemoLecture = async (data) => {
	logger.info('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]');

	let { email, name, mobile } = data;
	let { course_id, date } = data.developer_notes;

	if (!moment(date).isValid()) {
		logger.error('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]: Invalid Date');
		return false;
	}

	if (!email) {
		logger.error('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]: Email is required');
		return false;
	}

	if (!course_id) {
		logger.error('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]: Course ID is required');
		return false;
	}

	// Send Registration Success Email
	let emailData = {
		date: moment(date).format('DD MMM YYYY[,]'),
		time: moment(date).format('hh:mm A'),
		client_name: name || 'User',
	};

	emailHelpers(emailHelpers.templates.DL_REGISTRATION_SUCCESS, emailData)
		.then((bodyHTML) => {
			nodemailer('threestyle.wear@gmail.com', email, 'Regarding free live demo lectures', bodyHTML, 'Three Style');
		})
		.catch((error) => logger.error(error));

	// --- Send WhatsApp Message ---
	if (mobile) {
		let bodyDemoFgiitMsg = {
			components: [
				{
					type: 'body',
					parameters: [
						{
							type: 'text',
							text: moment(date).format('DD MMM YYYY'),
						},
						{
							type: 'text',
							text: moment(date).format('hh:mm A'),
						},
					],
				},
			],
		};

		await WhatsAppHelper.sendMessage(mobile, 'thanku_demo_fgiit', bodyDemoFgiitMsg).catch((error) => logger.error(error.stack));
	}
};

/**
 *
 * @param {{email:string,developer_notes:{course_id:string,date:Date}}} data
 * @returns {boolean}
 */
const postAction_RTPSession = async (data) => {
	logger.info('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_RTPSession]');

	let { email, mobile } = data;
	let { program, date } = data.developer_notes;

	if (!moment(date).isValid()) {
		logger.error('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]: Invalid Date');
		return false;
	}

	if (!email) {
		logger.error('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]: Email is required');
		return false;
	}

	if (!program) {
		logger.error('Controller > Public > Contact Us > [fn: postInquiryAction] > [fn: postAction_DemoLecture]: Program is required');
		return false;
	}

	// Send Registration Success Email
	let emailData = {
		date: moment(date).format('DD MMM YYYY[,]'),
		time: moment(date).format('hh:mm A'),
	};

	emailHelpers(emailHelpers.templates.RTP_REGISTRATION_SUCCESS, emailData)
		.then((bodyHTML) => {
			nodemailer('threestyle.wear@gmail.com', email, 'Regarding free live demo session', bodyHTML, 'Three Style');
		})
		.catch((error) => logger.error(error));

	// --- Send WhatsApp Message ---
	if (mobile) {
		let bodyDemoFWGMsg = {
			components: [
				{
					type: 'body',
					parameters: [
						{
							type: 'text',
							text: moment(date).format('DD MMM YYYY'),
						},
						{
							type: 'text',
							text: moment(date).format('hh:mm A'),
						},
					],
				},
			],
		};

		await WhatsAppHelper.sendMessage(mobile, 'thanku_demo_fwg', bodyDemoFWGMsg).catch((error) => logger.error(error.stack));
	}
};
