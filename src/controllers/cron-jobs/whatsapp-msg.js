// /**
//  * @author Brijesh Prajapati
//  * @description Cron Job for Send Full year Whatsapp Msg
//  */

// const { winston: logger } = require('../../services');
// const { UserRepo } = require('../../database');
// const { WhatsAppHelper } = require('../../helpers');
// const CronJob = require('cron').CronJob;
// const { DayJS } = require('../../services');

// async function findUser() {
// 	const initialDate = DayJS(new Date('2024/02/05'));

// 	const allUserData = await UserRepo.find();

// 	for (const user of allUserData) {
// 		if (!user.mobile) {
// 			continue;
// 		}
// 		const userCreated = DayJS(user.createdAt);

// 		if (DayJS().day() === 0) {
// 			let getWeekNumber;

// 			if (userCreated.isBefore(initialDate, 'day')) {
// 				getWeekNumber = DayJS().diff(initialDate, 'weeks');
// 			} else {
// 				getWeekNumber = userCreated.diff(DayJS(), 'weeks');
// 			}
// 			getWeekNumber++;

// 			let blankBody = {
// 				components: [],
// 			};
// 			try {
// 				switch (getWeekNumber) {
// 					case 1:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_one', blankBody);
// 						break;

// 					case 2:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_two', blankBody);
// 						break;

// 					case 3:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_two_t', blankBody);
// 						break;

// 					case 4:
// 						WhatsAppHelper.sendMessage(
// 							user.mobile,
// 							'full_year_msg_three',
// 							commonImgMsg('https%3A%2F%2Fbot-data.s3.ap-southeast-1.wasabisys.com%2Fupload%2F2024%2F2%2Fflowbuilder%2Fflowbuilder-61485-1707022311.jpeg')
// 						);
// 						break;

// 					case 5:
// 						WhatsAppHelper.sendMessage(
// 							user.mobile,
// 							'full_year_msg_three_th',
// 							commonImgMsg('https://bot-data.s3.ap-southeast-1.wasabisys.com/upload/2024/2/flowbuilder/flowbuilder-61485-1707022590.jpeg')
// 						);
// 						break;

// 					case 6:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_four', commonImgMsg('https://bot-data.s3.ap-southeast-1.wasabisys.com/upload/2024/2/flowbuilder/flowbuilder-61485-1707022590.jpeg'));
// 						break;

// 					case 9:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_five', blankBody);
// 						break;

// 					case 11:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_five_f', blankBody);
// 						break;

// 					case 13:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_six', blankBody);
// 						break;

// 					case 15:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_six_s', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707025423/qrcttvdk8uiye63pwwil.mp4'));
// 						break;

// 					case 17:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_seven', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707025681/hux10gbcowyyl3nhekhj.mp4'));
// 						break;

// 					case 19:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_seven_s', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707026202/jdcv1fi2dwkbbrosx0pp.mp4'));
// 						break;

// 					case 21:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_eight', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707033117/aozhr5odaxzenbi5vk85.mp4'));
// 						break;

// 					case 23:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_eight_e', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707026485/aj8ggsiirekbcmjedtjy.mp4'));
// 						break;

// 					case 25:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_nine', commonVideoMsg('http://res.cloudinary.com/dmztccq1u/video/upload/v1707026775/mjyffy2figredeuwijtc.mp4'));
// 						break;

// 					case 26:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_nine_n', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707027104/hclack6ka70gev1vujfi.mp4'));
// 						break;

// 					case 28:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_ten', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707026520/yzsjrg8axnpwa54bmcdw.mp4'));
// 						break;

// 					case 30:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_ten_t', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707026496/hv86mtrzujtylcmleojn.mp4'));
// 						break;

// 					case 32:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_eleven', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707027864/xbroaifqoumkaabbgot5.mp4'));
// 						break;

// 					case 35:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_eleven_e', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707026545/xvqlkyvccltpgdbgnnfq.mp4'));
// 						break;

// 					case 38:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_twelve', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707028153/mf42pysm3zlggjhvug5d.mp4'));
// 						break;

// 					case 41:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_twelve_t', commonImgMsg('https://fggroup.in/assets/images/fgiit/new-1.2.webp'));
// 						break;

// 					case 43:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_thirteen', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707028645/gn5qvhkx8w8cmidu8nun.mp4'));
// 						break;

// 					case 46:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_thirteen_t', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707028854/tlfei0rdhdqf9pkgxr5a.mp4'));
// 						break;

// 					case 48:
// 						WhatsAppHelper.sendMessage(
// 							user.mobile,
// 							'full_year_msg_fourteen',
// 							commonVideoMsg('https://bot-data.s3.ap-southeast-1.wasabisys.com/upload/2024/2/flowbuilder/flowbuilder-61485-1707028996.jpeg')
// 						);
// 						break;

// 					case 50:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_fourteen', commonImgMsg('https://fggroup.in/assets/images/img/banner-mobile27.webp'));
// 						break;

// 					case 52:
// 						WhatsAppHelper.sendMessage(user.mobile, 'full_year_msg_fourteen_f', commonVideoMsg('https://res.cloudinary.com/dmztccq1u/video/upload/v1707033047/f5nhdf2mrdot59g8j3sg.mp4'));
// 						break;

// 					default:
// 						break;
// 				}
// 			} catch (err) {
// 				logger.error(err);
// 			}
// 		}
// 	}
// }

// // // For Testing
// // let blankBody = {
// //   "components": []
// // }
// // WhatsAppHelper.sendMessage('7486873619', 'full_year_msg_five', blankBody)

// const SendWhatsappMsg = new CronJob(
// 	'0 0 11 * * *',
// 	async () => {
// 		logger.info(`CRONJOB: [Send Whatsapp Messages]: ${new Date().toString()}`);
// 		await findUser();
// 	},
// 	undefined,
// 	undefined,
// 	undefined,
// 	undefined,
// 	undefined
// );

// function commonVideoMsg(link) {
// 	let data = {
// 		components: [
// 			{
// 				type: 'header',
// 				parameters: [
// 					{
// 						type: 'video',
// 						video: {
// 							link: link,
// 						},
// 					},
// 				],
// 			},
// 			{
// 				type: 'body',
// 				parameters: [
// 					{
// 						type: 'text',
// 						text: 'VARIABLE_TEXT',
// 					},
// 				],
// 			},
// 		],
// 	};
// 	return data;
// }

// function commonImgMsg(link) {
// 	let data = {
// 		components: [
// 			{
// 				type: 'header',
// 				parameters: [
// 					{
// 						type: 'image',
// 						video: {
// 							link: link,
// 						},
// 					},
// 				],
// 			},
// 			{
// 				type: 'body',
// 				parameters: [
// 					{
// 						type: 'text',
// 						text: 'VARIABLE_TEXT',
// 					},
// 				],
// 			},
// 		],
// 	};
// 	return data;
// }

// module.exports.SendWhatsappMsg = {
// 	start: () => SendWhatsappMsg.start(),
// 	stop: () => SendWhatsappMsg.stop(),
// };
