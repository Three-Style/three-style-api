// You can add common or constant here
module.exports.common_environment = {
	development: 'development',
	production: 'production',
};

module.exports.adminType = {
	master: 'MASTER',
	admin: 'Admin',
};

module.exports.userStatus = {
	active: 'ACTIVE', // Active User
	deleted: 'DELETED', // Deleted by user itself or Admin
	deactivate: 'DEACTIVATED', // Deactivate by Admin or User itself
};

module.exports.MFAMethods = {
	authenticator: 'authenticator',
};

module.exports.gender = {
	male: 'MALE',
	female: 'FEMALE',
	other: 'OTHER',
};

module.exports.userType = {
	admin: 'ADMIN',
	user: 'USER',
};

module.exports.status = {
	active: 'ACTIVE',
	deleted: 'DELETED',
	pending: 'PENDING',
	inactive: 'INACTIVE',
};

module.exports.fileType = {
	audio: 'AUDIO',
	file: 'FILE',
};

module.exports.purchaseMode = {
	online: 'ONLINE', // Purchase by User - Using Online Web Service
	manual: 'MANUAL', // Added by Admin
	cashOnDelivery: 'Cash On Delivery', // Purchase by User - Using Online Web Service (COD)
};

module.exports.paymentGateway = {
	razorpay: 'RAZORPAY', // Registered Email: fitnesswithgomzi@gmail.com (Merchant ID: CiS87S7GTMLS25)
	razorpay_fgiit: 'RAZORPAY_FGIIT', // Registered Email: fgiitsurat@gmail.com (Merchant ID: IwHEpNNtAPrDLR)
	razorpay_fgmeals: 'RAZORPAY_FGMEALS', // Registered Email: gomzinutrition@gmail.com (Merchant ID: OejSEaaVBvxRmf)
	razorpay_gomzi_consulting: 'RAZORPAY GOMZI CONSULTING', // Registered Email: ashishjani672@gmail.com (Merchant ID: PJ728F7GxhfZkN)
};

module.exports.orderStatus = {
	success: 'SUCCESS', // After Successful Payment
	pending: 'PENDING', // Before Successful Payment
	failed: 'FAILED', // Failed due to not paid for long time
	cancelled: 'CANCELLED', // Cancelled by user
	refunded: 'REFUNDED', // Refunded by admin
};

module.exports.itemType = {
	meals: 'FG_MEAL_PRODUCT', // Ref.: Product
	pt_plan: 'PT_PLAN', // Ref.: FWG > PT Plan
	fitness_course: 'FITNESS_COURSE', // Ref.: FG IIT > Fitness Course,
	digital_plan: 'DIGITAL_PLAN', // Ref.: FG Digital > Digital Plan
	books: 'BOOKS', // Ref.: Books [FGIIT]
	ebooks: 'EBOOKS', // Ref.: E-Books [FGIIT]
	item_cart: 'CART',
	inpta: 'INPTA',
	pure_go_meals: 'PURE_GO_MEAL_PRODUCT',
	medical_product: 'MEDICAL_PRODUCT',
};

module.exports.userService = {
	meals: 'FG-MEALS',
	digital: 'FG-DIGITAL',
	fgiit: 'FGIIT',
	fitness: 'FWG',
	businessListing: 'BUSINESS-LISTING',
	inptaListing: 'INPTA-LISTING',
};

module.exports.timeUnit = {
	day: 'DAY',
	week: 'WEEK',
	month: 'MONTH',
	year: 'YEAR',
};

module.exports.otpViaCode = {
	mobileVerification: 'MOBILE VERIFICATION',
	emailVerification: 'EMAIL VERIFICATION',
};

module.exports.shipmentStatus = {
	placed: 'PLACED',
	dispatched: 'DISPATCHED',
	delivered: 'DELIVERED',
	cancelled: 'CANCELLED',
	returned: 'RETURN',
};

module.exports.feedbackStatus = {
	pending: 'PENDING',
	approved: 'APPROVED',
	rejected: 'REJECTED',
};

module.exports.leaveStatus = {
	pending: 'PENDING',
	approved: 'APPROVED',
	rejected: 'REJECTED',
};

module.exports.taskStatus = {
	pending: 'PENDING',
	completed: 'COMPLETED',
	rejected: 'REJECTED',
};

module.exports.ActionTopic = {
	demoLecture: 'Demo Lecture',
	RTPSession: 'Demo RTP Session',
};

module.exports.projectSubmissionStatus = {
	submitted: 'Submitted',
	reassigned: 'Reassigned',
	rejected: 'Rejected',
	approved: 'Approved',
};

module.exports.examQuestionType = {
	mcq: 'MCQ',
};

module.exports.CourseCategory = {
	online: 'Online Course',
	offline: 'Offline Course',
	flexible: 'Flexible Learning',
};

module.exports.CourseCoachingMode = {
	virtual: 'VIRTUAL',
	physical: 'PHYSICAL',
};

module.exports.CertificateGenerateType = {
	auto: 'AUTO',
	manual: 'MANUAL',
};

module.exports.CacheConstants = require('./cache_key');

module.exports.businessTypes = {
	personal: 'personal',
	business: 'business',
};

module.exports.inptaTypes = {
	personal: 'personal',
	business: 'business',
};

module.exports.contactType = {
	mobile: 'mobile',
	email: 'email',
	whatsapp: 'whatsapp',
	landline: 'landline',
	website: 'website',
};

module.exports.socialMediaTypes = {
	facebook: 'facebook',
	instagram: 'instagram',
	twitter: 'twitter',
	youtube: 'youtube',
	linkedin: 'linkedin',
	pinterest: 'pinterest',
	telegram: 'telegram',
	whatsapp: 'whatsapp',
	website: 'website',
};

module.exports.businessApprovalStatus = {
	pending: 'PENDING',
	approved: 'APPROVED',
	rejected: 'REJECTED',
	banned: 'BANNED',
};

module.exports.inptaApprovalStatus = {
	pending: 'PENDING',
	approved: 'APPROVED',
	rejected: 'REJECTED',
	banned: 'BANNED',
};

module.exports.ChatRecordType = {
	text: 'text',
	image: 'image',
	video: 'video',
	audio: 'audio',
	pdf: 'pdf',
};

module.exports.PeriodsType = {
	daily: 'daily',
	weekly: 'weekly',
	monthly: 'monthly',
	quarterly: 'quarterly',
	yearly: 'yearly',
};

const jobPostClickTypes = ['sms', 'call', 'email', 'whatsapp', 'click'];
module.exports.jobPostClickTypes = jobPostClickTypes;

module.exports.SubscriptionType = {
	created: 'created',
	authenticated: 'authenticated',
	active: 'active',
	pending: 'pending',
	halted: 'halted',
	cancelled: 'cancelled',
	completed: 'completed',
	expired: 'expired',
};

const frequency_interval = {
	daily: 'daily',
	weekly: 'weekly',
	biweekly: 'biweekly',
	monthly: 'monthly',
	yearly: 'yearly',
};
module.exports.FrequencyInterval = frequency_interval;

module.exports.leadStatus = {
	success: 'SUCCESS',
	failed: 'FAILED',
};
