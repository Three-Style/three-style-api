/**
 * @description Franchise config as required.
 */

/**
 * @description Please add routes only if controller has modified/created for franchise purpose.
 * @returns {[String]} Array of routes
 */
module.exports.allowedRoutes = [
	// Account
	'/get-profile',
	'/update-profile',
	'/change-password',

	// Admin User
	'/admin-user/get-admin',

	// Contact Inquiry
	'/contact-inquiry/get',
	'/contact-inquiry/read-receipt',

	// Dashboard
	'/dashboard/get-dashboard',
];
