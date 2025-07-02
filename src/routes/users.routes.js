/**
 * @author Brijesh Prajapati
 * @description Routing to Controller for Incoming Request for /user/v1
 */

const userRoute = require('express').Router({ caseSensitive: false });

// -- Config
userRoute.use('/account', require('express').static('src/public/verification-pages'));

// -- Controllers --
const { usersControllers: controller, fileUploadController, publicControllers } = require('../controllers');

// -- Middleware --
const { userAuthenticationMiddleware } = require('../middleware');

// -- Routes --

// Account
userRoute.post('/account/create-account', controller.createAccountController);
userRoute.get('/account/mail-verification', controller.verification.emailVerification); // Route for Email
userRoute.get('/account/lock', controller.accountLockController); // Route for Email
userRoute.post('/account/login', controller.loginController);
userRoute.post('/account/reset-password/:email', controller.resetPasswordController);
userRoute.post('/account/reset-password', controller.changePasswordController);
userRoute.post('/account/mobile-verification', controller.verification.mobileVerification);
userRoute.post('/account/email-verification', controller.verification.emailVerification);
userRoute.post('/account/authorization', controller.authorizationUserController.createLoginUser); // MOBILE OR EMAIL OTP
userRoute.post('/account/authorization/verify', controller.authorizationUserController.verifyUser); // MOBILE OR EMAIL OTP Verify

// * Middleware
userRoute.use(userAuthenticationMiddleware);

// -- Authorized Routes --

// Account
userRoute.get('/account/profile', controller.getProfileController);
userRoute.post('/account/update-profile', controller.updateProfileController);
userRoute.post('/account/change-password', controller.changePasswordController);
userRoute.post('/account/resend-verification-email', controller.resendVerificationController.sendVerificationEmail);
userRoute.post('/account/resend-verification-otp', controller.resendVerificationController.sendVerificationOTP);
userRoute.delete('/account/delete-account', controller.deleteAccountController);
userRoute.post('/account/enable-business-listing', controller.enableBusinessListingController);
userRoute.post('/account/enable-inpta-listing', controller.enableInptaListingController);

// File Upload
userRoute.post('/file-upload', (req, res, next) => ((req.params.directory = 'users'), next()), fileUploadController);

// Product
userRoute.get('/product/get', publicControllers.getProductsController);
userRoute.post('/product/feedback/like', controller.productLikeController);
userRoute.post('/product/feedback/remove', controller.removeProductReviewController);

// Product
userRoute.post('/meals/create-order', controller.createMealOrderController);
userRoute.get('/meals/get-product-tracking', controller.getProductTrackingController);

// Book & Product Feedback
userRoute.post('/feedback/product', controller.createProductFeedbackController);

// Order Cart
userRoute.post('/order-cart/add-item', controller.orderCartControllers.addToCartController);
userRoute.get('/order-cart/get-carts', controller.orderCartControllers.getCartController);
userRoute.delete('/order-cart/remove-item', controller.orderCartControllers.deleteItemFromCartController);
userRoute.patch('/order-cart/mark-as-purchased', controller.orderCartControllers.markCartAsPurchasedController);

// Order
userRoute.get('/orders/get', controller.ordersController.getOrderController);

// Invoice
userRoute.get('/invoice/sign-invoice', controller.InvoiceControllers.signInvoiceController);

// Wishlist
userRoute.post('/wishlist/add', controller.AddWishlistController);
userRoute.post('/wishlist/update', controller.updateWishlistController);
userRoute.get('/wishlist/get', controller.getWishlistController);
userRoute.delete('/wishlist/remove', controller.removeWishlistController);

module.exports = userRoute;
