/**
 * @author Brijesh Prajapati
 * @description Initialize socket.io
 */

const { Server } = require('socket.io');
const { emitEvents, listenEvents } = require('./constants');
const { isValidObjectId } = require('mongoose');
const { jwt } = require('../services');
const ChatFunctions = require('./functions/chat');

module.exports = (server) => {
	const io = new Server(server, { cors: { origin: '*' } });

	io.use((socket, next) => {
		if (socket.handshake.headers) {
			const { authorization } = socket.handshake.headers;
			try {
				const decodedToken = jwt.verify(authorization);
				if (!decodedToken) throw new Error('Invalid Token');
				if (!isValidObjectId(decodedToken.id)) throw new Error('Invalid ID');
				socket.authorization = decodedToken;
				return next();
			} catch (error) {
				return next(error?.message || 'Invalid Token');
			}
		} else {
			return next(new Error('Authentication error. Connection expect "authorization" in headers.'));
		}
	});

	io.on('connection', (socket) => {
		if (!socket?.authorization?.id) {
			socket.emit(emitEvents.disconnected, { message: 'Token does not contain valid Id.' });
			return socket.disconnect();
		}
		socket.employeeID = socket?.authorization?.id; // This must be defined
		registerFunctions(io, socket);
	});

	io.on('disconnect', (socket) => {
		socket.leave(socket.employeeID);
	});
};

/**
 * @description
 * @param {Server} io
 * @param {Socket} employeeSocket
 */
function registerFunctions(io, employeeSocket) {
	employeeSocket.join(employeeSocket.employeeID);

	let connectedResponsePayload = {
		message: emitEvents.connected,
		socketId: employeeSocket.id,
		employeeID: employeeSocket.employeeID,
		_meta: {
			serverListeningEvents: Object.values(listenEvents),
			serverEmittingEvents: Object.values(emitEvents),
		},
	};

	employeeSocket.emit(emitEvents.connected, connectedResponsePayload);

	// Socket Listener
	employeeSocket.on(listenEvents.SendMessage, (payload, cb) => ChatFunctions.onMessage(io, employeeSocket, payload, cb));
}
