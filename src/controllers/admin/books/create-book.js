/**
 * @author Brijesh Prajapati
 * @description Create New Book
 */

const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { BooksRepo } = require('../../../database');
const { Joi } = require('../../../services');
const { MongoDBErrorParser } = require('../../../helpers');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Book > Create Book');

	let adminAuthData = req.headers.adminAuthData;

	const BodySchema = Joi.object({
		book_title: Joi.string().required(),
		description: Joi.string().allow(''),
		amount: Joi.number().min(1).required(),
		cover_image: Joi.string()
			.uri({
				relativeOnly: true,
			})
			.allow(''),
	});

	const { error, value } = BodySchema.validate(req.body, { abortEarly: false });
	if (error) return response(res, error);

	let { book_title, description, amount, cover_image } = value;

	let payload = {
		createdBy: adminAuthData.id,
		updatedBy: adminAuthData.id,
		book_title: book_title,
		description: description,
		amount: amount,
	};

	if (cover_image) {
		payload.cover_image = String(cover_image);
	}

	BooksRepo.create(payload)
		.then((bookResult) => {
			return response(res, httpStatus.OK, 'Book created successfully', bookResult);
		})
		.catch((error) => {
			return response(res, MongoDBErrorParser(error));
		});
};
