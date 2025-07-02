/**
 * @author Brijesh Prajapati
 * @description Export Users Controllers
 */

// Account Controllers
module.exports.createAccountController = require('./account/create-account');
module.exports.verification = require('./account/verification');
module.exports.loginController = require('./account/login');
module.exports.getProfileController = require('./account/get-profile');
module.exports.changePasswordController = require('./account/change-password');
module.exports.accountLockController = require('./account/lock-account');
module.exports.deleteAccountController = require('./account/delete-account');
module.exports.resetPasswordController = require('./account/reset-password');
module.exports.resendVerificationController = require('./account/resend-verification');
module.exports.updateProfileController = require('./account/update-user');
module.exports.authorizationUserController = require('./account/authorize-user');
module.exports.enableBusinessListingController = require('./account/enable-business-listing');
module.exports.enableInptaListingController = require('./account/enable-inpta-listing');

// Order Cart
module.exports.orderCartControllers = require('./order-cart/order-cart.controllers');

// Product
module.exports.createMealOrderController = require('./meals/create-order');
module.exports.getProductTrackingController = require('./meals/get-product-tracking');

module.exports.createProductFeedbackController = require('./product-feedback/create-feedback');

// Product Feedback like and remove
module.exports.productLikeController = require('./product-feedback/like-unlike');
module.exports.removeProductReviewController = require('./product-feedback/remove-feedback');

// Order
module.exports.ordersController = require('./order/orders.controller');

module.exports.InvoiceControllers = require('./invoice/invoice.controllers');

// Wishlist
module.exports.AddWishlistController = require('./wishlist/add-wishlist');
module.exports.updateWishlistController = require('./wishlist/update-wishlist');
module.exports.getWishlistController = require('./wishlist/get-wishlist');
module.exports.removeWishlistController = require('./wishlist/remove-wishlist');
