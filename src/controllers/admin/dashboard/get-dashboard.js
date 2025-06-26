/**
 * @author Brijesh Prajapati
 * @description Get Dashboard
 */

const httpStatus = require('http-status');

const { UserRepo, OrdersRepo, ContactInquiryRepo } = require('../../../database');
const { nodeCache } = require('../../../services');
const { userStatus, orderStatus } = require('../../../common');
const moment = require('moment');
const response = require('../../../utils/response');
const { DashboardStatsPrefix } = require('../../../common/cache_key');
const { getCacheMetadata } = require('../../cache-manager/cache-manager');
const GeneralCache = nodeCache('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Dashboard > Get Dashboard');
	res.set('Deprecation', true);
	res.set('Warning', 'This endpoint is deprecated and will be removed in future versions. Please use Insights API (/admin/v1/insights/three-style).');

	const { adminAuthData } = req.headers;
	const CacheKey = `${DashboardStatsPrefix}_${adminAuthData._id}`,
		CacheTTL = 60;

	if (GeneralCache.has(CacheKey)) {
		return response(res, httpStatus.OK, 'success', GeneralCache.get(CacheKey), undefined, {
			cache: getCacheMetadata({
				cacheName: 'General',
				key: CacheKey,
				prefix: DashboardStatsPrefix,
			}),
		});
	}

	try {
		const order_from_date = moment().startOf('isoweek').toDate();
		const inquiry_from_date = moment().startOf('isoweek').toDate();
		const scholarship_from_date = moment().startOf('isoweek').toDate();
		const consultancy_from_date = moment().startOf('isoweek').toDate();

		let dashboardData = {
			// Interface
			active_user: 0,
			contact_inquiry: 0,
			weekly_scholarship_count: 0,
			order_count: 0,
			weekly_fitness_course_orders: 0,
			weekly_book_orders: 0,
			weekly_meal_orders: 0,
			weekly_pt_plan_registration: 0,
			weekly_digital_plan_order: 0,
			weekly_rtp_consultancy: 0,
			weekly_seminar_registration: 0,
			weekly_ebook_orders: 0,

			// Metadata
			_meta: {
				order_from_date,
				inquiry_from_date,
				scholarship_from_date,
				consultancy_from_date,
			},
		};

		let contactFindQuery = {
			createdAt: {
				$gte: inquiry_from_date,
			},
		};

		if (adminAuthData.type) {
			contactFindQuery['developer_notes.branch_id'] = adminAuthData.franchise_id;

			let ContactInquiryResult = await ContactInquiryRepo.find(contactFindQuery).countDocuments();
			dashboardData.contact_inquiry = ContactInquiryResult;

			return response(res, httpStatus.OK, 'success', dashboardData);
		}

		let [ContactInquiryResult, ActiveUsers, WeeklyScholarshipCount, WeeklyRTPConsultancy, WeeklySeminarRegistration] = await Promise.all([
			//Orders (up in the let)
			// ContactInquiryResult
			ContactInquiryRepo.find(contactFindQuery).countDocuments(),

			// activeUsers
			UserRepo.find({ status: { $eq: userStatus.active } })
				.lean()
				.countDocuments(),

			// Orders
			OrdersRepo.find({ updatedAt: { $gte: order_from_date }, status: orderStatus.success }, { order_item_type: true }, { lean: true }),
		]);

		dashboardData.contact_inquiry = ContactInquiryResult;
		dashboardData.active_user = ActiveUsers;
		dashboardData.weekly_scholarship_count = WeeklyScholarshipCount.length;
		dashboardData.weekly_rtp_consultancy = WeeklyRTPConsultancy;
		dashboardData.weekly_seminar_registration = WeeklySeminarRegistration;

		GeneralCache.set(CacheKey, dashboardData, CacheTTL);

		return response(res, httpStatus.OK, 'success', dashboardData);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
