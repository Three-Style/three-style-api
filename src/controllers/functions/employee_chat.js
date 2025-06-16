const { EmployeeChatsRepo, EmployeeRepo, AdminRepo } = require('../../database');
const { JoiObjectIdValidator, JoiSearchSchema, JoiPaginationSchema, JoiSortSchema } = require('../../helpers/joi-custom-validators.helpers');
const { Joi } = require('../../services');
const { getAccessibleEmployees } = require('./access');
const { ObjectId } = require('mongoose').Types;
const { PaginationHelper } = require('../../helpers');

/**
 * @author Brijesh Prajapati
 * @description To get a list of employees chat history
 * @param {Object} options
 * @param {ObjectId[]} options.from
 * @param {ObjectId[]} options.to
 * @param {ObjectId[]} options.participant fetch all chat where employee is participant
 * @param {ObjectId} options.authorizedEmployeeID
 * @returns {Promise<Array>} - List of chat messages with employee details.
 * @throws {Error} - Throws an error if neither 'from' nor 'to' is provided.
 */

async function getEmployeeChatHistory(options = {}) {
	let chatQuery = {};

	if (options.participant) {
		options.to = options.participant;
		delete options.participant;
	}

	if (options.authorizedEmployeeID) {
		options.from = options.authorizedEmployeeID;
		delete options.authorizedEmployeeID;
	}

	if (options.from && options.to) {
		const fromId = new ObjectId(options.from);
		const toId = new ObjectId(options.to);

		chatQuery.$or = [
			{ from: fromId, to: toId },
			{ from: toId, to: fromId },
		];
	} else if (options.from) {
		chatQuery.from = new ObjectId(options.from);
	} else if (options.to) {
		chatQuery.to = new ObjectId(options.to);
	}

	if (!chatQuery.$or && !chatQuery.from && !chatQuery.to) {
		throw new Error("Invalid query parameters. Either 'from' or 'to' must be provided.");
	}

	return await EmployeeChatsRepo.find(chatQuery).then(async (result) => {
		let allParticipantsIds = result
			.flatMap((chat) => [chat.from, chat.to])
			.flat()
			.map((id) => id.toString());

		let AdminsResult = await AdminRepo.find({ _id: { $in: allParticipantsIds } });

		const EmployeesResult = await Promise.all(
			AdminsResult.map(async (admin) => {
				if (admin.employee_id) {
					return await EmployeeRepo.findOne({ _id: admin.employee_id.toString() });
				}
				return null;
			})
		);

		const validEmployees = EmployeesResult.filter((employee) => employee !== null);

		return result.map((item) => {
			item = item.toObject();

			let sender_full_name, sender_photo, sender_employee_type, sender_id;
			if (item.from) {
				let senderAdmin = AdminsResult.find((admin) => admin._id.equals(new ObjectId(item.from)));
				let senderEmployee = validEmployees.find((employee) => employee._id.equals(new ObjectId(senderAdmin.employee_id)));

				if (senderEmployee) {
					sender_full_name = senderAdmin?.full_name;
					sender_photo = senderEmployee.photo;
					sender_employee_type = 'Employee';
					sender_id = senderEmployee._id;
				} else {
					if (senderAdmin) {
						sender_full_name = senderAdmin.full_name;
						sender_employee_type = senderAdmin.type;
						sender_id = senderAdmin._id;
					}
				}
			}

			item.from_employee = {
				full_name: sender_full_name,
				photo: sender_photo,
				sender_employee_type,
				_id: sender_id,
			};

			let to_full_name, to_photo, to_employee_type, to_id;

			if (item.to) {
				let receiverAdmin = AdminsResult.find((admin) => admin._id.equals(new ObjectId(item.to)));
				let receiverEmployee = validEmployees.find((employee) => employee._id.equals(new ObjectId(receiverAdmin.employee_id)));

				if (receiverEmployee) {
					to_full_name = receiverAdmin.full_name;
					to_photo = receiverEmployee.photo;
					to_employee_type = 'Employee';
					to_id = receiverEmployee._id;
				} else {
					if (receiverAdmin) {
						to_full_name = receiverAdmin.full_name;
						to_employee_type = receiverAdmin.type;
						to_id = receiverAdmin._id;
					}
				}
			}

			item.to_employee = {
				full_name: to_full_name,
				photo: to_photo,
				to_employee_type,
				_id: to_id,
			};

			return item;
		});
	});
}

module.exports.getEmployeeChatHistory = getEmployeeChatHistory;

/**
 * @author Brijesh Prajapati
 * @description To get a list of employees ordered by last chat
 * @param {Object} params
 * @param {ObjectId[]} params.from
 * @param {ObjectId[]} params.to
 * @param {ObjectId[]} params.participant fetch all chat where employee is participant
 * @param {Number} params.limit
 * @param {Number} params.skip
 * @param {String} params.sort
 * @param {String} params.order
 * @param {String} params.authorizedEmployeeID It helps to identify if the authorized employee is sender or receiver
 * @returns {Promise<Object>} - Returns a paginated list of employees with chat details and metadata.
 * @throws {Error} - Throws an error if validation fails.
 */
async function getEmployeesByChat(params = {}) {
	let chatQuery = {};

	const maxLimit = 50;

	const paramsSchema = Joi.object({
		from: Joi.alternatives(
			Joi.array().items(Joi.custom(JoiObjectIdValidator)),
			Joi.string()
				.custom(JoiObjectIdValidator)
				.custom((v) => [v])
		).optional(),
		to: Joi.alternatives(
			Joi.array().items(Joi.custom(JoiObjectIdValidator)),
			Joi.string()
				.custom(JoiObjectIdValidator)
				.custom((v) => [v])
		).optional(),
		participant: Joi.alternatives(
			Joi.array().items(Joi.custom(JoiObjectIdValidator)),
			Joi.string()
				.custom(JoiObjectIdValidator)
				.custom((v) => [v])
		).optional(),
		authorizedEmployeeID: Joi.custom(JoiObjectIdValidator).required(),
	})
		.concat(JoiSearchSchema)
		.concat(
			JoiPaginationSchema.keys({
				limit: Joi.number().optional().default(25).max(maxLimit).min(0),
			})
		)
		.concat(JoiSortSchema);

	const { error, value } = paramsSchema.validate(params, { stripUnknown: true, convert: true });
	if (error) throw error;
	params = value;

	if (params.from && params.to) {
		chatQuery.$or = [
			{
				from: { $in: params.from.map((id) => new ObjectId(id)) },
				to: { $in: params.to.map((id) => new ObjectId(id)) },
			},
			{
				from: { $in: params.to.map((id) => new ObjectId(id)) },
				to: { $in: params.from.map((id) => new ObjectId(id)) },
			},
		];
	} else {
		if (params.from) {
			chatQuery.from = params.from.length === 1 ? new ObjectId(params.from[0]) : { $in: params.from.map((id) => new ObjectId(id)) };
		}
		if (params.to) {
			chatQuery.to = params.to.length === 1 ? new ObjectId(params.to[0]) : { $in: params.to.map((id) => new ObjectId(id)) };
		}
	}

	if (params.participant) {
		chatQuery.$or =
			params.participant.length === 1
				? [{ from: new ObjectId(params.participant[0]) }, { to: new ObjectId(params.participant[0]) }]
				: [{ from: { $in: params.participant.map((id) => new ObjectId(id)) } }, { to: { $in: params.participant.map((id) => new ObjectId(id)) } }];
	}

	let queryEmployee = [];
	if (params.authorizedEmployeeID) queryEmployee.push(new ObjectId(params.authorizedEmployeeID));
	if (params.from) queryEmployee.push(...params.from.map((id) => new ObjectId(id)));
	if (params.to) queryEmployee.push(...params.to.map((id) => new ObjectId(id)));
	if (params.participant) queryEmployee.push(...params.participant.map((id) => new ObjectId(id)));

	let accessibleEmployeesQuery = { project: { _id: true } };
	if (queryEmployee.length > 1) accessibleEmployeesQuery.employees = queryEmployee;

	const accessibleEmployees = await getAccessibleEmployees(params.authorizedEmployeeID, accessibleEmployeesQuery);

	if (accessibleEmployees.length > 0) {
		let mapAccessibleEmployees = accessibleEmployees.map((employee) => new ObjectId(employee._id));
		chatQuery.$or = mapAccessibleEmployees.length === 1 ? [{ from: mapAccessibleEmployees[0] }] : [{ from: { $in: mapAccessibleEmployees } }];
	}

	const pagination = PaginationHelper.getPagination(params, { maxLimit: maxLimit });

	let employeeChatList = await EmployeeChatsRepo.aggregate([
		{ $match: chatQuery },
		{
			$group: {
				_id: { from: '$from', to: '$to' },
				lastChat: { $last: '$createdAt' },
				lastMessage: { $last: '$message' },
				message_id: { $last: '$_id' },
				from: { $last: '$from' },
				to: { $last: '$to' },
			},
		},
		{ $sort: { lastChat: -1 } },
		{
			$facet: {
				totalDocs: [{ $count: 'count' }],
				paginatedResults: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
			},
		},
	]);

	let paginatedResults = employeeChatList[0].paginatedResults;

	let employeesSet = new Set();
	paginatedResults.forEach((item) => {
		employeesSet.add(item.from);
		employeesSet.add(item.to);
	});

	employeesSet = Array.from(employeesSet);

	const AdminsResult = await AdminRepo.find({ _id: { $in: employeesSet } }, { full_name: true, employee_id: true }).lean();
	const employeesPromises = AdminsResult.map((admin) => EmployeeRepo.findOne({ _id: admin.employee_id }, { photo: true }).lean());
	const EmployeesResult = await Promise.all(employeesPromises);
	const validEmployees = EmployeesResult.filter((employee) => employee !== null);

	const totalDocs = employeeChatList[0].totalDocs[0]?.count || 0;
	const PaginationInfo = PaginationHelper.getPaginationInfo(totalDocs, { maxLimit: maxLimit, ...params });

	paginatedResults = paginatedResults.map((item) => {
		item.chat_employees = [];
		delete item._id;

		if (params.authorizedEmployeeID) {
			item.isAuthorizedEmployeeSender = item.from.equals(new ObjectId(params.authorizedEmployeeID));
		}

		let findSenderAdmin = AdminsResult.find((admin) => admin._id.equals(new ObjectId(item.from)));
		let findReceiverAdmin = AdminsResult.find((admin) => admin._id.equals(new ObjectId(item.to)));

		if (findSenderAdmin) {
			item.chat_employees.push({ ...findSenderAdmin, isAdmin: true, isSender: true });
		} else {
			let findEmployee = validEmployees.find((employee) => employee._id.equals(new ObjectId(item.from)));
			item.chat_employees.push({ ...findEmployee, isSender: true });
		}

		if (findReceiverAdmin) {
			findReceiverAdmin = {
				...findReceiverAdmin,
				photo: validEmployees.find((result) => result._id.equals(new ObjectId(findReceiverAdmin.employee_id)))?.photo || null,
			};
			item.chat_employees.push({ ...findReceiverAdmin, isAdmin: true, isReceiver: true });
		} else {
			let findEmployee = validEmployees.find((employee) => employee._id.equals(new ObjectId(item.to)));
			item.chat_employees.push({ ...findEmployee, isReceiver: true });
		}
		return item;
	});

	return {
		data: paginatedResults,
		metadata: { pagination: PaginationInfo },
	};
}

module.exports.getEmployeesByChat = getEmployeesByChat;
