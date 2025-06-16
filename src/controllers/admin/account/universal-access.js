/**
 * @author Brijesh Prajapati
 * @description Login into Admin Account and Get Authorization Token
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { AxiosHelpers } = require('../../../helpers');
const process = require('process');

const Platforms = {
	three_style: 'three_style',
	three_style_1: 'three_style_1',
	three_style_2: 'three_style_2',
};

module.exports = async (req, res) => {
	const logger = req.logger;
	logger.info('Controller > Admin > Account > Universal Access');

	const { adminAuthData } = req.headers;
	try {
		let adminAccount = await AdminRepo.findOne({ _id: adminAuthData.id });

		let accounts_access = [
			{
				platform: Platforms.three_style,
				access: req.headers.authorization,
			},
		];

		let availablePlatforms = [
			{
				platform: Platforms.three_style_1,
				email: adminAccount.email,
			},
			{
				platform: Platforms.three_style_2,
				email: adminAccount.email,
			},
		];

		await Promise.all(
			availablePlatforms.map(async (platformAccount) => {
				switch (platformAccount.platform) {
					case Platforms.three_style_1:
						try {
							let three_style_1Token = await requestThreeStyle1Access(platformAccount.email);
							if (three_style_1Token) {
								accounts_access.push({
									platform: platformAccount.platform,
									access: three_style_1Token.data.authorization,
								});
							}
						} catch (error) {
							let e = AxiosHelpers.ErrorParser(error);
							logger.error('Error while requesting Three Style 1 access', e);
							accounts_access.push({
								platform: platformAccount.platform,
								error: e.message || e,
							});
						}
						break;
					case Platforms.three_style_2:
						try {
							let three_style_2Token = await requestThreeStyle2Access(platformAccount.email);
							if (three_style_2Token) {
								accounts_access.push({
									platform: platformAccount.platform,
									access: three_style_2Token.data.authorization,
								});
							}
						} catch (error) {
							let e = AxiosHelpers.ErrorParser(error);
							logger.error('Error while requesting Three Style 2 access', e);
							accounts_access.push({
								platform: platformAccount.platform,
								error: e.message || e,
							});
						}
						break;
					default:
						break;
				}
			})
		);

		return response(res, httpStatus.OK, 'Accounts access granted', accounts_access);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

async function requestThreeStyle1Access(email) {
	// Request access to three_style_1 API
	return await AxiosHelpers.APIGet({
		url: `${process.env.three_style_1_API_URL}/universal-access/${email}`,
		timeout: 5000,
		timeoutErrorMessage: 'Request timeout. Failed to get access token within 5 seconds',
	}).then((response) => response.data);
}

async function requestThreeStyle2Access(email) {
	// Request access to three_style_2 API
	return await AxiosHelpers.APIGet({
		url: `${process.env.three_style_2_API_URL}/universal-access/${email}`,
		timeout: 5000,
		timeoutErrorMessage: 'Request timeout. Failed to get access token within 5 seconds',
	}).then((response) => response.data);
}
