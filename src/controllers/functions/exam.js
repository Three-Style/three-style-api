const { FitnessCourseExamModel, FitnessCourseExamAttendeesModel } = require('../../database');
const { DayJS, logger } = require('../../services');
const { ObjectId } = require('mongoose').Types;

/**
 *
 * @param {object} data
 * @param {ObjectId} data.exam_id
 * @param {[ObjectId]} data.attendees
 * @param {ObjectId} data.authorizedUserId
 * @returns
 */
async function allocateExam(data) {
	return new Promise((resolve, reject) => {
		const { exam_id, attendees, authorizedUserId } = data;

		if (!exam_id || !ObjectId.isValid(exam_id)) {
			return reject('valid exam_id is required');
		}

		var examID = ObjectId.createFromHexString(String(exam_id));

		FitnessCourseExamModel.findOne({ _id: examID, is_active: true, is_deleted: false }).then(async (findExamResult) => {
			if (!findExamResult) {
				return reject('Exam not found. Possibly deleted or inactive.');
			}

			const allocatePayload = {
				exam_id: examID,
				createdBy: authorizedUserId,
				updatedBy: authorizedUserId,
			};

			if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
				return reject('valid attendees array is required', {
					example_attendees: [
						{
							user_id: new ObjectId(),
							start_time: new Date().toISOString(),
						},
					],
				});
			}

			var attendeesPayload = [];

			for (var i = 0; i < attendees.length; i++) {
				var tempAttendee = attendees[i];

				if (!tempAttendee.user_id || !ObjectId.isValid(tempAttendee.user_id)) {
					return reject('valid user_id is required');
				}

				if (findExamResult.options?.can_start_anytime === true) {
					attendeesPayload.push({
						...allocatePayload,
						user_id: ObjectId.createFromHexString(String(tempAttendee.user_id)),
					});
				} else {
					if (!tempAttendee.start_time || !DayJS(tempAttendee.start_time).isValid()) {
						return reject('valid start_time is required');
					}

					attendeesPayload.push({
						...allocatePayload,
						user_id: ObjectId.createFromHexString(String(tempAttendee.user_id)),
						start_time: new Date(tempAttendee.start_time),
					});
				}
			}

			try {
				var result = await FitnessCourseExamAttendeesModel.insertMany(attendeesPayload);
				return resolve(result);
			} catch (error) {
				return reject(error.message || 'Something went wrong. Please try again later.');
			}
		});
	});
}
module.exports.allocateExam = allocateExam;

/**
 *
 * @param {Object} data
 * @param {ObjectId} data.user_id
 * @param {ObjectId} data.course_id
 * @param {ObjectId} data.authorizedUserId
 * @returns
 */
function assignAllQuiz(data) {
	const NutriTrainCourses = ['600e5b2099180b31447a0ef9', '6010e781eb38ac0a706af296', '62d33bae0ac1b482c32bd445'];
	const NutritionCourse = ['600f7a0ab6868e387407a8c9', '6010e899eb38ac0a706af297', '61e8b11b74eefa46b0554998'];
	const PersonalTrainerCourse = ['6010e9f3eb38ac0a706af298', '600e698486d2eb34f0796e20', '61e8b11b74eefa46b0554892'];

	// Quiz IDs in sorted order
	const PersonalTrainerQuizzes = [
		'6582915e057428307ecf240a',
		'65829463057428307ecf2597',
		'658296af057428307ecf26c7',
		'6582990f057428307ecf27ee',
		'65829beb057428307ecf2910',
		'65829e2a057428307ecf2a41',
		'6582a0cf057428307ecf2b74',
		'6582a3a0057428307ecf2c95',
		'6582afed057428307ecf2d8a',
		'6582b634057428307ecf2ea6',
	];
	const NutritionQuizzes = [
		'65826fe5057428307ecf1847',
		'6582767d057428307ecf1957',
		'65827936057428307ecf1a8c',
		'65827b7a057428307ecf1b65',
		'65827e55057428307ecf1cde',
		'658281ae057428307ecf1e19',
		'6582841c057428307ecf1f51',
		'65828970057428307ecf2085',
		'65828bb4057428307ecf21a3',
		'65828e15057428307ecf22cf',
	];

	return new Promise((resolve, reject) => {
		try {
			let { user_id, course_id, authorizedUserId } = data;

			if (!user_id || !ObjectId.isValid(user_id)) {
				return reject('valid user_id is required');
			} else user_id = ObjectId.createFromHexString(String(user_id));

			if (!course_id || !ObjectId.isValid(course_id)) {
				return reject('valid course_id is required');
			} else course_id = ObjectId.createFromHexString(String(course_id));

			if (!authorizedUserId || !ObjectId.isValid(authorizedUserId)) {
				return reject('valid authorizedUserId is required');
			} else authorizedUserId = ObjectId.createFromHexString(String(authorizedUserId));

			let quizzes = [];
			if (NutriTrainCourses.includes(course_id.toString())) {
				quizzes = [...PersonalTrainerQuizzes, ...NutritionQuizzes];
			} else if (NutritionCourse.includes(course_id.toString())) {
				quizzes = NutritionQuizzes;
			} else if (PersonalTrainerCourse.includes(course_id.toString())) {
				quizzes = PersonalTrainerQuizzes;
			} else {
				return reject('Course not found for quiz allocation');
			}

			return FitnessCourseExamAttendeesModel.find({ user_id: user_id }).then((AttemptResult) => {
				// Prevent duplicate allocation
				AttemptResult.forEach((attempt) => {
					if (attempt?.attempt_information?.is_completed === true) return;

					// quizzes = quizzes.filter((quiz) => quiz !== attempt.exam_id.toString())
				});

				try {
					quizzes.forEach((exam_id) => {
						allocateExam({
							exam_id: exam_id,
							attendees: [{ user_id: user_id }],
							authorizedUserId: data.authorizedUserId,
						}).catch(console.error);
					});

					return resolve('All quizzes assigned successfully');
				} catch (error) {
					return reject(error.message || error || 'Something went wrong. Please try again later.');
				}
			});
		} catch (error) {
			logger.error(error);
			return reject(error.message || 'Something went wrong. Please try again later.');
		}
	});
}

module.exports.assignAllQuiz = assignAllQuiz;
