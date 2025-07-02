/**
 * @author Brijesh Prajapati
 * @description Routing to Controller for Incoming Request for /admin/v1
 */

const adminRoute = require('express').Router();

// -- Controllers --
const { adminControllers: controller, fileUploadController, seederController } = require('../controllers');
const { DeleteGeneralCache } = require('../controllers/cache-manager');

// -- Middleware --
const { adminAuthenticationMiddleware } = require('../middleware');

// -- Routes --

// Account
// adminRoute.post('/create', controller.createAccountController);
adminRoute.post('/login', controller.loginController);
adminRoute.post('/login-with-otp', controller.loginWithOTPController.Login);
adminRoute.post('/login-with-otp/verify', controller.loginWithOTPController.VerifyOTP);
adminRoute.post('/oauth', controller.oAuthController);

adminRoute.post('/create-admin', controller.createAccountController);
// * Middleware
adminRoute.use(adminAuthenticationMiddleware);

// -- Authorized Routes --

// Account
adminRoute.get('/get-profile', controller.getProfileController);
adminRoute.post('/update-profile', controller.updateProfileController);
adminRoute.post('/change-password', controller.changePasswordController);
adminRoute.get('/get-universal-token', controller.getUniversalAccessController);

// Account
adminRoute.post('/admin-user/reset-password', controller.resetSubAdminPasswordController);
adminRoute.get('/admin-user/get-admin', controller.getAdminController);
adminRoute.post('/admin-user/remove-admin', controller.removeSubAdminPasswordController);
adminRoute.post('/admin-user/update-profile', controller.updateAdminProfileController);

// File Upload
adminRoute.post('/file-upload', fileUploadController);

// Product
adminRoute.post('/product/add', controller.AddProductController);
adminRoute.post('/product/update', controller.updateProductController);
adminRoute.get('/product/get', controller.getProductController);
adminRoute.post('/product/set-tracking-status', controller.productTrackingStatusController);

// Categories
adminRoute.post('/categories/add', controller.AddCategoriesController);
adminRoute.post('/categories/update', controller.updateCategoriesController);
adminRoute.get('/categories/get', controller.getCategoriesController);

// Fabric
adminRoute.post('/fabric/add', controller.AddFabricController);
adminRoute.post('/fabric/update', controller.updateFabricController);
adminRoute.get('/fabric/get', controller.getFabricController);

// Sub Categories
adminRoute.post('/sub-categories/add', controller.AddSubCategoriesController);
adminRoute.post('/sub-categories/update', controller.updateSubCategoriesController);
adminRoute.get('/sub-categories/get', controller.getSubCategoriesController);

// Seeder
adminRoute.patch('/seed/fitness-plan', seederController.fitnessPlan);
adminRoute.patch('/seed/recipe', seederController.recipeData);
adminRoute.patch('/seed/fitness-course', seederController.fitnessCourse);
adminRoute.patch('/seed/scholarship-question', seederController.scholarshipQuestion);
adminRoute.patch('/seed/digital-plan', seederController.digitalPlans);
adminRoute.patch('/seed/meal-products', seederController.mealProducts);

// Users
adminRoute.get('/user/get', controller.getUserController);
adminRoute.post('/user/update', controller.updateUserController);
adminRoute.post('/user/lock', controller.unlockUserController);
adminRoute.post('/user/remove', controller.removeUserController);
adminRoute.post('/user/create', controller.createUserController);
adminRoute.get('/user/get-student-user', controller.getStudentUserController);

// Contact Inquiry
adminRoute.get('/contact-inquiry/get', controller.getContactInquiryController.getInquiry);
adminRoute.post('/contact-inquiry/read-receipt', controller.getContactInquiryController.readReceipt);
adminRoute.get('/contact-inquiry/get-rtp-consultancy', controller.RTPConsultancy.getBookings);

// Dashboard Count
adminRoute.get('/dashboard/get-dashboard', controller.getDashboardController);
adminRoute.get('/dashboard/get-student-stats', controller.getStudentStatsController);

// Orders
adminRoute.get('/orders/get', controller.getOrdersController);
adminRoute.post('/orders/get-payment', controller.getPaymentController);
adminRoute.post('/orders/update-order', controller.updateOrderController);

// Books
adminRoute.post('/book/create', controller.createBookController);
adminRoute.get('/book/get', controller.getBookController);
adminRoute.post('/book/update', controller.updateBookController);
adminRoute.post('/book/remove', controller.removeBookController);
adminRoute.post('/book/set-tracking-status', controller.bookTrackingStatusController);

// Feedback - Products
adminRoute.get('/feedback/products', controller.getProductsFeedbackController);
adminRoute.post('/feedback/products', controller.updateProductsFeedbackController);

// MFA - Authenticator
adminRoute.post('/mfa/authenticator/add-secret', controller.AuthenticatorController.addSecret);
adminRoute.post('/mfa/authenticator/remove-secret', controller.AuthenticatorController.removeSecret);

// Referral Coupon
adminRoute.post('/referral-coupon/create', controller.referralCouponControllers.createCoupon);
adminRoute.post('/referral-coupon/update', controller.referralCouponControllers.updateCoupon);
adminRoute.get('/referral-coupon/get', controller.referralCouponControllers.getCoupon);
adminRoute.get('/referral-coupon/get-usage', controller.referralCouponControllers.getCouponUsage);

// Cache Manager
adminRoute.delete('/cache-manager/general-cache', DeleteGeneralCache);

// Invoice
adminRoute.post('/invoice/create', controller.invoiceControllers.createInvoice);
adminRoute.get('/invoice/get-next-invoice', controller.invoiceControllers.getNextInvoiceSequence);
adminRoute.get('/invoice/get', controller.invoiceControllers.getInvoice);
adminRoute.post('/invoice/update', controller.invoiceControllers.updateInvoice);
adminRoute.delete('/invoice/delete', controller.invoiceControllers.deleteInvoice);
adminRoute.get('/invoice/stats', controller.invoiceControllers.getStats);

// Expense
adminRoute.post('/expense/create', controller.expenseControllers.createExpense);
adminRoute.get('/expense/get-next-expense', controller.expenseControllers.getNextExpenseSequence);
adminRoute.get('/expense/get', controller.expenseControllers.getExpense);
adminRoute.post('/expense/update', controller.expenseControllers.updateExpense);
adminRoute.delete('/expense/delete', controller.expenseControllers.deleteExpense);

// Order Cart
adminRoute.get('/order-cart/get', controller.orderCartsControllers.getCartController);

// Wishlist
adminRoute.get('/wishlist/get', controller.getWishlistController);

module.exports = adminRoute;
