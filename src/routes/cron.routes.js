/**
 * @author Brijesh Prajapati
 * @description Routing to Controller for Incoming Request for /cron/v1
 */

const cronRoutes = require('express').Router();

// -- Controllers --
const { CronJobController: controller } = require('../controllers');

// -- Middleware --
const { adminAuthenticationMiddleware } = require('../middleware');

// -- Routes --

// * Middleware
cronRoutes.use(adminAuthenticationMiddleware);

cronRoutes.post('/:status/:name', controller);

module.exports = cronRoutes;
