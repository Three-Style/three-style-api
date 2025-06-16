/**
 * @author Brijesh Prajapati
 * @description Set Tracking Status
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { UserBooksRepo } = require('../../../database');
const { isValidObjectId } = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const { shipmentStatus } = require('../../../common');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Book > Set Tracking Status');

	let adminAuthData = req.headers.adminAuthData;
	let { user_book_id, shipment_status, status } = req.body;

	if (!user_book_id || !isValidObjectId(user_book_id)) {
		return response(res, httpStatus.BAD_REQUEST, 'Valid User Book ID is required');
	}

	user_book_id = ObjectId.createFromHexString(user_book_id);

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

	let userBookResult = await UserBooksRepo.findOne({ _id: user_book_id });

	if (userBookResult.tracking) {
		let tracking = userBookResult.tracking.find((data) => data.shipment_status == shipment_status);

		if (tracking == undefined) {
			let pushPayload = {
				shipment_status,
				updatedAt: new Date(),
				updatedBy: adminAuthData.id,
			};

			userBookResult.tracking.push(pushPayload);
			UserBooksRepo.findOneAndUpdate({ _id: user_book_id }, { tracking: userBookResult.tracking }).catch((error) => req.logger.error(error));

			return response(res, httpStatus.OK, 'success');
		} else {
			if ((status == false || status == true) && tracking.status != status) {
				tracking.status = status;
				tracking.updatedAt = new Date();
				tracking.updatedBy = adminAuthData.id;

				UserBooksRepo.updateOne(
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

		userBookResult.tracking = [pushPayload];
		UserBooksRepo.findOneAndUpdate({ _id: user_book_id }, { tracking: userBookResult.tracking }).catch((error) => req.logger.error(error));

		return response(res, httpStatus.OK, 'success');
	}
};
