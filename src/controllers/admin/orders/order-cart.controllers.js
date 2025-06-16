const httpStatus = require('http-status');
const response = require('../../../utils/response');
const OrderCartFunctions = require('../../functions/order-cart.functions');

module.exports.getCartController = async (req, res) => {
	try {
		let cart = await OrderCartFunctions.getActiveCart(req.query);

		cart = await Promise.all(
			cart.map(async (c) => {
				await c.populateItems();
				await c.populate('user');
				return c;
			})
		);

		return response(res, httpStatus.OK, 'Cart fetched successfully', cart);
	} catch (error) {
		return response(res, error);
	}
};
