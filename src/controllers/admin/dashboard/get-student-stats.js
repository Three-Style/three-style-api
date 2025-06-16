/**
 * @author Brijesh Prajapati
 * @description Get statistics for student user
 */

const httpStatus = require('http-status');
const { UserFitnessCourseRepo, FitnessCourseRepo, UserRepo } = require('../../../database');
const { nodeCache } = require('../../../services');
const response = require('../../../utils/response');
const { DashboardStudentStatsPrefix } = require('../../../common/cache_key');
const { CourseCategory, userStatus } = require('../../../common');
const { getCacheMetadata } = require('../../cache-manager/cache-manager');
const GeneralCache = nodeCache('General');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Dashboard > Get Student Stats');
	res.set('Deprecation', true);
	res.set('Warning', 'This endpoint is deprecated and will be removed in future versions. Please use Insights API (/admin/v1/insights/three-style).');

	const CacheKey = DashboardStudentStatsPrefix,
		CacheTTL = 60 * 5;

	if (GeneralCache.has(CacheKey)) {
		return response(res, httpStatus.OK, 'success', GeneralCache.get(CacheKey), undefined, {
			cache: getCacheMetadata({
				cacheName: 'General',
				key: CacheKey,
				prefix: DashboardStudentStatsPrefix,
			}),
		});
	}

	const [student, online_course_student, offline_course_student, flexible_learning_student] = await Promise.all([
		// Get Count of all users who are enrolled in any course
		UserFitnessCourseRepo.aggregate([
			{
				$group: {
					_id: '$user_id',
				},
			},
		]).then((result) => result.map((i) => i._id)),
		UserFitnessCourseRepo.aggregate(courseWisePipelineObject(CourseCategory.online)),
		UserFitnessCourseRepo.aggregate(courseWisePipelineObject(CourseCategory.offline)),
		UserFitnessCourseRepo.aggregate(courseWisePipelineObject(CourseCategory.flexible)),
	]);

	const [AlumniCount, NonAlumniCount] = await Promise.all([
		UserRepo.countDocuments({ _id: { $in: student }, alumni: true, status: { $ne: userStatus.deleted } }),
		UserRepo.countDocuments({ _id: { $in: student }, alumni: false, status: { $ne: userStatus.deleted } }),
	]);

	const result = {
		counts: {
			student_user: AlumniCount + NonAlumniCount,
			online_course_student: online_course_student[0]?.count || 0,
			offline_course_student: offline_course_student[0]?.count || 0,
			flexible_learning_student: flexible_learning_student[0]?.count || 0,
			alumni: AlumniCount,
			non_alumni: NonAlumniCount,
		},
	};

	GeneralCache.set(CacheKey, result, CacheTTL);
	return response(res, httpStatus.OK, 'success', result);
};

const courseWisePipelineObject = (courseCategory) => [
	{
		$lookup: {
			from: FitnessCourseRepo.collection.collectionName,
			let: { course_id: '$course_id' },
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$_id', '$$course_id'] }, { $eq: ['$course_category', courseCategory] }],
						},
					},
				},
			],
			as: 'course',
		},
	},
	{
		$unwind: '$course',
	},
	{
		$group: {
			_id: '$user_id',
		},
	},
	{
		$count: 'count',
	},
];
