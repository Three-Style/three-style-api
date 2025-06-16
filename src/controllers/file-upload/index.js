/**
 * @author Brijesh Prajapati
 * @description Upload File to S3
 */

const httpStatus = require('http-status'),
	{ multerS3 } = require('../../services'),
	multer = require('multer'),
	defaultOption = require('../../config/default.json'),
	response = require('../../utils/response');

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > File Upload > File Upload');

	try {
		let upload = multerS3.array('files');
		try {
			return upload(req, res, async (error) => {
				if (error instanceof multer.MulterError) {
					return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Image Upload Failed', error);
				} else if (error) {
					return response(res, httpStatus.INTERNAL_SERVER_ERROR, 'Image Upload Failed', error);
				}

				if (req.files && Array.isArray(req.files) && req.files.length > 0) {
					let fileURLs = req.files.map((data) => data.key);

					//req.logger.info('File Uploaded: ' + JSON.stringify(fileURLs));
					return response(res, httpStatus.OK, 'File Uploaded', { fileURLs });
				} else {
					return response(res, httpStatus.FORBIDDEN, 'Invalid File', { valid_file: defaultOption.multer.validMimeType, maxSize: '20 MB' });
				}
			});
		} catch (error) {
			return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
