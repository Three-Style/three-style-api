/**
 * @author Brijesh Prajapati
 * @description Set Firebase Admin SDK
 * @module https://www.npmjs.com/package/firebase-admin
 * @tutorial https://www.npmjs.com/package/firebase-admin#documentation
 */

const firebaseAdmin = require('firebase-admin'),
	{ 'firebase-admin-sdk': firebase_admin_sdk } = require('../../config/secrets'),
	logger = require('../winston'),
	{ logging } = require('../../config/default.json');
const process = require('process');

const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'Service:FirebaseAdmin',
	},
});

const Credentials = firebase_admin_sdk[process.env.NODE_ENV];
if (!Credentials || !Credentials.sdk || !Credentials.databaseURL) {
	CustomLogger.error('SDK or Database URL Missing');
}

try {
	firebaseAdmin.initializeApp({
		credential: firebaseAdmin.credential.cert(Credentials.sdk),
		databaseURL: Credentials.databaseURL,
	});
	logging.firebaseAdmin ? CustomLogger.info('Connected') : null;
} catch {
	CustomLogger.info('Failed. SDK or database URL Invalid');
}
