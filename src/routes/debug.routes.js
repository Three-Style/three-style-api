const { nodemailer } = require('../services');

const multer = require('multer');
const upload = multer({
	storage: multer.memoryStorage(), // Store files in memory
});

const Router = require('express').Router({ caseSensitive: false });

Router.get('/mail-template', (req, res) => res.sendFile(process.cwd() + '/src/public/debug/mail-tester.html'));

// Define your route for handling the mail template submission
Router.post('/mail-template/send-mail', upload.single('file'), async (req, res) => {
	const userData = {
		BRIJESH: 'brijesh21p@gmail.com',
	};

	const devID = req.body.id;

	if (!userData[devID]) {
		return res.status(400).send('Invalid Developer ID');
	}

	// Check if the file is available
	if (req.file) {
		const fileBuffer = req.file.buffer;
		const stringConvert = fileBuffer.toString('utf-8');

		try {
			// Send the email using nodemailer
			await nodemailer(undefined, userData[devID], `[TESTER/DEV ID] ${devID}`, stringConvert, 'Internal Mail System');
			return res.send('Mail Sent Successfully');
		} catch (error) {
			console.error(error);
			return res.status(500).send('Mail Sent Failed');
		}
	} else {
		return res.status(400).send('No file uploaded');
	}
});

module.exports = Router;
