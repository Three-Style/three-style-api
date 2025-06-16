const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { ExpenseRepo } = require('../../../database');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { DayJS, Joi } = require('../../../services');
const { isArray, isNumber, isUndefined } = require('lodash');
const { JoiObjectIdValidator, JoiSearchSchema, JoiPaginationSchema, JoiSortSchema } = require('../../../helpers/joi-custom-validators.helpers');
const { deleteCache } = require('../../cache-manager/cache-manager');
const { GetExpenseStatsPrefix } = require('../../../common/cache_key');
const { ObjectId } = require('mongoose').Types;

let _exampleExpense = [{ item_name: 'Example name', amount: 1000 }];

module.exports.createExpense = async (req, res) => {
	req.logger.info('Controllers > Admin > Expense > Create Expense');

	try {
		const { adminAuthData } = req.headers;
		const { date, items, payment_method, total_amount, note, expense_company, expense_number, expense_category } = req.body;

		let payload = {
			createdById: adminAuthData.id,
			updatedById: adminAuthData.id,
		};

		if (DayJS(date, 'YYYY/MM/DD', true).isValid() === false) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid date. It must be in YYYY/MM/DD format.');
		} else {
			payload.date = new Date(date);
		}

		if (!expense_company) return response(res, httpStatus.BAD_REQUEST, 'Expense company is required.');
		else payload.expense_company = expense_company;

		if (expense_number) {
			if (isNaN(expense_number)) {
				return response(res, httpStatus.BAD_REQUEST, 'Expense number must be a number.');
			}

			let isAnotherExpenseExists = await ExpenseRepo.exists({ expense_number: expense_number, expense_company: expense_company });

			if (isAnotherExpenseExists) {
				return response(res, httpStatus.BAD_REQUEST, `Expense number ${expense_number} already exists for "${expense_company}" expense.`);
			}

			payload.expense_number = Number(expense_number);
		} else {
			payload.expense_number = await getNextExpenseSequence(expense_company);
		}

		if (!expense_category) {
			return response(res, httpStatus.BAD_REQUEST, 'Expense Category is required.');
		} else {
			payload.expense_category = expense_category;
		}

		if (items) {
			if (!isArray(items)) {
				return response(res, httpStatus.BAD_REQUEST, 'Products must be an array.', { example: _exampleExpense });
			}

			payload.items = [];

			for (let item of items) {
				let _obj = {};

				if (!item.item_name) {
					return response(res, httpStatus.BAD_REQUEST, 'Item name is required.', { example: _exampleExpense });
				}

				if (!item.amount) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Amount is required.', { example: _exampleExpense });
				}

				_obj.item_name = item.item_name;
				_obj.amount = item.amount;

				payload.items.push(_obj);
			}
		}

		if (!payment_method) {
			return response(res, httpStatus.BAD_REQUEST, 'Payment method is required.');
		} else {
			payload.payment_method = payment_method;
		}

		if (!total_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'total amount is required.');
		} else if (!isNumber(total_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'total amount must be a number.');
		} else if (total_amount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'total amount must be greater than 0.');
		} else {
			payload.total_amount = Number(total_amount);
		}

		if (note) {
			payload.note = String(note).trim();
		}

		return ExpenseRepo.create(payload)
			.then((result) => {
				deleteCache('General', { prefix: [GetExpenseStatsPrefix] });
				return response(res, httpStatus.CREATED, 'Expense created successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.getExpense = async (req, res) => {
	req.logger.info('Controllers > Admin > Expense > Get Expense');

	try {
		let findQuery = {};

		const ValidationSchema = Joi.object({
			id: Joi.string().custom(JoiObjectIdValidator).optional(),
			expense_company: Joi.string().optional(),
			from_date: Joi.date().optional(),
			to_date: Joi.date().optional(),
		})
			.concat(JoiSearchSchema)
			.concat(JoiPaginationSchema)
			.concat(JoiSortSchema);

		const { error, value } = ValidationSchema.validate(req.query, { stripUnknown: true, convert: true });
		if (error) return response(res, error);
		else req.query = value;

		if (req.query.id) {
			if (!ObjectId.isValid(req.query.id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid Expense id.');
			}

			findQuery._id = ObjectId.createFromHexString(req.query.id);
		}

		if (req.query.expense_company) {
			findQuery.expense_company = req.query.expense_company;
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

		const SearchFields = ['_id', 'expense_number', 'expense_category', 'payment_method', 'items[].item_name'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await ExpenseRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		// DB: Find
		return ExpenseRepo.find(findQuery)
			.skip(pagination.skip)
			.limit(pagination.limit)
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

module.exports.updateExpense = async (req, res) => {
	req.logger.info('Controllers > Admin > Expense > Update Expense');

	try {
		const { adminAuthData } = req.headers;
		const { id, date, items, payment_method, expense_category, total_amount, note, expense_number } = req.body;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid expense id.');
		}

		let getExpense = await ExpenseRepo.findOne({ _id: id });

		if (!getExpense) {
			return response(res, httpStatus.NOT_FOUND, 'Expense not found.', { id });
		}

		if (expense_number) {
			if (isNaN(expense_number)) {
				return response(res, httpStatus.BAD_REQUEST, 'Expense number must be a number.');
			}

			let isAnotherExpenseExists = await ExpenseRepo.exists({ expense_number: expense_number, expense_company: getExpense.expense_company, _id: { $ne: getExpense._id } });

			if (isAnotherExpenseExists) {
				return response(res, httpStatus.BAD_REQUEST, `Expense number ${expense_number} already exists for "${getExpense.expense_company}" expense.`);
			}

			getExpense.expense_number = expense_number;
		}

		getExpense.updatedById = adminAuthData.id;

		if (date) {
			if (DayJS(date, 'YYYY/MM/DD', true).isValid() === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid date. It must be in YYYY/MM/DD format.');
			} else {
				getExpense.date = new Date(date);
			}
		}

		if (items) {
			if (!isArray(items)) {
				return response(res, httpStatus.BAD_REQUEST, 'Products must be an array.', { example: _exampleExpense });
			}

			let itemsArr = getExpense.items || [];

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
					return response(res, httpStatus.BAD_REQUEST, 'Item name is required.', { example: _exampleExpense });
				}

				if (!item.amount) {
					return response(res, httpStatus.BAD_REQUEST, 'Item Amount is required.', { example: _exampleExpense });
				}

				_obj.item_name = item.item_name;
				_obj.amount = item.amount;

				if (index !== -1) {
					itemsArr[index] = _obj;
				} else {
					itemsArr.push(_obj);
				}
			}

			if (itemsArr.length === 0) return response(res, httpStatus.BAD_REQUEST, 'At least one item is required.', { example: _exampleExpense });

			getExpense.set('items', itemsArr);
		}

		if (!payment_method) {
			return response(res, httpStatus.BAD_REQUEST, 'Payment method is required.');
		} else {
			getExpense.payment_method = payment_method;
		}

		let totalAmount = total_amount || getExpense.total_amount;
		if (isUndefined(totalAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount is required.');
		} else if (!isNumber(totalAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be a number.');
		} else if (totalAmount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be greater than 0.');
		} else {
			getExpense.total_amount = Number(totalAmount);
		}

		if (note) {
			getExpense.note = String(note).trim();
		}

		if (expense_category) {
			getExpense.expense_category = String(expense_category).trim();
		}

		getExpense
			.save()
			.then((result) => {
				deleteCache('General', { prefix: [GetExpenseStatsPrefix] });
				return response(res, httpStatus.OK, 'Expense updated successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.deleteExpense = async (req, res) => {
	req.logger.info('Controllers > Admin > Expense > Delete expense');

	try {
		const { id } = req.query;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid expense id.');
		}

		let getExpense = await ExpenseRepo.findOne({ _id: id });

		if (!getExpense) {
			return response(res, httpStatus.NOT_FOUND, 'Expense not found.', { id });
		}

		getExpense
			.deleteOne()
			.then(() => {
				deleteCache('General', { prefix: [GetExpenseStatsPrefix] });
				return response(res, httpStatus.OK, 'Expense deleted successfully.');
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.getNextExpenseSequence = async (req, res) => {
	req.logger.info('Controllers > Admin > Expense > Get Next Expense Sequence');

	try {
		const { expense_company } = req.query;

		if (!expense_company) return response(res, httpStatus.BAD_REQUEST, 'Expense Company is required.');

		let nextExpenseNumber = await getNextExpenseSequence(expense_company);

		return response(res, httpStatus.OK, 'success', { next_expense_number: nextExpenseNumber, expense_company });
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

async function getNextExpenseSequence(expense_company) {
	let findNextUniqueSequence = true;
	let countQuery = { expense_company: expense_company };
	let nextExpenseNumber = await ExpenseRepo.countDocuments(countQuery);
	do {
		nextExpenseNumber++;

		let isExpenseExists = await ExpenseRepo.exists({ expense_number: nextExpenseNumber, expense_company: expense_company });
		if (!isExpenseExists) {
			findNextUniqueSequence = false;
		}
	} while (findNextUniqueSequence);

	return nextExpenseNumber;
}
