const httpStatus = require('http-status');
const response = require('../../../utils/response');
const OrderCartFunctions = require('../../functions/order-cart.functions');
const { OrderCartsRepo } = require('../../../database');
const { MongoDBErrorParser } = require('../../../helpers');

module.exports.addToCartController = async (req, res) => {
	try {
		let { userAuthData } = req.headers;
		let user_id = userAuthData.id;
		const { item_id, item_type, quantity, notes } = req.body;

		const params = { user_id, item_id, item_type, quantity, notes };
		const cart = await OrderCartFunctions.addItemToCart(params);

		return response(res, httpStatus.OK, 'Item added to cart successfully', cart);
	} catch (error) {
		return response(res, error);
	}
};

module.exports.getCartController = async (req, res) => {
	try {
		let { userAuthData } = req.headers;
		let user_id = userAuthData.id;

		let params = { user_id, is_purchased: false };

		if (!req.query.item_type) {
			return response(res, httpStatus.BAD_REQUEST, 'item_type is required');
		} else {
			params.item_type = req.query.item_type;
		}

		let cart = await OrderCartFunctions.getActiveCart(params);

		cart = await Promise.all(cart.map((c) => c.populateItems()));

		return response(res, httpStatus.OK, 'Cart fetched successfully', cart);
	} catch (error) {
		return response(res, error);
	}
};

module.exports.deleteItemFromCartController = async (req, res) => {
	try {
		let { userAuthData } = req.headers;
		let user_id = userAuthData.id;
		const { item_id, cart_id } = req.query;

		const params = { user_id, item_id, cart_id };

		await OrderCartFunctions.removeItemFromCart(params);

		return response(res, httpStatus.OK, 'Item deleted from cart successfully');
	} catch (error) {
		return response(res, MongoDBErrorParser(error));
	}
};

module.exports.markCartAsPurchasedController = async (req, res) => {
	try {
		let { userAuthData } = req.headers;
		let user_id = userAuthData.id;
		const { cart_id } = req.body;

		await OrderCartsRepo.findOneAndUpdate({ _id: cart_id, user_id }, { is_purchased: true }).orFail();

		return response(res, httpStatus.OK, 'Cart marked as purchased successfully');
	} catch (error) {
		return response(res, MongoDBErrorParser(error));
	}
};
