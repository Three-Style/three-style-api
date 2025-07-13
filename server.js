const fs = require('fs');
console.clear();
const process = require('process');

process.on('uncaughtException', function (exception) {
	console.error(exception);
});
process.on('unhandledRejection', function (reason) {
	console.error(reason);
});

const envPath = `.env.${process.env.NODE_ENV || 'development'}`;
if (fs.existsSync(envPath)) {
	require('dotenv').config({ path: envPath });
} else {
	require('dotenv').config(); // fallback to .env
}

// process.env.NODE_ENV = 'production';
// process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const listenerAPP = require('./app');
const { logger } = require('./src/services');
const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'server.js',
	},
});

const http = require('http');
// HTTP Server
const server = http.createServer(listenerAPP);

server.addListener('listening', () => {
	CustomLogger.info(`\x1b[32m\x1b[1m PORT: ${process.env.PORT} \x1b[0m || \x1b[32m\x1b[1m NODE_ENV: ${process.env.NODE_ENV || '\x1b[31m\x1b[1m NODE_ENV NOT FOUND'} \x1b[0m`);
});
server.listen(process.env.PORT);
require('./src/socket')(server); // Initialize Socket.io

// Clear tmp folder

function deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function (file) {
			var curPath = path + '/' + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteFolderRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

let path = './.tmp';
if (fs.existsSync(path)) {
	deleteFolderRecursive(path);
} else {
	fs.mkdirSync(path);
}
