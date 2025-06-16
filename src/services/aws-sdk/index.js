/**
 * @author Brijesh Prajapati
 * @description Set AWS Configuration
 * @module https://www.npmjs.com/package/aws-sdk
 */

const AWS_S3 = require('@aws-sdk/client-s3');
const { awsSDK: awsSDKConfig } = require('../../config/default.json');
const { awsSDK: awsSDKSecret } = require('../../config/secrets.json');

const S3Client = new AWS_S3.S3Client({
	region: awsSDKConfig.region,
	credentials: {
		accessKeyId: process.env.accessKeyId,
		secretAccessKey: process.env.secretAccessKey,
	},
});

module.exports.S3Client = S3Client;
