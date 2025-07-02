/**
 * @author Brijesh Prajapati
 * @description Add Product
 */

const httpStatus = require('http-status');
const { WishlistRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Wishlist > Add Wishlist');

	let userAuthData = req.headers.userAuthData;

	const BodySchema = Joi.object({
		user_id: Joi.string().custom(JoiObjectIdValidator).required(),
		product_id: Joi.string().custom(JoiObjectIdValidator).required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { user_id, product_id } = req.body;

	try {
		let payload = {
			user_id,
			product_id,
			createdBy: userAuthData.id,
			updatedBy: userAuthData.id,
		};

		// DB: Create
		return WishlistRepo.create(payload)
			.then((result) => response(res, httpStatus.OK, 'success', result))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something Went Wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
