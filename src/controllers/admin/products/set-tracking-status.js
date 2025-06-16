/**
 * @author Brijesh Prajapati
 * @description Set Tracking Status
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { UserMealProductRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const { shipmentStatus } = require('../../../common');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Products > Set Tracking Status');

	let adminAuthData = req.headers.adminAuthData;
	let { user_product_id, shipment_status, status } = req.body;

	if (!user_product_id || !isValidObjectId(user_product_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Valid User Product ID is required');
	}

	user_product_id = ObjectId.createFromHexString(user_product_id);

	let valid_shipment_status = Object.values(shipmentStatus);

	if (!shipment_status) {
		return response(res, httpStatus.BAD_REQUEST, 'Shipment Status is required', { valid_shipment_status });
	}

	if (!(status == true || status == false)) {
		return response(res, httpStatus.BAD_REQUEST, 'Valid status is required');
	}

	if (!valid_shipment_status.includes(shipment_status)) {
		return response(res, httpStatus.BAD_REQUEST, 'Shipment Status is invalid', { valid_shipment_status });
	}

	let userProductResult = await UserMealProductRepo.findOne({ _id: user_product_id });

	if (!userProductResult) {
		return response(res, httpStatus.BAD_REQUEST, 'No Order found');
	}

	if (userProductResult.tracking) {
		let tracking = userProductResult.tracking.find((data) => data.shipment_status == shipment_status);

		if (tracking == undefined) {
			let pushPayload = {
				shipment_status,
				updatedAt: new Date(),
				updatedBy: adminAuthData.id,
			};

			userProductResult.tracking.push(pushPayload);
			UserMealProductRepo.findOneAndUpdate({ _id: user_product_id }, { tracking: userProductResult.tracking }).catch((error) => req.logger.error(error));

			return response(res, httpStatus.OK, 'success');
		} else {
			if ((status == false || status == true) && tracking.status != status) {
				tracking.status = status;
				tracking.updatedAt = new Date();
				tracking.updatedBy = adminAuthData.id;

				UserMealProductRepo.updateOne(
					{ 'tracking._id': tracking._id },
					{
						$set: {
							'tracking.$': tracking,
						},
					}
				).catch((error) => req.logger.error(error));

				return response(res, httpStatus.OK, 'success');
			}
		}
	} else {
		let pushPayload = {
			shipment_status,
			updatedAt: new Date(),
			updatedBy: adminAuthData.id,
		};

		userProductResult.tracking = [pushPayload];
		UserMealProductRepo.findOneAndUpdate({ _id: user_product_id }, { tracking: userProductResult.tracking }).catch((error) => req.logger.error(error));

		return response(res, httpStatus.OK, 'success');
	}
};
