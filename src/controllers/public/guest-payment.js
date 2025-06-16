/**
 * @author Brijesh Prajapati
 * @description It handles all guest payments and Transactions will not be saved in database.
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { ContactInquiryRepo } = require('../../database');
const { paymentGateway } = require('../../common');
const rzpController = require('../razorpay');

module.exports.bookRTP3Counselling = async (req, res) => {
	/**
	 * RTP 3.0 Counselling Booking
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Book RTP 3 Counselling');

	const { payment_id } = req.body;
	const paymentAmount = 4900; // 49
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'RTP 3.0',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount} ${currency} \nFee: ${fee} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'RTP 3.0 counselling booked successfully.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.internationalClientPayment = async (req, res) => {
	req.logger.info('Controller > Public > Guest Payment > International Client Payment');

	const { payment_id, currency } = req.body;
	const currencyWiseAmount = {
		USD: 289,
		AED: 1059,
		CAD: 389,
		EUR: 269,
		AUD: 439,
	};

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	if (!currency && currencyWiseAmount[currency]) {
		return response(res, httpStatus.BAD_REQUEST, 'valid currency is required', { valid_currency: Object.keys(currencyWiseAmount) });
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: currencyWiseAmount[currency] })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'International Client',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Program: International Client - Diets and Exercise \nPayment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'RTP 3.0 counselling booked successfully.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.fitnessCenterCounsellingPayment = async (req, res) => {
	req.logger.info('Controller > Public > Guest Payment > Book RTP 3 Counselling');

	const { payment_id } = req.body;
	const amount = req.body.amount;
	const paymentAmounts = [2999 * 100, 3998 * 100, 4997 * 100, 5996 * 100, 6995 * 100, 7994 * 100, 8993 * 100, 9992 * 100, 10991 * 100, 11990 * 100];
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	if (!paymentAmounts.includes(amount)) {
		return response(res, httpStatus.BAD_REQUEST, 'Invalid payment amount');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: amount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Best And Affordable Fitness Center In India',
				name: notes?.name || 'N/A',
				email: email || '',
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'RTP 3.0 counselling booked successfully.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We have already proceeded with this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.bookFGIITWebinar = async (req, res) => {
	/**
	 * FWG Webinar
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Book FGIIT Webinar');

	const { payment_id } = req.body;
	const paymentAmount = 199 * 100;
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'FGIIT Webinar',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'FGIIT Webinar booked successfully.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.bookFWGWebinar = async (req, res) => {
	/**
	 * FWG Webinar
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Book FWG Webinar');

	const { payment_id } = req.body;
	const paymentAmount = 199 * 100; // 199
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'FWG Webinar',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'FitnessWithGomzi Webinar booked successfully.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.bodybuildingEntryFees = async (req, res) => {
	/**
	 * Bodybuilding
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Bodybuilding Booking Fees');

	const { payment_id, message } = req.body;
	const paymentAmount = 250 * 100; // 500
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Bodybuilding Entry Fees',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Meal Type: ${message}  \nPayment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Your Bodybuilding Seat Booked Done. Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.bodybuildingGameFees = async (req, res) => {
	/**
	 * Bodybuilding Game Fees
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Bodybuilding Game Fees');

	const { payment_id, message } = req.body;
	const paymentAmount = 1000 * 100; // 1000
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Bodybuilding Participants Fees',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Meal Type: ${message}  \nPayment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Your Spot Booked for playing in Bodybuilding Competition Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.rtp1FitnessPlanBuy = async (req, res) => {
	/**
	 * Weight Loss plan RTP-1.0
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Weight Loss plan RTP-1.0');

	const { payment_id } = req.body;
	const paymentAmount = 599 * 100; // 599
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Fwg Flexible Plans RTP-1.0',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.rtp2FitnessPlanBuy = async (req, res) => {
	/**
	 * Weight Management Plan RTP-2.0
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Weight Management Plan RTP-2.0');

	const { payment_id } = req.body;
	const paymentAmount = 299 * 100; // 299
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Fwg Flexible Plans RTP-2.0',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.rtp3FitnessPlanBuy = async (req, res) => {
	/**
	 * Clinical Illness Plan RTP-3.0
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Clinical Illness Plan RTP-3.0');

	const { payment_id } = req.body;
	const paymentAmount = 299 * 100; // 299
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Fwg Flexible Plans RTP-3.0',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.rtp4FitnessPlanBuy = async (req, res) => {
	/**
	 * Corporate Wellness Plan RTP-4.0
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Corporate Wellness Plan RTP-3.0');

	const { payment_id, quantity } = req.body;
	const amount = quantity * 99 * 100;
	const paymentAmount = amount;
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Fwg Flexible Plans RTP-4.0',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `\nTotal Persons: ${quantity} \nPayment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};

module.exports.rtp5FitnessPlanBuy = async (req, res) => {
	/**
	 * Prep Coaching Plan RTP-5.0
	 * @param {string} payment_id - Payment ID from Razorpay
	 */

	req.logger.info('Controller > Public > Guest Payment > Prep Coaching Plan RTP-5.0');

	const { payment_id } = req.body;
	const paymentAmount = 999 * 100; // 999
	const currency = 'INR';

	if (!payment_id) {
		return response(res, httpStatus.BAD_REQUEST, 'payment_id is required');
	}

	rzpController
		.capturePaymentController({ razorpay_payment_id: payment_id, gateway: paymentGateway.razorpay, currency: currency, amount: paymentAmount })
		.then((payment) => {
			const { amount, currency, fee, notes, email, contact, error } = payment;

			if (error) {
				throw error;
			}

			const netAmount = amount - fee;

			// Create Contact Inquiry
			let inquiryObject = {
				subject: 'Fwg Flexible Plans RTP-5.0',
				name: notes?.name || 'N/A',
				email: email,
				mobile: contact,
				message: `Payment ID: ${payment_id} \nAmount Paid: ${amount / 100} ${currency} \nFee: ${fee / 100} ${currency} \nNet Amount: ${netAmount / 100} ${currency}`,
				source: notes?.source || notes?.page_url,
				developer_notes: {
					coupon_id: notes?.coupon_id || undefined,
					payment_id: payment_id,
				},
			};

			ContactInquiryRepo.create(inquiryObject).catch((err) => req.logger.error(err));

			// Response to Request
			return response(res, httpStatus.OK, 'Our Team Contact you soon for more details.', { payment_id });
		})
		.catch((error) => {
			if (error?.description === 'This payment has already been captured') {
				return response(res, httpStatus.BAD_REQUEST, 'We already have proceed this payment.', error);
			}

			return response(res, httpStatus.BAD_REQUEST, error?.description || error.message || 'Something went wrong', error?.stack || error);
		});
};
