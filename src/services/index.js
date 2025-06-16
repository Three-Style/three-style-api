/**
 * @author Brijesh Prajapati
 * @description Distribute All Service to Application
 * @implements [RECOMMEND] Use Particular Service instead of all service and remove unwanted service
 */

module.exports.NODE_ENV = require('./NODE_ENV'); // Do not comment this, Used in many services
module.exports.winston = require('./winston');
module.exports.logger = require('./winston');
module.exports.mongoose = require('./mongoose');
module.exports.firebaseAdmin = require('./firebase-admin');
module.exports.jwt = require('./jwt');
module.exports.bcryptjs = require('./bcryptjs');
module.exports.RazorpayClient = require('./razorpay');
module.exports.aws = require('./aws-sdk');
module.exports.multerS3 = require('./multer-s3');
module.exports.multer = require('./multer');
module.exports.nodemailer = require('./nodemailer');
module.exports.nodeCache = require('./node-cache');
module.exports.DayJS = require('./dayjs');
module.exports.Joi = require('./Joi');
module.exports.GeneralCache = require('./node-cache')('General');
