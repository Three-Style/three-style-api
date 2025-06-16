const CacheConstants = require('../../common/cache_key');
const { nodeCache } = require('../../services');
const { deleteCache } = require('./cache-manager');

const GeneralCache = nodeCache('General');
const AuthorizationCache = nodeCache('Authorization');
const ExamCache = nodeCache('Exam');

GeneralCache.on(CacheConstants.UserProfileUpdateEvent, (data) => {
	if (data?.user_id) {
		deleteCache(AuthorizationCache, { prefix: [data.user_id] });
		deleteCache(GeneralCache, { prefix: [data.user_id, CacheConstants.LectureCommentsPrefix, CacheConstants.UserProfilePrefix] });
	}
});

GeneralCache.on(CacheConstants.UserPurchaseEvent, (data) => {
	if (data?.user_id) {
		deleteCache(GeneralCache, { prefix: [data.user_id, CacheConstants.StudentGetLecturePrefix] });
	}

	deleteCache(GeneralCache, { prefix: CacheConstants.GetUserFitnessCoursePrefix });
});

GeneralCache.on(CacheConstants.StudentCourseAssignEvent, (data) => {
	if (data?.user_id) {
		deleteCache(GeneralCache, { prefix: [data.user_id] });
	}

	deleteCache(GeneralCache, { prefix: CacheConstants.GetUserFitnessCoursePrefix });
	deleteCache(GeneralCache, { prefix: CacheConstants.StudentGetLecturePrefix });
});

GeneralCache.on(CacheConstants.UserCertificateModifiedEvent, () => {
	deleteCache(GeneralCache, {
		prefix: [CacheConstants.GetStudentFitnessCourseEnrollmentPrefix, CacheConstants.GetUserFitnessCoursePrefix, CacheConstants.GetCertificatePrefix],
	});
});

GeneralCache.on(CacheConstants.DeactivateUserCourseEvent, (data) => {
	deleteCache(GeneralCache, { prefix: [CacheConstants.GetUserFitnessCoursePrefix] });

	if (data?.user_id) {
		deleteCache(GeneralCache, { prefix: [data.user_id, ...Object.values(CacheConstants).map((CacheKey) => CacheKey)] });
		deleteCache(AuthorizationCache, { prefix: [data.user_id, CacheConstants.StudentGetLecturePrefix] });
		deleteCache(ExamCache, { prefix: [`${CacheConstants.StudentExamAttemptPrefix}_${data.user_id}`] });
	}
});

GeneralCache.on(CacheConstants.LectureCommentsModifiedEvent, () => {
	deleteCache(GeneralCache, { prefix: [CacheConstants.LectureCommentsPrefix] });
});

GeneralCache.on(CacheConstants.UserLoginEvent, (data) => {
	deleteCache(GeneralCache, { prefix: [data.user_id, ...Object.keys(CacheConstants).map((key) => key + data.user_id)] });
	deleteCache(ExamCache, { prefix: [`${CacheConstants.StudentExamAttemptPrefix}_${data.user_id}`] });
});

GeneralCache.on(CacheConstants.UserFavoriteListingModifiedEvent, ({ user_id } = {}) => {
	deleteCache(GeneralCache, { keys: CacheConstants.UserProfilePrefix + user_id });
});

GeneralCache.on(CacheConstants.OrderModifiedEvent, () => {
	deleteCache(GeneralCache, { prefix: [CacheConstants.GetOrderPrefix, CacheConstants.GetOrderPrefix, CacheConstants.GetUserFitnessCoursePrefix] });
});

GeneralCache.on(CacheConstants.LectureModifiedEvent, () => {
	deleteCache(GeneralCache, { prefix: [CacheConstants.GetLecturePrefix, CacheConstants.StudentGetLecturePrefix] });
});
