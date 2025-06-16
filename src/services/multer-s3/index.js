/**
 * @author Brijesh Prajapati
 * @description Multer S3 will upload file object to AWS S3 Bucket
 * @module https://www.npmjs.com/package/multer-s3
 * @module https://www.npmjs.com/package/multer
 */

const S3 = require('../aws-sdk').S3Client,
	multer = require('multer'),
	multerS3 = require('multer-s3'),
	{ awsSDK: awsSDKConfig, multer: multerConfig } = require('../../config/default.json'),
	{ v4: uuidv4 } = require('uuid');
const process = require('process');

// S3 Storage
const storageS3 = multerS3({
	s3: S3,
	bucket: awsSDKConfig.bucketName,
	contentType: multerS3.AUTO_CONTENT_TYPE,
	acl: awsSDKConfig.acl,
	metadata: (req, file, cb) => {
		// Metadata callback returns field name of file
		return cb(null, { filename: file.fieldname });
	},
	key: (req, file, cb) => {
		const body = JSON.parse(JSON.stringify(req.body));

		// Directory & File Name
		let directory = directoryAllocation(req.params.directory || body.directory);

		// -- Append original filename to upload file name
		let originalFilename = String(file.originalname).substring(0, String(file.originalname).lastIndexOf('.'));
		originalFilename = originalFilename.replace(/\s/g, '-'); // Replace All Spaces with -
		originalFilename = originalFilename.replace(/[^a-zA-Z0-9-_]/g, ''); // Remove All Special Characters
		originalFilename = originalFilename.replace(/-{2,}/g, '-'); // Replace Multiple - with single -
		originalFilename = originalFilename.replace(/^-+|-+$/g, ''); // Remove - from start and end of string

		let file_name = `FILE-${originalFilename || ''}-${uuidv4()}.${file.mimetype.split('/')[1]}`;

		// Callback Returns Path + Filename
		return cb(null, `${directory}/${file_name}`);
	},
});

// File Filter based on mimetype
const fileFilter = (req, file, cb) => {
	// Set Valid Mime Type from Default JSON
	if (!multerConfig.validMimeType.includes(file.mimetype)) {
		return cb(null, false, new Error('Invalid File Type'));
	}
	return cb(null, true);
};

// Directory Allocation
const directoryAllocation = (directory) => {
	const environment = process.env.NODE_ENV;
	let storageDirectory = environment;

	switch (directory) {
		case 'product':
		case 'products':
			storageDirectory += `/${awsSDKConfig.directory.products}`;
			break;
		case 'book':
		case 'books':
			storageDirectory += `/${awsSDKConfig.directory.books}`;
			break;
		case 'users':
			storageDirectory += `/${awsSDKConfig.directory.users}`;
			break;
		case 'files':
			storageDirectory += `/${awsSDKConfig.directory.files}`;
			break;
		case 'ebooks':
			storageDirectory += `/${awsSDKConfig.directory.ebooks}`;
			break;
		case 'contact-inquiry':
			storageDirectory += `/${awsSDKConfig.directory.contactInquiry}`;
			break;
		case 'project-files':
			storageDirectory += `/${awsSDKConfig.directory.projectFiles}`;
			break;
		case 'project-submissions':
			storageDirectory += `/${awsSDKConfig.directory.projectSubmissions}`;
			break;
		case 'certificates':
			storageDirectory += `/${awsSDKConfig.directory.certificates}`;
			break;
		case awsSDKConfig.directory.chatDocuments:
			storageDirectory += `/${awsSDKConfig.directory.chatDocuments}`;
			break;
		default:
			storageDirectory += `/${awsSDKConfig.directory.files}`;
			break;
	}
	return storageDirectory;
};

// Multer
module.exports = multer({
	storage: storageS3,
	fileFilter,
	limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});
