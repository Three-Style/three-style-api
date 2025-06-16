/**
 * @author Brijesh Prajapati
 * @description Payment Callback for Fitness Course (Cart)
 */

const { winston: logger, nodemailer, nodeCache, DayJS } = require('../../../services');
const { OrdersRepo, FitnessCourseRepo, UserFitnessCourseRepo, UserServiceRepo, UserRepo, OrderCartsRepo } = require('../../../database');
const { orderStatus, timeUnit, userService, itemType } = require('../../../common');
const { getOrderByIDController, getPayment } = require('..');
const { emailTemplate, WhatsAppHelper } = require('../../../helpers');
const { UserPurchaseEvent } = require('../../../common/cache_key');
const { assignAllQuiz } = require('../../functions/exam');
const { convertToObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const GeneralCache = nodeCache('General');

async function FitnessCourseCartWebhook({ razorpay_payment_id, razorpay_order_id, razorpay_signature, gateway: razorpayGateway } = {}) {
	return new Promise(async (resolve, reject) => {
		logger.info('Controller > Users > Fitness Course > Payment Callback');
		if (!razorpay_payment_id || !razorpay_order_id) {
			return reject('Payment or Order ID required');
		}

		let [razorpayOrder, razorpayPayment, userOrder] = await Promise.all([
			getOrderByIDController(razorpay_order_id, razorpayGateway),
			getPayment(razorpay_payment_id, { gateway: razorpayGateway }),
			OrdersRepo.findOne({ gateway_order_id: razorpay_order_id }, undefined, { lean: true }).populate({ path: 'user_info', select: '_id uid email mobile first_name last_name country_code' }),
		]);

		if (razorpayOrder.status != 'paid') {
			return reject('Order was not paid');
		}

		if (!userOrder) {
			return reject('Invalid Order ID');
		}

		const UserData = userOrder.user_info;
		let user_id = UserData._id,
			userEmail = UserData.email || razorpayPayment.email;

		// Update Email in User Account
		UserRepo.findOneAndUpdate({ _id: user_id }, { email: String(userEmail).trim().toLowerCase() }, { new: true }).catch((error) => logger.error('Email Update failed' + error.message));

		// Validate Payment
		if (razorpayPayment.order_id != razorpayOrder.id) {
			return reject('Invalid Payment. Payment Order ID does not match with Order ID');
		}

		let orderUpdateResult;
		try {
			orderUpdateResult = await OrdersRepo.findOneAndUpdate(
				{
					gateway_order_id: razorpay_order_id,
					status: { $ne: orderStatus.success },
					order_item_type: itemType.item_cart,
				},
				{
					status: orderStatus.success,
					gateway_signature: razorpay_signature,
					updatedBy: user_id,
					gateway_transaction_id: razorpay_payment_id,
				},
				{ new: true }
			);

			if (!orderUpdateResult) {
				return reject('Order already paid');
			}
		} catch (error) {
			logger.error(error);
			return reject(error.message || error);
		}

		if (orderUpdateResult?.notes?.cart_id) {
			OrderCartsRepo.findByIdAndUpdate(convertToObjectId(orderUpdateResult.notes.cart_id), {
				is_purchased: true,
			}).catch((error) => logger.error(error));
		}

		const courseIds = orderUpdateResult.multiple_items.map((item) => item.item_id);

		const FitnessCoursesResult = await FitnessCourseRepo.find({ _id: { $in: courseIds } });

		let allCourseCreated = await Promise.all(
			courseIds.map((course) =>
				createUserFitnessCourseRecord({
					course_id: course._id,
					order_id: orderUpdateResult._id,
					course_result: FitnessCoursesResult.find((course) => course._id.equals(course._id)),
					user_id: user_id,
				})
			)
		).catch((error) => logger.error(error));

		if (allCourseCreated.length != courseIds.length) {
			let failedToCreate = courseIds.filter((course) => !allCourseCreated.find((createdCourse) => createdCourse.course_id.equals(course)));
			logger.error('Some courses are not created', failedToCreate);
		}

		GeneralCache.emit(UserPurchaseEvent, { user_id: user_id });

		UserServiceRepo.findOneAndUpdate(
			{ user_id: user_id, service: userService.fgiit },
			{ user_id: user_id, service: userService.fgiit, status: true, createdBy: user_id, updatedBy: user_id },
			{ new: true, upsert: true }
		).catch((error) => logger.error(error));

		resolve('FITNESS COURSE SUCCESSFULLY PAID');

		// --- Send Mail ---
		try {
			if (userEmail != 'void@razorpay.com') {
				let TotalAppliedDiscount = 0;

				orderUpdateResult.multiple_items.forEach((item) => {
					if (item?.notes?.discount_amount) {
						TotalAppliedDiscount += item.notes.discount_amount;
					}
				});

				if (orderUpdateResult?.notes?.total_coupon_discount) {
					TotalAppliedDiscount += orderUpdateResult.notes.total_coupon_discount;
				}

				TotalAppliedDiscount = Number(TotalAppliedDiscount.toFixed(2));

				let invoiceTable = orderUpdateResult.multiple_items
					.map((item) => {
						let course = FitnessCoursesResult.find((course) => course._id.equals(item.item_id));

						return `<tr>
								<td colspan="3" class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">
									${course.course_name} (x${item.quantity})
								</td>
								<td class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">${item.amount}</td>
							</tr>`;
					})
					.join('');

				// Invoice Email
				emailTemplate(emailTemplate.templates.FGIIT_FITNESS_COURSE_CART_INVOICE, {
					order_id: orderUpdateResult.receipt_id,
					totalAmount: orderUpdateResult.amount,
					course_table: invoiceTable,
					total_discount: TotalAppliedDiscount,
				})
					.then((bodyHTML) => {
						nodemailer(undefined, userEmail, `Invoice ${orderUpdateResult.receipt_id} - FGIIT Fitness Course`, bodyHTML, 'Three Style');
					})
					.catch((error) => logger.error(error));

				// Feature Email
				let featureTable = allCourseCreated
					.map((userCourse) => {
						let findCourse = FitnessCoursesResult.find((course) => course._id.equals(userCourse.course_id));

						return `<tr>
								<td colspan="3" class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">
									${findCourse.course_name}
								</td>
								<td class="table-css" style="padding: 10px; border: 1px solid #424242; font-size: 12px;">${userCourse?.duration?.duration || 0} ${userCourse?.duration?.day || 'day'}</td>
							</tr>`;
					})
					.join('');

				emailTemplate(emailTemplate.templates.FGIIT_FITNESS_COURSE_CART_FEATURE, {
					plan_table: featureTable,
					receipt_id: orderUpdateResult.receipt_id,
				})
					.then((bodyHTML) => nodemailer(undefined, userEmail, `Congrats! Successfully enrolled in fitness courses`, bodyHTML, 'Three Style'))
					.catch((error) => logger.error(error));
			}
		} catch (error) {
			logger.error(error);
		}

		try {
			// --- Send WhatsApp Message ---
			const mobile = UserData.mobile;
			let courseDetails = orderUpdateResult.multiple_items
				.map((item) => {
					let course = FitnessCoursesResult.find((course) => course._id.equals(item.item_id));
					return `${course.course_name} (${course.duration_days} Days)`;
				})
				.join(', ');
			if (mobile) {
				let invoiceBody = {
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: orderUpdateResult.receipt_id,
								},
								{
									type: 'text',
									text: courseDetails,
								},
								{
									type: 'text',
									text: orderUpdateResult.amount,
								},
							],
						},
					],
				};

				let activePlanBody = {
					components: [
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: courseDetails,
								},
							],
						},
					],
				};

				// Invoice
				WhatsAppHelper.sendMessage(mobile, 'plan_invoice', invoiceBody).catch((error) => logger.error(error));

				// Feature
				WhatsAppHelper.sendMessage(mobile, 'multiple_plan_purchase_activated', activePlanBody).catch((error) => logger.error(error));
			}
		} catch (error) {
			logger.error(error);
		}
	});
}
module.exports = FitnessCourseCartWebhook;

function createUserFitnessCourseRecord({ course_id, order_id, course_result, user_id }) {
	return new Promise(async (resolve, reject) => {
		if (!course_id || !order_id) {
			return reject('Course ID and Order ID required');
		}

		let start_date = new Date(),
			duration = {
				unit: timeUnit.day,
				duration: course_result.duration_days,
			};

		let payload = {
			course_id,
			order_id,
			user_id,
			duration,
			createdBy: user_id,
			updatedBy: user_id,
			start_date,
			end_date: DayJS().add(duration.duration, 'days'),
		};

		UserFitnessCourseRepo.create(payload)
			.then((result) => {
				assignAllQuiz({ user_id: user_id, course_id: payload.course_id, authorizedUserId: user_id }).catch((error) => logger.error(error));
				UserRepo.findByIdAndUpdate(result.user_id, { is_alumni: false }, { new: true }).exec();
				resolve(result);
			})
			.catch((error) => {
				logger.error(error);
				reject(error);
			});
	});
}
