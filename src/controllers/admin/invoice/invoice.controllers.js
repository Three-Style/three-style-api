const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { InvoiceRepo } = require('../../../database');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { DayJS, Joi } = require('../../../services');
const { regexValidateUtil } = require('../../../utils');
const { isArray, isObject, isNumber, isUndefined } = require('lodash');
const { JoiObjectIdValidator, JoiPaginationSchema, JoiSortSchema, JoiSearchSchema } = require('../../../helpers/joi-custom-validators.helpers');
const { deleteCache } = require('../../cache-manager/cache-manager');
const { GetInvoiceStatsPrefix } = require('../../../common/cache_key');
const { isValidObjectId } = require('../../../helpers/mongodb-query-builder.helpers');
const { ObjectId } = require('mongoose').Types;

let _exampleProduct = [{ item_name: 'Example Product', amount: 1000, totalAmount: 2000, quantity: 2 }],
	_exampleBillingAddress = {
		address_line_1: 'value',
		city: 'value',
		state: 'value',
		zip_code: 'value',
	},
	_exampleBankDetails = {
		account_type: 'value',
		bank_name: 'value',
		account_number: 'value',
		branch_code: 'value',
	};

module.exports.createInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Create Invoice');

	try {
		const { adminAuthData } = req.headers;
		const { date, name, email, mobile, billing_address, items, bank_details, payment_method, net_amount, paid_amount, note, invoice_category, invoice_number, branch_name, user_id } = req.body;

		let payload = {
			createdById: adminAuthData.id,
			updatedById: adminAuthData.id,
		};

		if (DayJS(date, 'YYYY/MM/DD', true).isValid() === false) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid date. It must be in YYYY/MM/DD format.');
		} else {
			payload.date = new Date(date);
		}

		if (!invoice_category) return response(res, httpStatus.BAD_REQUEST, 'Invoice category is required.');
		else payload.invoice_category = invoice_category;

		if (invoice_number) {
			if (isNaN(invoice_number)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invoice number must be a number.');
			}

			let isAnotherInvoiceExists = await InvoiceRepo.exists({ invoice_number: invoice_number, invoice_category: invoice_category });

			if (isAnotherInvoiceExists) {
				return response(res, httpStatus.BAD_REQUEST, `Invoice number ${invoice_number} already exists for "${invoice_category}" invoice.`);
			}

			payload.invoice_number = Number(invoice_number);
		} else {
			payload.invoice_number = await getNextInvoiceSequence(invoice_category);
		}

		if (!name) {
			return response(res, httpStatus.BAD_REQUEST, 'Name is required.');
		} else {
			payload.name = name;
		}

		if (!branch_name) {
			return response(res, httpStatus.BAD_REQUEST, 'branch_name is required.');
		} else {
			payload.branch_name = branch_name;
		}

		if (email) {
			if (regexValidateUtil.email(email) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid email.');
			}
			payload.email = email;
		}

		if (mobile) {
			payload.mobile = mobile;
		}

		if (billing_address) {
			payload.billing_address = {};

			if (isObject(billing_address) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Billing address must be an object.', { example: _exampleBillingAddress });
			}

			if (billing_address.address_line_1) payload.billing_address.address_line_1 = billing_address.address_line_1;
			if (billing_address.city) payload.billing_address.city = billing_address.city;
			if (billing_address.state) payload.billing_address.state = billing_address.state;
			if (billing_address.pin_code) payload.billing_address.pin_code = billing_address.pin_code;
		}

		if (items) {
			if (!isArray(items)) {
				return response(res, httpStatus.BAD_REQUEST, 'Products must be an array.', { example: _exampleProduct });
			}

			payload.items = [];

			for (let item of items) {
				let _obj = {};

				if (!item.item_name) {
					return response(res, httpStatus.BAD_REQUEST, 'Item name is required.', { example: _exampleProduct });
				}

				if (!item.amount) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Amount is required.', { example: _exampleProduct });
				}

				if (!item.totalAmount) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Total Amount is required.', { example: _exampleProduct });
				}

				if (!item.quantity) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Quantity is required.', { example: _exampleProduct });
				}

				_obj.item_name = item.item_name;
				_obj.amount = item.amount;
				_obj.totalAmount = item.totalAmount;
				_obj.quantity = item.quantity;

				payload.items.push(_obj);
			}
		}

		if (bank_details) {
			payload.bank_details = {};

			if (isObject(bank_details) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Bank details must be an object.', { example: _exampleBankDetails });
			}

			if (bank_details.account_type) {
				payload.bank_details.account_type = bank_details.account_type;
			}

			if (bank_details.bank_name) {
				payload.bank_details.bank_name = bank_details.bank_name;
			}

			if (bank_details.account_number) {
				payload.bank_details.account_number = bank_details.account_number;
			}

			if (bank_details.branch_code) {
				payload.bank_details.branch_code = bank_details.branch_code;
			}
		}

		if (!payment_method) {
			return response(res, httpStatus.BAD_REQUEST, 'Payment method is required.');
		} else {
			payload.payment_method = payment_method;
		}

		if (!net_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount is required.');
		} else if (!isNumber(net_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be a number.');
		} else if (net_amount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be greater than 0.');
		} else {
			payload.net_amount = Number(net_amount);
		}

		if (isUndefined(paid_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount is required.');
		} else if (!isNumber(paid_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be a number.');
		} else if (paid_amount < 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be greater than 0.');
		} else if (paid_amount > net_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be less than or equal to net amount.');
		} else {
			payload.paid_amount = Number(paid_amount);
		}

		if (note) {
			payload.note = String(note).trim();
		}

		if (user_id) {
			if (!isValidObjectId(user_id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid user id.');
			}

			payload.user_id = user_id;
		}

		return InvoiceRepo.create(payload)
			.then((result) => {
				deleteCache('General', { prefix: [GetInvoiceStatsPrefix] });
				return response(res, httpStatus.CREATED, 'Invoice created successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.getInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Get Invoice');

	try {
		let findQuery = {};

		const ValidationSchema = Joi.object({
			id: Joi.string().custom(JoiObjectIdValidator).optional(),
			invoice_category: Joi.string().optional(),
			unpaid_only: Joi.boolean().optional(),
			paid_only: Joi.boolean().optional(),
			from_date: Joi.date().optional(),
			to_date: Joi.date().optional(),
			branch_name: Joi.string().optional(),
		})
			.concat(JoiSearchSchema)
			.concat(JoiPaginationSchema)
			.concat(JoiSortSchema);

		const { error, value } = ValidationSchema.validate(req.query, { stripUnknown: true, convert: true });
		if (error) return response(res, error);
		else req.query = value;

		if (req.query.id) {
			if (!ObjectId.isValid(req.query.id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid invoice id.');
			}

			findQuery._id = ObjectId.createFromHexString(req.query.id);
		}

		if (req.query.invoice_category) {
			findQuery.invoice_category = req.query.invoice_category;
		}

		if (req.query.branch_name) {
			findQuery.branch_name = req.query.branch_name;
		}

		if (req.query.from_date || req.query.to_date) {
			findQuery.date = {};

			if (req.query.from_date) {
				findQuery.date.$gte = req.query.from_date;
			}

			if (req.query.to_date) {
				findQuery.date.$lte = req.query.to_date;
			}
		}

		if (req.query.unpaid_only) {
			findQuery.$expr = { $lt: ['$paid_amount', '$net_amount'] };
		} else if (req.query.paid_only) {
			findQuery.$expr = { $eq: ['$paid_amount', '$net_amount'] };
		}

		const SearchFields = ['_id', 'invoice_number', 'name', 'email', 'mobile', 'payment_method', 'items[].item_name', 'user_id'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await InvoiceRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		// DB: Find
		return InvoiceRepo.find(findQuery)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.populate('user', 'first_name last_name email mobile profile_image')
			.sort(SortQuery)
			.lean()
			.then((result) => {
				return response(res, httpStatus.OK, 'success', result, undefined, {
					pagination: PaginationInfo,
					search_fields: SearchFields,
				});
			})
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.updateInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Update Invoice');

	try {
		const { adminAuthData } = req.headers;
		const { id, date, name, email, mobile, billing_address, items, bank_details, payment_method, net_amount, paid_amount, note, invoice_number, branch_name, user_id } = req.body;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid invoice id.');
		}

		let getInvoice = await InvoiceRepo.findOne({ _id: id });

		if (!getInvoice) {
			return response(res, httpStatus.NOT_FOUND, 'Invoice not found.', { id });
		}

		if (invoice_number) {
			if (isNaN(invoice_number)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invoice number must be a number.');
			}

			let isAnotherInvoiceExists = await InvoiceRepo.exists({ invoice_number: invoice_number, invoice_category: getInvoice.invoice_category, _id: { $ne: getInvoice._id } });

			if (isAnotherInvoiceExists) {
				return response(res, httpStatus.BAD_REQUEST, `Invoice number ${invoice_number} already exists for "${getInvoice.invoice_category}" invoice.`);
			}

			getInvoice.invoice_number = invoice_number;
		}

		getInvoice.updatedById = adminAuthData.id;

		if (date) {
			if (DayJS(date, 'YYYY/MM/DD', true).isValid() === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid date. It must be in YYYY/MM/DD format.');
			} else {
				getInvoice.date = new Date(date);
			}
		}

		if (name) {
			getInvoice.name = name;
		}

		if (branch_name) {
			getInvoice.branch_name = branch_name;
		}

		if (email) {
			if (regexValidateUtil.email(email) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid email.');
			}

			getInvoice.email = email;
		}

		if (mobile) {
			getInvoice.mobile = mobile;
		}

		if (billing_address) {
			if (isObject(billing_address) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Billing address must be an object.', { example: _exampleBillingAddress });
			}

			if (billing_address.address_line_1) getInvoice.set('billing_address.address_line_1', billing_address.address_line_1);
			if (billing_address.city) getInvoice.set('billing_address.city', billing_address.city);
			if (billing_address.state) getInvoice.set('billing_address.state', billing_address.state);
			if (billing_address.pin_code) getInvoice.set('billing_address.pin_code', billing_address.pin_code);

			getInvoice.billing_address = billing_address;
		}

		if (items) {
			if (!isArray(items)) {
				return response(res, httpStatus.BAD_REQUEST, 'Products must be an array.', { example: _exampleProduct });
			}

			let itemsArr = getInvoice.items || [];

			for (let item of items) {
				let _obj = {};

				let index;
				if (item._id) {
					index = itemsArr.findIndex((i) => i._id.equals(ObjectId.createFromHexString(item._id)));
					_obj = itemsArr[index];

					if (!_obj) _obj = {};

					if (item.delete === true) {
						itemsArr = itemsArr.filter((i) => !i._id.equals(ObjectId.createFromHexString(item._id)));
						continue;
					}
				}

				if (item.delete === true) {
					continue;
				}

				if (!item.item_name) {
					return response(res, httpStatus.BAD_REQUEST, 'Item name is required.', { example: _exampleProduct });
				}

				if (!item.amount) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Amount is required.', { example: _exampleProduct });
				}

				if (!item.totalAmount) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Total Amount is required.', { example: _exampleProduct });
				}

				if (!item.quantity) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Quantity is required.', { example: _exampleProduct });
				}

				_obj.item_name = item.item_name;
				_obj.amount = item.amount;
				_obj.totalAmount = item.totalAmount;
				_obj.quantity = item.quantity;

				if (index !== -1) {
					itemsArr[index] = _obj;
				} else {
					itemsArr.push(_obj);
				}

				if (index !== -1) {
					itemsArr[index] = _obj;
				} else {
					itemsArr.push(_obj);
				}
			}

			if (itemsArr.length === 0) return response(res, httpStatus.BAD_REQUEST, 'At least one item is required.', { example: _exampleProduct });

			getInvoice.set('items', itemsArr);
		}

		if (bank_details) {
			if (isObject(bank_details) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Bank details must be an object.', { example: _exampleBankDetails });
			}

			if (bank_details.account_type) {
				getInvoice.set('bank_details.account_type', bank_details.account_type);
			}

			if (bank_details.bank_name) {
				getInvoice.set('bank_details.bank_name', bank_details.bank_name);
			}

			if (bank_details.account_number) {
				getInvoice.set('bank_details.account_number', bank_details.account_number);
			}

			if (bank_details.branch_code) {
				getInvoice.set('bank_details.branch_code', bank_details.branch_code);
			}
		}

		if (!payment_method) {
			return response(res, httpStatus.BAD_REQUEST, 'Payment method is required.');
		} else {
			getInvoice.payment_method = payment_method;
		}

		let netAmount = net_amount || getInvoice.net_amount;
		if (isUndefined(netAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount is required.');
		} else if (!isNumber(netAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be a number.');
		} else if (netAmount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be greater than 0.');
		} else {
			getInvoice.net_amount = Number(netAmount);
		}

		let paidAmount = getInvoice.paid_amount;
		if (!isUndefined(paid_amount)) paidAmount = paid_amount;

		if (isUndefined(paidAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount is required.');
		} else if (!isNumber(paidAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be a number.');
		} else if (paidAmount < 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be greater than 0.');
		} else if (paidAmount > net_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be less than or equal to net amount.');
		} else {
			getInvoice.paid_amount = Number(paidAmount);
		}

		if (note) {
			getInvoice.note = String(note).trim();
		}

		if (user_id) {
			if (!isValidObjectId(user_id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid user id.');
			}

			getInvoice.user_id = user_id;
		}

		getInvoice
			.save()
			.then((result) => {
				deleteCache('General', { prefix: [GetInvoiceStatsPrefix] });
				return response(res, httpStatus.OK, 'Invoice updated successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.deleteInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Delete Invoice');

	try {
		const { id } = req.query;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid invoice id.');
		}

		let getInvoice = await InvoiceRepo.findOne({ _id: id });

		if (!getInvoice) {
			return response(res, httpStatus.NOT_FOUND, 'Invoice not found.', { id });
		}

		getInvoice
			.deleteOne()
			.then(() => {
				deleteCache('General', { prefix: [GetInvoiceStatsPrefix] });
				return response(res, httpStatus.OK, 'Invoice deleted successfully.');
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.getNextInvoiceSequence = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Get Next Invoice Sequence');

	try {
		const { invoice_category } = req.query;

		if (!invoice_category) return response(res, httpStatus.BAD_REQUEST, 'Invoice category is required.');

		let nextInvoiceNumber = await getNextInvoiceSequence(invoice_category);

		return response(res, httpStatus.OK, 'success', { next_invoice_number: nextInvoiceNumber, invoice_category });
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

async function getNextInvoiceSequence(invoice_category) {
	let findNextUniqueSequence = true;
	let countQuery = { invoice_category: invoice_category };
	let nextInvoiceNumber = await InvoiceRepo.countDocuments(countQuery);

	do {
		nextInvoiceNumber++;

		let isInvoiceExists = await InvoiceRepo.exists({ invoice_number: nextInvoiceNumber, invoice_category: invoice_category });

		if (!isInvoiceExists) {
			findNextUniqueSequence = false;
		}
	} while (findNextUniqueSequence);

	return nextInvoiceNumber;
}

module.exports.getStats = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Get Stats');
	res.set('Deprecation', true);
	res.set('Warning', 'This endpoint is deprecated and will be removed in future versions. Please use Insights API (/admin/v1/insights/three-style).');

	try {
		const Schema = Joi.object({
			invoice_category: Joi.string().required(),
		});

		const { error } = Schema.validate(req.query);
		if (error) return response(res, httpStatus.BAD_REQUEST, error.message, error);

		let query = [
			{
				$match: req.query,
			},
			{
				$group: {
					_id: undefined,
					total_invoices: { $sum: 1 },
					total_net_amount: { $sum: '$net_amount' },
					total_paid_amount: { $sum: '$paid_amount' },
					total_due_amount: { $sum: { $subtract: ['$net_amount', '$paid_amount'] } },
				},
			},
		];

		let result = await InvoiceRepo.aggregate(query);
		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
