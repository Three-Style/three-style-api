/**
 * @author Brijesh Prajapati
 * @description Modify Wishlist
 */

const httpStatus = require('http-status');
const { WishlistRepo } = require('../../../database');
const response = require('../../../utils/response');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controllers > User > Wishlist > Remove Wishlist');

	try {
		const { id } = req.query;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid wishlist id.');
		}

		let getWishlist = await WishlistRepo.findOne({ _id: id });

		if (!getWishlist) {
			return response(res, httpStatus.NOT_FOUND, 'Wishlist not found.', { id });
		}

		getWishlist
			.deleteOne()
			.then(() => {
				return response(res, httpStatus.OK, 'Wishlist deleted successfully.');
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
