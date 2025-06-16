/**
 * @author Brijesh Prajapati
 * @description Webhook Controller for Razorpay
 */

const razorpayRoutes = require('express').Router({ caseSensitive: false });

// -- Controllers --

const { razorpayController: controller } = require('../controllers');

// Payment Webhooks
razorpayRoutes.post('/capture', controller.webhookHandler);
razorpayRoutes.post('/payment-capture', controller.paymentCaptureWebhookController);
razorpayRoutes.post('/subscription-capture', controller.subscriptionCaptureWebhookController);

module.exports = razorpayRoutes;
