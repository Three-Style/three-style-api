const { emitEvents } = require('../constants');
const { EmployeeChatsRepo } = require('../../database');
const { isUndefined } = require('lodash');
const { ChatRecordType } = require('../../common');
const { ObjectId } = require('mongoose').Types;

/**
 *
 * @param {Server} io
 * @param {Socket} socket
 * @param {{
 * to: String,
 * message: String,
 * file_url: String,
 * type: String
 * }} payload
 * @param {} cb
 * @returns
 */
const onMessage = (io, socket, payload, cb = () => {}) => {
	if (isUndefined(payload.to) || !ObjectId.isValid(payload.to)) {
		return cb({ error: 'receiver ID is required' });
	}

	if (isUndefined(payload.type) || !Object.values(ChatRecordType).includes(payload.type)) {
		return cb({ error: 'valid message type is required. Valid types are ' + Object.keys(ChatRecordType).join(',') });
	}

	EmployeeChatsRepo.create({
		from: socket.employeeID,
		to: payload.to,
		message: payload.message,
		files: payload.file_url,
		type: payload.type,
	})
		.then((result) => {
			socket.to(payload.to).emit(emitEvents.SendMessage, result);
			return cb({ message: 'OK' });
		})
		.catch((error) => {
			return cb({ error: error.message });
		});
};
module.exports.onMessage = onMessage;
