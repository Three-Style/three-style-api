/**
 * @author Brijesh Prajapati
 * @description Export All Schemas
 */

// Admin
module.exports.AdminRepo = require('./admins');

// Categories
module.exports.CategoriesRepo = require('./categories');

// Sub Categories
module.exports.SubCategoriesRepo = require('./sub_categories');

// Fabric
module.exports.FabricRepo = require('./fabric');

// Product
module.exports.ProductsRepo = require('./products');
module.exports.ProductLikeRepo = require('./product_like');
module.exports.ProductCartRepo = require('./product_cart');

// Orders
module.exports.OrdersRepo = require('./orders');
module.exports.InvoiceRepo = require('./invoice');
module.exports.OrderCartsRepo = require('./order_carts');

//Expense
module.exports.ExpenseRepo = require('./expense');

// Contact Inquiry
module.exports.ContactInquiryRepo = require('./contact_inquiry');

// Users
module.exports.UserRepo = require('./users');

// Otp
module.exports.OtpRepo = require('./otp');

// Book
module.exports.BooksRepo = require('./books');

// Employee & Employer
module.exports.EmployeeRepo = require('./employee');

module.exports.ProductFeedbackRepo = require('./products_feedback');

// E-Books
module.exports.EBookRepo = require('./e-books');

// Referral Coupon
module.exports.ReferralCouponRepo = require('./referral-coupon');
