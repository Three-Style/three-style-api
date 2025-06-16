/**
 * @author Brijesh Prajapati
 * @description Multi Factor Authentication Controller for Authenticator Based Authentication
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../../database'),
	response = require('../../../../utils/response');
const { MFAMethods } = require('../../../../common');
const { authenticator } = require('otplib');
const { randomDigit } = require('../../../../utils/random');
const { logger } = require('../../../../services');

module.exports.addSecret = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Authenticator > Add Secret');

	const user_id = req.headers.adminAuthData.id;
	const { secret, remark } = req.body;

	let result = await AdminRepo.findOne({ _id: user_id }).select('+authenticator_secrets').lean();

	if (result?.authenticator_secrets?.length > 0) {
		return response(res, httpStatus.BAD_REQUEST, 'once you have added a secret, you cannot add more.');
	}

	if (!secret || !remark) {
		return response(res, httpStatus.BAD_REQUEST, 'Secret and Remark are required.');
	}

	if (result?.authenticator_secrets && result.authenticator_secrets.some((item) => item.secret === secret)) {
		return response(res, httpStatus.FORBIDDEN, 'Secret already exists.');
	}

	// Update authToken
	const authToken = randomDigit(6);

	AdminRepo.findOneAndUpdate({ _id: user_id }, { $addToSet: { authenticator_secrets: { secret, remark }, MFA_enabled: 'authenticator' }, authToken }).catch((err) => req.logger.error(err));

	return response(res, httpStatus.OK, 'Secret Added Successfully');
};

module.exports.removeSecret = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Authenticator > Remove Secret');

	const user_id = req.headers.adminAuthData.id;
	const { secret_id } = req.body;

	if (!secret_id) {
		return response(res, httpStatus.BAD_REQUEST, 'secret_id is required.');
	}

	AdminRepo.findOneAndUpdate({ _id: user_id, authenticator_secrets: { $elemMatch: { _id: secret_id } } }, { $pull: { authenticator_secrets: { _id: secret_id } } }, { new: true })
		.select('+authenticator_secrets')
		.then((result) => {
			if (result?.authenticator_secrets.length === 0) {
				AdminRepo.findOneAndUpdate({ _id: user_id }, { $pull: { MFA_enabled: MFAMethods.authenticator } }).catch((err) => console.error(err));
			}
		})
		.catch((error) => req.logger.error(error.stack));

	return response(res, httpStatus.OK, 'Secret Removed Successfully');
};

module.exports.verifySecret = (user_id, token) =>
	new Promise((resolve, reject) => {
		logger.info('Controller > Admin > Account > Authenticator > Verify Secret');

		/**
		 * @description Verify Token with all secrets of user, if none of them matches, then reject else resolve
		 */

		if (!user_id || !token) {
			return reject('user_id and token are required.');
		}

		AdminRepo.findOne({ _id: user_id, status: true, MFA_enabled: { $in: [MFAMethods.authenticator] }, authenticator_secrets: { $exists: true, $not: { $size: 0 } } })
			.select('+authenticator_secrets')
			.then((result) => {
				if (result?.authenticator_secrets) {
					result.authenticator_secrets.every((item) => {
						if (authenticator.verify({ token, secret: item.secret })) {
							resolve({ secret_id: item._id });
							return false;
						}
						return true;
					});

					reject('Invalid Authenticator Token');
				}
			})
			.catch((err) => reject(err));
	});
