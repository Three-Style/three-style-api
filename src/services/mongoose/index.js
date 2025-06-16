/**
 * @author Brijesh Prajapati
 */

const mongoose = require('mongoose'),
	logger = require('../winston');

const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'Service:Mongoose',
	},
});

if (!process.env.MongoDB_URI) {
	CustomLogger.error('Secrets [Mongoose]: srv not found');
	process.exit(1); // Exit if no connection string is found
}

const MongoDBConnectionString = process.env.MongoDB_URI;
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second

function getConnectionStatusString() {
	return Object.entries(mongoose.STATES).find(([, value]) => value === mongoose.connection.readyState)?.[0] || 'unknown';
}

let retryCount = 0;

function mongooseConnect() {
	try {
		CustomLogger.info('Attempting to connect to MongoDB...');
		mongoose.connect(MongoDBConnectionString).catch((error) => {
			CustomLogger.error(`Connection failed: ${error.message}`, error.stack);
			handleReconnect();
		});
	} catch (error) {
		CustomLogger.error(`Error during connection attempt: ${error.message}`, error.stack);
		handleReconnect();
	}
}

function handleReconnect() {
	if (retryCount >= MAX_RETRIES) {
		CustomLogger.error(`Max retry count (${MAX_RETRIES}) exceeded. Giving up.`);
		// Optionally: process.exit(1) or notify admin
		return;
	}

	const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
	CustomLogger.warn(`Disconnected. Retrying (${retryCount + 1}/${MAX_RETRIES}) in ${delay}ms...`);
	retryCount++;

	setTimeout(() => {
		mongooseConnect();
	}, delay);
}

try {
	mongoose.connection.on('connecting', () => {
		CustomLogger.info(`${getConnectionStatusString()}`);
	});

	mongoose.connection.on('connected', () => {
		CustomLogger.info(`${getConnectionStatusString()} to ${mongoose.connection.db.databaseName}`);
		retryCount = 0; // Reset retry count on successful connection
	});

	mongoose.connection.on('disconnecting', () => {
		CustomLogger.warn(`${getConnectionStatusString()} ${mongoose.connection.db.databaseName}`);
	});

	mongoose.connection.on('error', (err) => {
		CustomLogger.error(`${getConnectionStatusString()}: ${err.message}`);
	});

	mongoose.connection.on('reconnected', () => {
		CustomLogger.info(`${getConnectionStatusString()} to ${mongoose.connection.db.databaseName}`);
		retryCount = 0; // Reset retry count on reconnection
	});

	mongoose.connection.on('disconnected', () => {
		CustomLogger.warn(`${getConnectionStatusString()}`);
		handleReconnect();
	});
} catch (error) {
	CustomLogger.error(`Error setting up connection handlers: ${error.message}`);
}

try {
	mongooseConnect();

	process.on('SIGINT', async () => {
		await mongoose.disconnect();
		CustomLogger.info('Disconnected from MongoDB due to app termination');
		process.exit(0);
	});
} catch (error) {
	CustomLogger.error(`Initial connection error: ${error.message}`);
}
