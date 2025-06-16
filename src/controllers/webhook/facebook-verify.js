/**
 * @author Brijesh Prajapati
 * @description Verify Webhook for facebook
 */

const { winston: logger } = require('../../services');

module.exports = async (req, res) => {
	logger.info('Controller > Webhook > Verify Facebook: Request received');
	const verifyToken = req.query['hub.verify_token'];
	const challenge = req.query['hub.challenge'];

	// Check if the verification token matches
	if (verifyToken === 'fggroup#facebook#88866') {
		logger.info('Verification successful, responding with challenge');
		return res.status(200).send(challenge);
	} else {
		logger.error(`Verification failed: Invalid token. Received: ${verifyToken}`);
	}
};
