/**
 * @author Brijesh Prajapati
 * @description Export Admin Controllers
 */

// Account Controllers
module.exports.createAccountController = require('./account/create-user');
module.exports.loginController = require('./account/login');
module.exports.loginWithOTPController = require('./account/login-with-otp');
module.exports.getProfileController = require('./account/get-profile');
module.exports.updateProfileController = require('./account/update-profile');
module.exports.changePasswordController = require('./account/change-password');
module.exports.getUniversalAccessController = require('./account/universal-access');

// Admin User Controller
module.exports.getAdminController = require('./admin-user/get-admin');
module.exports.updateAdminProfileController = require('./admin-user/update-profile');
module.exports.resetSubAdminPasswordController = require('./admin-user/reset-password');
module.exports.removeSubAdminPasswordController = require('./admin-user/remove-admin');

// Product
module.exports.AddProductController = require('./products/add-product');
module.exports.updateProductController = require('./products/update-product');
module.exports.getProductController = require('./products/get-product');
module.exports.productTrackingStatusController = require('./products/set-tracking-status');

// Categories
module.exports.AddCategoriesController = require('./categories/add-categories');
module.exports.updateCategoriesController = require('./categories/update-categories');
module.exports.getCategoriesController = require('./categories/get-categories');

// Fabric
module.exports.AddFabricController = require('./fabric/add-fabric');
module.exports.updateFabricController = require('./fabric/update-fabric');
module.exports.getFabricController = require('./fabric/get-fabric');

// Sub Categories
module.exports.AddSubCategoriesController = require('./sub-categories/add-sub-categories');
module.exports.updateSubCategoriesController = require('./sub-categories/update-sub-categories');
module.exports.getSubCategoriesController = require('./sub-categories/get-sub-categories');

// User
module.exports.getUserController = require('./users/get-user');
module.exports.updateUserController = require('./users/update-user');
module.exports.unlockUserController = require('./users/unlock-user');
module.exports.removeUserController = require('./users/remove-user');
module.exports.createUserController = require('./users/create-user');
module.exports.getStudentUserController = require('./users/get-student-user');

// Contact Inquiry Info
module.exports.getContactInquiryController = require('./contact-inquiry/get-inquiry');
module.exports.RTPConsultancy = require('./contact-inquiry/rtp-consultancy');

// Dashboard
module.exports.getDashboardController = require('./dashboard/get-dashboard');
module.exports.getStudentStatsController = require('./dashboard/get-student-stats');

// Orders
module.exports.getOrdersController = require('./orders/get-order');
module.exports.getPaymentController = require('./orders/get-order-payment');
module.exports.updateOrderController = require('./orders/update-order');
module.exports.orderCartsControllers = require('./orders/order-cart.controllers');

// Books
module.exports.createBookController = require('./books/create-book');
module.exports.getBookController = require('./books/get-book');
module.exports.updateBookController = require('./books/update-book');
module.exports.removeBookController = require('./books/remove-book');
module.exports.bookTrackingStatusController = require('./books/set-tracking-status');

// Feedback - Products
module.exports.getProductsFeedbackController = require('./products-feedback/get-feedback');
module.exports.updateProductsFeedbackController = require('./products-feedback/update-feedback');

// MFA - Authenticator
module.exports.AuthenticatorController = require('./account/authenticator/authenticator.controller');

// Referral Coupon
module.exports.referralCouponControllers = require('./referral-coupon/referral-coupon.controller');

// oAuth
module.exports.oAuthController = require('./oauth/oauth.controller');

//Cart
module.exports.getCartController = require('./cart/get-cart');

// Invoice
module.exports.invoiceControllers = require('./invoice/invoice.controllers');

// Expense
module.exports.expenseControllers = require('./expense/expense.controllers');

// Wishlist
module.exports.getWishlistController = require('./wishlist/get-wishlist');
