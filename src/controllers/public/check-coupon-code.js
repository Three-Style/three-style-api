/**
 * @author Brijesh Prajapati
 * @description Check Coupon Code
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { ReferralCouponRepo } = require('../../database');
const { DayJS } = require('../../services');

module.exports = async (req, res) => {
	req.logger.info('Controller > Public > Check Coupon Code Validation');

	let { coupon_code } = req.body;

	try {
		if (!coupon_code) {
			return response(res, httpStatus.BAD_REQUEST, 'Coupon code is required');
		}
		// const currentDate = DayJS();
		const coupon = await ReferralCouponRepo.findOne({
			coupon_code: coupon_code,
			is_active: true,
			expired_at: { $gte: DayJS().toDate() },
		});

		if (!coupon) {
			return response(res, httpStatus.NOT_FOUND, 'Coupon code is not valid');
		}

		if (coupon.usage_count >= coupon.max_usage_count) {
			return response(res, httpStatus.NOT_FOUND, 'Coupon code is expired');
		}

		// If the coupon is valid, return the coupon details
		return response(res, httpStatus.OK, 'Coupon code is valid', {
			_id: coupon._id,
			title: coupon.title,
			discount_type: coupon.discount_type,
			discount: coupon.discount,
			item_type: coupon.item_type,
			coupon_code: coupon.coupon_code,
		});
	} catch (error) {
		req.logger.error('Error in checking coupon code validation:', error);
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
	}
};
