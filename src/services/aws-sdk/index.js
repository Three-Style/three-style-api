/**
 * @author Smit Luvani
 * @description Set AWS Configuration
 * @module https://www.npmjs.com/package/aws-sdk
 */

const AWS_S3 = require('@aws-sdk/client-s3');
const { awsSDK: awsSDKConfig } = require('../../config/default.json');
const { awsSDK: awsSDKSecret } = require('../../config/secrets.json');

const S3Client = new AWS_S3.S3Client({
	region: awsSDKConfig.region,
	credentials: {
		accessKeyId: awsSDKSecret.accessKeyId,
		secretAccessKey: awsSDKSecret.secretAccessKey,
	},
});

module.exports.S3Client = S3Client;
