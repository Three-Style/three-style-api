/**
 * @author Brijesh Prajapati
 * @description Modify Wishlist
 */

const httpStatus = require('http-status');
const { WishlistRepo } = require('../../../database');
const response = require('../../../utils/response');
const { Joi } = require('../../../services');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Wishlist > Update Wishlist');

	let userAuthData = req.headers.userAuthData;

	const BodySchema = Joi.object({
		id: Joi.string().custom(JoiObjectIdValidator).required(),
		user_id: Joi.string().custom(JoiObjectIdValidator).required(),
		product_id: Joi.string().custom(JoiObjectIdValidator).required(),
	});

	const { error } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { id, user_id, product_id } = req.body;

	try {
		let payload = {
			user_id,
			product_id,
			createdBy: userAuthData.id,
			updatedBy: userAuthData.id,
		};

		// DB: find & update
		return WishlistRepo.findOneAndUpdate({ _id: id }, payload, { new: true })
			.then((result) => (result ? response(res, httpStatus.OK, 'success', result) : response(res, httpStatus.OK, 'Incorrect product id')))
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, 'something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
