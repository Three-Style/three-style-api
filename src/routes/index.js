// Import Controller and Allocate Route
const adminRoutes = require('./admin.routes');
const usersRoutes = require('./users.routes');
const publicRoutes = require('./public.routes');
const RazorpayRoutes = require('./razorpay.routes');
const CronRoutes = require('./cron.routes');
const WebhookRoutes = require('./webhook.routes');
const DebuggingRoutes = require('./debug.routes');
module.exports = { adminRoutes, usersRoutes, publicRoutes, RazorpayRoutes, WebhookRoutes, CronRoutes, DebuggingRoutes };
