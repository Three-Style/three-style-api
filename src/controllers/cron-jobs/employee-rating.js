// /**
//  * @author Brijesh Prajapati
//  * @description Get employee rating and set notice and send Termination Letter on Cron Job
//  */

// const { CronJob } = require('cron');
// const { logger, DayJS } = require('../../services');
// const { fetchRating } = require('../admin/task-management/get-rating');
// const { AdminRepo, EmployeeRepo } = require('../../database');
// // const { S3Client } = require('@aws-sdk/client-s3');
// // const { awsSDK: awsSDKConfig } = require('../../config/default.json');
// // const { awsSDK: awsSDKSecret } = require('../../config/secrets.json');
// // const { WhatsAppHelper, emailTemplate } = require('../../helpers');
// // const { jsPDF } = require('jspdf');
// // const fs = require('fs');
// // const { PutObjectCommand } = require('@aws-sdk/client-s3');
// // const crypto = require('crypto');

// // const s3 = new S3Client({
// // 	region: awsSDKConfig.region,
// // 	credentials: {
// // 		accessKeyId: awsSDKSecret.accessKeyId,
// // 		secretAccessKey: awsSDKSecret.secretAccessKey,
// // 	},
// // });

// const fetchEmployeeRatingJob = new CronJob('0 0 8 1 * *', async () => {
// 	try {
// 		logger.info(`CRONJOB: [fetchEmployeeRatingJob]: ${new Date().toString()}`);

// 		const from_date = DayJS().subtract(1, 'month').startOf('month').toISOString();
// 		const to_date = DayJS().subtract(1, 'month').endOf('month').toISOString();

// 		let findQuery = {
// 			start_date: {
// 				$gte: from_date,
// 				$lte: to_date,
// 			},
// 		};

// 		let employeeData = await AdminRepo.aggregate([
// 			{
// 				$lookup: {
// 					from: EmployeeRepo.collection.collectionName,
// 					localField: 'employee_id',
// 					foreignField: '_id',
// 					as: 'employee',
// 				},
// 			},
// 			{
// 				$unwind: { path: '$employee', preserveNullAndEmptyArrays: true },
// 			},
// 			{
// 				$project: {
// 					authToken: false,
// 					password: false,
// 					'authenticator_secrets.secret': false,
// 				},
// 			},
// 		]);

// 		employeeData = employeeData.filter(({ employee }) => employee?.employee_code);

// 		let EmployeeTaskData = await Promise.all(
// 			employeeData.map(async (employee) => {
// 				const ratingData = await fetchRating(undefined, employee?.employee_id, findQuery);
// 				if (ratingData) {
// 					if (ratingData.total_task !== 0 && ratingData.rating <= 59) {
// 						return { ...employee, ratingData };
// 					}
// 				}
// 			})
// 		);
// 		EmployeeTaskData = EmployeeTaskData.filter((rating) => rating && rating.ratingData);

// 		for (const employeeTask of EmployeeTaskData) {
// 			let noticeCount;
// 			if (employeeTask.employee && employeeTask.employee.notice) {
// 				if (employeeTask.employee.notice >= 1) {
// 					noticeCount = ++employeeTask.employee.notice;
// 				}
// 			} else {
// 				noticeCount = 1;
// 			}
// 			const DBPayload = { notice: noticeCount };
// 			// const employeeResult =
// 			await EmployeeRepo.findByIdAndUpdate({ _id: employeeTask.employee_id }, DBPayload, { new: true });

// 			// if (noticeCount === 1 || noticeCount === 2) {
// 			// 	const msgBody = {
// 			// 		components: [
// 			// 			{
// 			// 				type: 'body',
// 			// 				parameters: [
// 			// 					{
// 			// 						type: 'text',
// 			// 						text: employeeTask.full_name,
// 			// 					},
// 			// 					{
// 			// 						type: 'text',
// 			// 						text: employeeResult.notice,
// 			// 					},
// 			// 				],
// 			// 			},
// 			// 		],
// 			// 	};
// 			// 	WhatsAppHelper.sendMessage(employeeTask.mobile, 'employee_notice_template', msgBody).catch((error) => logger.error(error.stack));
// 			// }

// 			// if (noticeCount >= 3) {
// 			// 	const generateTerminationLetterPDF = (employeeTask) => {
// 			// 		return new Promise((resolve, reject) => {
// 			// 			try {
// 			// 				const doc = new jsPDF();
// 			// 				const dirPath = './src/controllers/cron-jobs/temp';
// 			// 				if (!fs.existsSync(dirPath)) {
// 			// 					fs.mkdirSync(dirPath, { recursive: true });
// 			// 				}
// 			// 				const filePath = `${dirPath}/Termination_Letter_${employeeTask.full_name}.pdf`;
// 			// 				const date = DayJS().format('DD/MM/YYYY');
// 			// 				const monthEndingDate = DayJS().endOf('month').format('DD/MM/YYYY');

// 			// 				doc.setFont('helvetica', 'bold');
// 			// 				doc.setFontSize(16);
// 			// 				doc.text('Termination Letter', 105, 20, { align: 'center' });

// 			// 				doc.setFontSize(12);
// 			// 				doc.text(`Date: `, 20, 40);
// 			// 				doc.setFont('helvetica', 'normal');
// 			// 				doc.text(`${date}`, 32, 40);
// 			// 				doc.setFont('helvetica', 'bold');
// 			// 				doc.text(`To: `, 20, 48);
// 			// 				doc.setFont('helvetica', 'normal');
// 			// 				doc.text(`${employeeTask.full_name}`, 28, 48);
// 			// 				doc.setFont('helvetica', 'bold');
// 			// 				doc.text(`From:`, 20, 56);
// 			// 				doc.setFont('helvetica', 'normal');
// 			// 				doc.text(`Gomzi Consulting Services Pvt. Ltd.`, 33, 56);

// 			// 				doc.text(`Dear ${employeeTask.full_name},`, 20, 70);
// 			// 				doc.text(`We regret to inform you that your employment with Gomzi Consulting Services Pvt. Ltd. will be terminated effective ${monthEndingDate}.`, 20, 80, { maxWidth: 170 });

// 			// 				doc.setFont('helvetica', 'bold');
// 			// 				doc.text('Reason for Termination:', 20, 95);
// 			// 				doc.setFont('helvetica', 'normal');
// 			// 				doc.text(
// 			// 					'Despite receiving two strikes and multiple warnings, your performance has not met the required standards. Due to continued incomplete tasks and low ratings, this decision has been made in accordance with company policy.',
// 			// 					20,
// 			// 					100,
// 			// 					{ maxWidth: 170 }
// 			// 				);

// 			// 				doc.text(
// 			// 					'We appreciate your contributions during your time with us and wish you the best in your future endeavors. Please ensure all company assets are returned and any pending tasks are completed before your final working day. If you require any assistance during this transition, feel free to reach out.',
// 			// 					20,
// 			// 					120,
// 			// 					{ maxWidth: 170 }
// 			// 				);

// 			// 				doc.text('We wish you success in your future career.', 20, 145);

// 			// 				doc.setFont('helvetica', 'bold');
// 			// 				doc.text('Sincerely,', 20, 154);
// 			// 				doc.setFont('helvetica', 'normal');
// 			// 				doc.text('Gautam Jani', 20, 161);
// 			// 				doc.text('Founder', 20, 168);
// 			// 				doc.text('Gomzi Consulting Services Pvt. Ltd.', 20, 175);

// 			// 				doc.save(filePath);
// 			// 				resolve(filePath);
// 			// 			} catch (error) {
// 			// 				reject(error);
// 			// 			}
// 			// 		});
// 			// 	};

// 			// 	const uploadPDFToS3 = async (filePath) => {
// 			// 		try {
// 			// 			const fileContent = fs.readFileSync(filePath);
// 			// 			const uuid = crypto.randomUUID();

// 			// 			const environment = process.env.NODE_ENV;
// 			// 			let storageDirectory = environment + '/pdf';

// 			// 			const fileName = `${storageDirectory}/FILE-Termination_Letter-${DayJS().format('YYYY-MM-DD')}-[${environment}/files]-${uuid}.pdf`;

// 			// 			const uploadParams = {
// 			// 				Bucket: awsSDKConfig.bucketName,
// 			// 				Key: fileName,
// 			// 				Body: fileContent,
// 			// 				ContentType: 'application/pdf',
// 			// 				ACL: awsSDKConfig.acl,
// 			// 			};

// 			// 			await s3.send(new PutObjectCommand(uploadParams));

// 			// 			const s3Url = `https://files.fggroup.in/${fileName}`;

// 			// 			fs.unlinkSync(filePath);
// 			// 			return s3Url;
// 			// 		} catch (error) {
// 			// 			console.error('Error uploading PDF:', error);
// 			// 			throw error;
// 			// 		}
// 			// 	};

// 			// 	const filePath = await generateTerminationLetterPDF(employeeTask);
// 			// 	const fileUrl = await uploadPDFToS3(filePath);

// 			// 	const monthEndingDate = DayJS().endOf('month').format('DD/MM/YYYY');
// 			// 	const emailBody = {
// 			// 		full_name: employeeTask.full_name,
// 			// 		date: monthEndingDate,
// 			// 		fileUrl: fileUrl,
// 			// 	};

// 			// 	emailTemplate('TERMINATION_LETTER', emailBody)
// 			// 		.then((terminationLetterTemplateBody) => {
// 			// 			nodemailer('fitnesswithgomzi@gmail.com', employeeTask.email, 'Termination Letter', terminationLetterTemplateBody, 'Three Style');
// 			// 		})
// 			// 		.catch((error) => logger.error('Error generating email template:', error));
// 			// }
// 		}
// 	} catch (error) {
// 		logger.error('Error executing fetchEmployeeRatingJob: ' + error.message);
// 	}
// });

// module.exports = {
// 	FetchEmployeeRating: fetchEmployeeRatingJob,
// };
