const { isUndefined, isString, isArray } = require('lodash');
const { responseUtil: response } = require('../../../utils');
const httpStatus = require('http-status');
const { ReferralCouponRepo, OrdersRepo, ContactInquiryRepo, UserRepo, TrainerRepo } = require('../../../database');
const { orderStatus } = require('../../../common');
const { DayJS, Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');
const { ObjectId } = require('mongoose').Types;

/**
 * @author Brijesh Prajapati
 * Create Referral Coupon
 */
module.exports.createCoupon = async (req, res) => {
	req.logger.info('Controllers > Admin > Referral Coupon > Create Referral Coupon');

	const adminAuthData = req.headers.adminAuthData;
	const BodySchema = Joi.object({
		title: Joi.string().trim().required(),
		max_usage_count: Joi.number().required(),
		discount: Joi.number().required(),
		discount_type: Joi.string().trim().required(),
		item_type: Joi.any(),
		coupon_code: Joi.string()
			.trim()
			.pattern(/^[a-z0-9]+$/i)
			.required(),
		assign_trainer: Joi.object({
			trainer_id: Joi.string().required(),
			name: Joi.string().required(),
		}).optional(),
		expired_at: Joi.string()
			.required()
			.custom((value, helpers) => {
				if (!DayJS(value, 'YYYY/MM/DD', true).isValid()) {
					return helpers.error('any.invalid');
				}
				return value;
			}),
	});

	const { error } = BodySchema.validate(req.body);
	if (error) return response(res, error);

	let { coupon_code, title, expired_at, max_usage_count, discount, discount_type, item_type, assign_trainer } = req.body;
	// look for coupon code in database
	try {
		var isCouponCodeExist = await ReferralCouponRepo.exists({ coupon_code });
		if (isCouponCodeExist) {
			return response(res, httpStatus.CONFLICT, 'Coupon code already exist');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}

	if (assign_trainer) {
		var isTrainerExist = await TrainerRepo.exists({ _id: assign_trainer.trainer_id });
		if (!isTrainerExist) {
			return response(res, httpStatus.CONFLICT, 'Trainer Not Found');
		}

		if (!assign_trainer.name) {
			return response(res, httpStatus.CONFLICT, 'Trainer name is required');
		}
	}

	// create coupon code
	try {
		var payload = {
			coupon_code,
			title,
			expired_at,
			max_usage_count,
			assign_trainer,
			discount_type,
			discount,
			item_type,
			createdBy: adminAuthData.id,
		};

		const couponData = await ReferralCouponRepo.create(payload);
		if (assign_trainer && assign_trainer.trainer_id) {
			await TrainerRepo.findByIdAndUpdate(assign_trainer.trainer_id, {
				$push: {
					coupon_assign: {
						title: couponData.title,
						coupon_code: couponData.coupon_code,
						coupon_id: couponData._id,
					},
				},
			});
		}

		return response(res, httpStatus.OK, 'Coupon code created successfully', couponData);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

/**
 * Update Referral Coupon
 */
module.exports.updateCoupon = async (req, res) => {
	req.logger.info('Controllers > Admin > Referral Coupon > Update Referral Coupon');

	const adminAuthData = req.headers.adminAuthData;
	const BodySchema = Joi.object({
		coupon_id: Joi.string().custom(JoiObjectIdValidator).required(),
		title: Joi.string().trim().required(),
		max_usage_count: Joi.number().required(),
		discount: Joi.number().required(),
		discount_type: Joi.string().trim().required(),
		is_active: Joi.boolean().optional(),
		item_type: Joi.any(),
		coupon_code: Joi.string()
			.trim()
			.pattern(/^[a-z0-9]+$/i)
			.required(),
		assign_trainer: Joi.object({
			trainer_id: Joi.string().required(),
			name: Joi.string().required(),
		}).optional(),
		expired_at: Joi.string()
			.required()
			.custom((value, helpers) => {
				if (!DayJS(value, 'YYYY/MM/DD', true).isValid()) {
					return helpers.error('any.invalid');
				}
				return value;
			}),
	});

	const { error } = BodySchema.validate(req.body);
	if (error) return response(res, error);

	let { coupon_id, coupon_code, title, is_active, expired_at, max_usage_count, discount, discount_type, item_type, assign_trainer } = req.body;

	// look for coupon code in database
	try {
		var isCouponCodeExist = await ReferralCouponRepo.exists({ _id: { $ne: coupon_id }, coupon_code });
		if (isCouponCodeExist) {
			return response(res, httpStatus.CONFLICT, 'Coupon code already exist');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}

	if (assign_trainer) {
		var isTrainerExist = await TrainerRepo.exists({ _id: assign_trainer.trainer_id });
		if (!isTrainerExist) {
			return response(res, httpStatus.CONFLICT, 'Trainer Not Found');
		}

		if (!assign_trainer.name) {
			return response(res, httpStatus.CONFLICT, 'Trainer name is required');
		}
	}

	// update coupon code
	try {
		var payload = {
			coupon_code,
			title,
			expired_at,
			max_usage_count,
			assign_trainer,
			discount_type,
			discount,
			item_type,
			updatedBy: adminAuthData.id,
		};

		if (!isUndefined(is_active)) {
			payload.is_active = is_active;
		}
		const couponData = await ReferralCouponRepo.findOneAndUpdate({ _id: coupon_id }, payload, { new: true });
		if (assign_trainer && assign_trainer.trainer_id) {
			await TrainerRepo.findByIdAndUpdate(assign_trainer.trainer_id, {
				$push: {
					coupon_assign: {
						title: couponData.title,
						coupon_code: couponData.coupon_code,
						coupon_id: couponData._id,
					},
				},
			});
		}

		return response(res, httpStatus.OK, 'Coupon code updated successfully', couponData);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

/**
 * Get Referral Coupon
 */
module.exports.getCoupon = async (req, res) => {
	req.logger.info('Controllers > Admin > Referral Coupon > Get Referral Coupon');

	let { coupon_id, coupon_code } = req.query;
	let findQuery = {};

	try {
		if (!isUndefined(coupon_id) && coupon_id != '') {
			if (!isString(coupon_id) || !ObjectId.isValid(coupon_id)) {
				return response(res, httpStatus.BAD_REQUEST, 'valid coupon_id is required');
			}

			findQuery._id = ObjectId.createFromHexString(coupon_id);
		}

		if (!isUndefined(coupon_code) && coupon_code != '') {
			if (!isString(coupon_code)) {
				return response(res, httpStatus.BAD_REQUEST, 'valid coupon_code is required');
			}

			findQuery.coupon_code = coupon_code.trim();
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}

	try {
		ReferralCouponRepo.find(findQuery)
			.then((result) => {
				return response(res, httpStatus.OK, 'success', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

/**
 * Get coupon usage
 */
module.exports.getCouponUsage = async (req, res) => {
	req.logger.info('Controllers > Admin > Referral Coupon > Get Coupon Usage');

	let { coupon_id } = req.query;

	let findCouponQuery = {};

	if (coupon_id) {
		if (isString(coupon_id) && !ObjectId.isValid(coupon_id)) {
			return response(res, httpStatus.BAD_REQUEST, 'valid coupon_id is required');
		} else if (isString(coupon_id)) {
			findCouponQuery._id = ObjectId.createFromHexString(coupon_id);
		} else if (isArray(coupon_id)) {
			try {
				findCouponQuery._id = { $in: coupon_id.map((id) => ObjectId.createFromHexString(id)) };
			} catch (error) {
				return response(res, httpStatus.BAD_REQUEST, 'valid coupon_id is required');
			}
		} else {
			return response(res, httpStatus.BAD_REQUEST, 'valid coupon_id is required');
		}
	}

	let getCouponResult = await ReferralCouponRepo.find(findCouponQuery);

	if (getCouponResult.length == 0) {
		return response(res, httpStatus.OK, 'success', []);
	}

	let coupon_ids_array = getCouponResult.map((coupon) => coupon._id.toString());

	var promiseArray = [];

	// Find orders with coupon_id
	promiseArray.push(
		await OrdersRepo.find(
			{
				'notes.coupon_id': { $exists: true, $ne: [], $in: coupon_ids_array },
				status: orderStatus.success,
			},
			{
				receipt_id: true,
				user_id: true,
				order_item_type: true,
				status: true,
				amount: true,
				purchase_mode: true,
				'notes.coupon_id': true,
			},
			{ lean: true }
		)
	);

	// Find Guest payment with coupon_id
	promiseArray.push(ContactInquiryRepo.find({ 'developer_notes.coupon_id': { $in: coupon_ids_array } }, {}, { lean: true }));

	Promise.all(promiseArray)
		.then(async ([orders, guest_payments]) => {
			const allUsers = orders.map((order) => order.user_id);
			const fetchUsers = await UserRepo.find({ _id: { $in: allUsers } }, { first_name: true, last_name: true, email: true, mobile: true, profile_image: true }, { lean: true });

			let couponUsage = [];
			getCouponResult.forEach((coupon) => {
				coupon = coupon.toObject();
				let couponUsageObj = {
					...coupon,
					orders: [],
					guest_payments: [],
				};

				couponUsageObj.orders = orders.filter((order) => Array.isArray(order.notes?.coupon_id) && order.notes.coupon_id.includes(coupon._id.toString()));

				couponUsageObj.orders = couponUsageObj.orders.map((order) => {
					order.user = fetchUsers.find((user) => user._id.equals(order.user_id));
					return order;
				});

				couponUsageObj.guest_payments = guest_payments.filter((guest_payment) => guest_payment.developer_notes?.coupon_id === coupon._id.toString());

				couponUsage.push(couponUsageObj);
			});
			return response(res, httpStatus.OK, 'success', couponUsage);
		})
		.catch((error) => {
			return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
		});
};
