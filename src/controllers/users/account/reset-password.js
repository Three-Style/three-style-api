/**
 * @author Brijesh Prajapati
 * @description Reset Password Request
 */

const httpStatus = require('http-status'),
	{ UserRepo } = require('../../../database'),
	{ jwt, nodemailer } = require('../../../services'),
	{ userStatus } = require('../../../common'),
	fs = require('fs'),
	response = require('../../../utils/response');
const process = require('process');

module.exports = async (req, res) => {
	req.logger.info('Controller > User > Account > Reset Password Request');

	let { email } = req.params;

	let userResult = await UserRepo.findOne({ email, status: userStatus.active });

	if (!userResult) {
		return response(res, httpStatus.NOT_FOUND, 'Account does not exist');
	}

	// Reset Token
	let tokenObject = {
			id: userResult._id,
			email: userResult.email,
			createdOn: String(new Date()),
			authToken: userResult.authToken,
			via: 'USER-RESET-PASSWORD-BY-USER',
			purpose: 'RESET-PASSWORD',
			note: 'Token generated while resetting password from application. valid for 3 hours',
		},
		token = await jwt.sign(tokenObject, '3h'),
		resetLink = `${req.protocol}://fggroup.in/index.html?action=resetPassword&resetToken=${token}`;

	let emailTemplatePath = `${process.cwd()}/src/templates/reset-user-password.html`,
		HTMLPage = await fs.readFileSync(emailTemplatePath, 'utf8');

	HTMLPage = HTMLPage.replace('$resetLink', resetLink)
		.replace('$name', `${userResult.first_name || 'User'} ${userResult.last_name || ''}`)
		.replace('$email', userResult.email);

	// fs.writeFileSync(emailTemplatePath + '--test.html', HTMLPage)

	nodemailer(undefined, userResult.email, 'Reset Password', HTMLPage);

	return response(res, httpStatus.OK, 'Reset Link sent to email address');
};
