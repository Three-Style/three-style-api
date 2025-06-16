// Export All Controller
const adminControllers = require('./admin');
const usersControllers = require('./users');
const publicControllers = require('./public');
const fileUploadController = require('./file-upload');
const razorpayController = require('./razorpay');
const seederController = require('./seeder');
const CronJobController = require('./cron-jobs');
const webhookController = require('./webhook');

module.exports = { adminControllers, usersControllers, publicControllers, fileUploadController, razorpayController, seederController, CronJobController, webhookController };
