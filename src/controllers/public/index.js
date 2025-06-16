/**
 * @author Brijesh Prajapati
 * @description Export Public Controllers
 */

// Products [Product, Like, Review, Cart]
module.exports.getProductsController = require('./get-products');

// Employee Profile
module.exports.EmployeeApplicationController = require('./employee/employee-application');

// Feedback
module.exports.getProductsFeedbackController = require('./feedback/get-products-feedback');

//Check Coupon Code
module.exports.checkCouponCodeController = require('./check-coupon-code');
