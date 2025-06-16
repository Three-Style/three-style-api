/**
 * @author Brijesh Prajapati
 * @description Routing to Controller for Incoming Request for /user/v1
 */

const publicRoutes = require('express').Router({ caseSensitive: false });

// -- Controllers --
const { publicControllers: controller, fileUploadController } = require('../controllers');

// -- Routes --

// Product
publicRoutes.get('/products', controller.getProductsController);

// Employee Profile
publicRoutes.post('/employee-application', controller.EmployeeApplicationController);

// Feedback
publicRoutes.get('/feedback/products', controller.getProductsFeedbackController);

// File Upload
publicRoutes.post('/file-upload', (req, res, next) => ((req.params.directory = 'contact-inquiry'), next()), fileUploadController);

//Check Coupon Code
publicRoutes.post('/check-coupon-code', controller.checkCouponCodeController);

module.exports = publicRoutes;
