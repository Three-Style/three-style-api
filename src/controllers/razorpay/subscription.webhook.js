/**
 * @author Brijesh Prajapati
 * @description Handles subscription webhooks from Razorpay. Verifies the event type, processes data, and updates the subscription status in the database.
 */

const httpStatus = require('http-status');
const response = require('../../utils/response');
const { SubscriptionRepo } = require('../../database');
const { DayJS } = require('../../services');

module.exports = async (req, res) => {
	let { event, payload } = req.body;
	try {
		const validEvents = ['subscription.activated', 'subscription.authenticated', 'subscription.paused', 'subscription.resumed', 'subscription.cancelled', 'subscription.completed'];

		if (!validEvents.includes(event)) {
			req.logger.error(`Invalid event type: ${event}`);
			return response(res, httpStatus.BAD_REQUEST, 'Invalid event type');
		}

		const subscriptionEntity = payload.subscription.entity;
		const { id: subscription_id, status, plan_id, start_at, end_at, customer_notify } = subscriptionEntity;

		response(res, httpStatus.OK, undefined, undefined, undefined, undefined, { terminateAttachedLogger: false });

		req.logger.info(`Processing subscription event: ${event} for Subscription ID: ${subscription_id}`);

		const subscriptionData = await SubscriptionRepo.findOne({ razorpay_subscription_id: subscription_id });
		if (!subscriptionData) {
			req.logger.error(`Subscription not found in the database for Subscription ID: ${subscription_id}`);
		}

		let updateData = {
			status,
			plan_id,
			start_at: start_at ? DayJS.unix(start_at).toDate() : null,
			end_at: end_at ? DayJS.unix(end_at).toDate() : null,
			customer_notify,
		};

		if (event === 'subscription.activated') {
			updateData.status = 'active';
		} else if (event === 'subscription.authenticated') {
			updateData.status = 'authenticated';
		} else if (event === 'subscription.paused') {
			updateData.status = 'paused';
		} else if (event === 'subscription.cancelled') {
			updateData.status = 'cancelled';
		} else if (event === 'subscription.completed') {
			updateData.status = 'completed';
		} else if (event === 'subscription.resumed') {
			updateData.status = 'resumed';
		}

		const updatedSubscription = await SubscriptionRepo.findOneAndUpdate({ razorpay_subscription_id: subscription_id }, updateData, { new: true });

		if (!updatedSubscription) {
			req.logger.error(`Failed to update subscription status for Subscription ID: ${subscription_id}`);
		}

		req.logger.info(`Successfully updated subscription status to: ${status} for Subscription ID: ${subscription_id}`);
	} catch (error) {
		req.logger.error(`Error processing Razorpay Subscription webhook, Error: ${error.message}`, error);
	} finally {
		// req.logger.close();
	}
};
