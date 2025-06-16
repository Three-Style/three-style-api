/**
 * @author Brijesh Prajapati
 * @description Webhook Controller
 */

const webhookRoutes = require('express').Router({ caseSensitive: false });

// -- Controllers --

const { webhookController: controller } = require('../controllers');

// Facebook verify Webhooks
webhookRoutes.get('/facebook', controller.facebookVerifyController);
webhookRoutes.post('/facebook', controller.facebookLeadController);
webhookRoutes.post('/google-sheets', controller.googleSheetController);

module.exports = webhookRoutes;
