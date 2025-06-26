const { isUndefined } = require('lodash');
const { itemType } = require('../../common');
const { OrderCartsRepo, ProductsRepo } = require('../../database');
const { JoiObjectIdValidator } = require('../../helpers/joi-custom-validators.helpers');
const { convertToObjectId } = require('../../helpers/mongodb-query-builder.helpers');
const { Joi } = require('../../services');

const validItemType = [itemType.clothing];

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string} params.user_id
 * @param {string} params.cart_id
 * @param {string} params.item_type
 * @param {boolean} params.is_purchased
 */
function getActiveCart(params) {
	const paramsSchema = Joi.object()
		.keys({
			user_id: Joi.custom(JoiObjectIdValidator).optional(),
			cart_id: Joi.custom(JoiObjectIdValidator).optional(),
			item_type: Joi.string()
				.valid(...validItemType)
				.optional(),
			is_purchased: Joi.boolean().optional(),
		})
		.default({});

	const { error, value } = paramsSchema.validate(params);

	if (error) throw error;
	params = value;

	let findQuery = {};

	if (params.user_id) findQuery.user_id = convertToObjectId(params.user_id);
	if (params.cart_id) findQuery._id = convertToObjectId(params.cart_id);
	if (params.item_type) findQuery.item_type = params.item_type;
	if (!isUndefined(params.is_purchased)) findQuery.is_purchased = params.is_purchased;

	return OrderCartsRepo.find(findQuery);
}
module.exports.getActiveCart = getActiveCart;

/**
 * @author Brijesh Prajapati
 * @description Add Item to Cart
 * @param {object} params
 * @param {string} params.user_id
 * @param {string} params.item_id
 * @param {string} params.item_type
 * @param {number} params.quantity
 */
async function addItemToCart(params) {
	const paramsSchema = Joi.object()
		.keys({
			user_id: Joi.custom(JoiObjectIdValidator).required(),
			item_id: Joi.custom(JoiObjectIdValidator).required(),
			item_type: Joi.string()
				.valid(...validItemType)
				.required(),
			quantity: Joi.when('item_type', {
				is: Joi.valid(itemType.clothing),
				then: Joi.number().integer().min(1).default(1).required(),
				otherwise: Joi.number().default(1),
			}),
			notes: Joi.object({}).optional(),
		})
		.required();

	const { error, value } = paramsSchema.validate(params);
	if (error) throw error;
	params = value;

	params.user_id = convertToObjectId(params.user_id);
	params.item_id = convertToObjectId(params.item_id);

	// Validate Items
	if (params.item_type === itemType.clothing) {
		let findQuery = {
			_id: params.item_id,
		};

		const isProductExist = await ProductsRepo.exists(findQuery);

		if (!isProductExist) {
			throw new Error('Product does not exist for given id');
		}
	}

	// Find Active Cart
	let activeCart = await getActiveCart({
		user_id: params.user_id,
		item_type: params.item_type,
		is_purchased: false,
	});

	if (!activeCart.length) {
		activeCart = await OrderCartsRepo.create({
			user_id: params.user_id,
			item_type: params.item_type,
		});
	} else {
		activeCart = activeCart[0];
	}

	// Update or Insert Item Object
	const itemIndex = activeCart.items.findIndex((item) => {
		if (params.item_type === itemType.clothing) {
			return item.item_id.equals(params.item_id);
		}

		return item.item_id.equals(params.item_id);
	});

	if (itemIndex === -1) {
		// Insert new item
		return OrderCartsRepo.findOneAndUpdate(
			{ _id: activeCart._id },
			{ $push: { items: { item_id: params.item_id, item_type: params.item_type, quantity: params.quantity, notes: params.notes } } },
			{ new: true }
		).orFail();
	} else {
		// Update existing item
		return OrderCartsRepo.findOneAndUpdate(
			{ _id: activeCart._id, 'items.item_id': params.item_id },
			{ $set: { 'items.$.quantity': params.quantity, 'items.$.updatedAt': new Date(), 'items.$.notes': params.notes } },
			{ new: true }
		).orFail();
	}
}
module.exports.addItemToCart = addItemToCart;

/**
 * @author Brijesh Prajapati
 * @description It will remove item from given cart id
 * @param {Object} params
 * @param {string} params.user_id
 * @param {string} params.cart_id
 * @param {string} params.item_id
 */
async function removeItemFromCart(params) {
	const paramsSchema = Joi.object().keys({
		user_id: Joi.custom(JoiObjectIdValidator).required(),
		cart_id: Joi.custom(JoiObjectIdValidator).required(),
		item_id: Joi.custom(JoiObjectIdValidator).required(),
	});

	const { error, value } = paramsSchema.validate(params);

	if (error) throw error;
	params = value;

	params.user_id = convertToObjectId(params.user_id);
	params.cart_id = convertToObjectId(params.cart_id);
	params.item_id = convertToObjectId(params.item_id);

	return OrderCartsRepo.findOneAndUpdate(
		{
			_id: params.cart_id,
			is_purchased: false,
			user_id: params.user_id,
			'items._id': params.item_id,
		},
		{
			$pull: {
				items: { _id: params.item_id },
			},
		}
	).orFail();
}
module.exports.removeItemFromCart = removeItemFromCart;
