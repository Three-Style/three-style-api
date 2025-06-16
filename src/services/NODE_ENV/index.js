/**
 * @author Brijesh Prajapati
 * @description Check Running Environment for Node
 */

const logger = require('../winston');
const process = require('process');
const CustomLogger = logger.__instance({
	defaultMeta: {
		requestId: 'Service:NODE_ENV',
	},
});

// Environment
const NODE_ENV = String(process.env.NODE_ENV).trim() || 'development';

module.exports = (req, res, next) => {
	switch (NODE_ENV) {
		case 'development':
		case 'production':
			next();
			break;
		default:
			CustomLogger.error("NODE_ENV is not valid. Use 'development' or 'production'");
			return res.json({ message: 'Health: Sick', reason: 'Node Environment is not valid' });
	}
};
