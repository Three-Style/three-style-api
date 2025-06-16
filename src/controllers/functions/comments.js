const { isString, pickBy } = require('lodash');
const { FitnessCourseLectureCommentsRepo, AdminRepo, UserRepo, FitnessCourseLectureRepo } = require('../../database');
const { logger } = require('../../services');
const { userStatus } = require('../../common');
const { LectureCommentsModifiedEvent } = require('../../common/cache_key');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../helpers');
const { ObjectId } = require('mongoose').Types;
const GeneralCache = require('../../services/node-cache')('General');

/**
 * @author Brijesh Prajapati
 * @description Create Comment in lecture
 * @param {Object} data
 * @param {ObjectId} data.lecture_id
 * @param {ObjectId} data.comment_id // if reply
 * @param {ObjectId} data.user_id
 * @param {String} data.comment
 */
async function createComment(data = {}) {
	logger.info('Controllers > Functions > Comments > createComment');

	let { lecture_id, comment_id, user_id, comment } = data;

	if (!lecture_id || !ObjectId.isValid(lecture_id)) {
		new Error('Invalid lecture id');
	} else {
		lecture_id = ObjectId.createFromHexString(lecture_id);
	}

	if (comment_id) {
		if (!ObjectId.isValid(comment_id)) {
			new Error('Invalid comment id');
		}

		comment_id = ObjectId.createFromHexString(comment_id);
	}

	if (!ObjectId.isValid(user_id)) {
		new Error('Invalid user id');
	} else {
		user_id = ObjectId.createFromHexString(user_id);
	}

	if (!isString(comment) || !comment.length) {
		new Error('Invalid comment');
	} else comment = String(comment);

	return FitnessCourseLectureCommentsRepo.findById(lecture_id).then((result) => {
		GeneralCache.emit(LectureCommentsModifiedEvent);

		let createCommentPayload = { comment: comment, createdBy: user_id, createdAt: new Date() };

		if (result) {
			if (comment_id) {
				// Add reply to comment
				let isCommentExist = result.comments.find((comment) => comment._id.equals(comment_id));

				if (!isCommentExist) {
					new Error(`comment_id ${comment_id} not found`);
				}

				let updatePayload = {
					$push: {
						'comments.$[item].replies': createCommentPayload,
					},
				};

				let arrayFilters = [{ 'item._id': comment_id }];

				return result.updateOne(updatePayload, { arrayFilters });
			} else {
				// Add new comment thread
				let updatePayload = {
					$push: {
						comments: createCommentPayload,
					},
				};

				return result.updateOne(updatePayload);
			}
		} else {
			// Create new comment thread for first time for this lecture
			let createPayload = {
				_id: lecture_id,
				comments: [createCommentPayload],
			};

			return FitnessCourseLectureCommentsRepo.create(createPayload);
		}
	});
}
module.exports.createComment = createComment;

/**
 * @author Brijesh Prajapati
 * @description Update Comment in lecture
 * @param {Object} data
 * @param {ObjectId} data.lecture_id
 * @param {ObjectId} data.comment_id
 * @param {ObjectId} data.reply_id
 * @param {ObjectId} data.user_id
 * @param {String} data.comment
 */
async function updateComment(data) {
	logger.info('Controllers > Functions > Comments > updateComment');

	let { lecture_id, comment_id, reply_id, user_id, comment } = data;

	if (!comment_id && !reply_id) {
		new Error('comment_id or reply_id is required. passing all possible parameters improve query performance.');
	}

	if (comment_id) {
		if (!ObjectId.isValid(comment_id)) {
			new Error('Invalid comment id');
		}

		comment_id = ObjectId.createFromHexString(comment_id);
	}

	if (reply_id) {
		if (!ObjectId.isValid(reply_id)) {
			new Error('Invalid reply id');
		}

		reply_id = ObjectId.createFromHexString(reply_id);
	}

	if (!user_id || !ObjectId.isValid(user_id)) {
		new Error('Invalid user id');
	} else {
		user_id = ObjectId.createFromHexString(user_id);
	}

	if (lecture_id) {
		if (!ObjectId.isValid(lecture_id)) {
			new Error('Invalid lecture id');
		}

		lecture_id = ObjectId.createFromHexString(lecture_id);
	}

	let findLectureComment;
	if (lecture_id) {
		findLectureComment = await FitnessCourseLectureCommentsRepo.findById(lecture_id);

		if (!findLectureComment) {
			new Error('Comment not found');
		}

		let isCommentOrReplyExist = findLectureComment.comments.find((comment) => {
			if (comment_id && reply_id) {
				return comment._id.equals(comment_id) && comment.replies.find((reply) => reply._id.equals(reply_id) && reply.createdBy.equals(user_id));
			} else if (comment_id) {
				return comment._id.equals(comment_id) && comment.createdBy.equals(user_id);
			} else if (reply_id) {
				return comment.replies.find((reply) => reply._id.equals(reply_id) && reply.createdBy.equals(user_id));
			}

			return false;
		});

		if (!isCommentOrReplyExist) {
			new Error('Comment not found. It must be created by you.');
		}
	} else {
		let findQuery = {};
		if (comment_id) {
			findQuery['comments._id'] = comment_id;
		}

		if (reply_id) {
			findQuery['comments.replies._id'] = reply_id;
			findQuery['comments.replies.createdBy'] = user_id;
		} else {
			// that means comment_id is passed
			findQuery['comments.createdBy'] = user_id;
		}

		findLectureComment = await FitnessCourseLectureCommentsRepo.findOne(findQuery);
	}

	if (!findLectureComment) {
		new Error('Comment not found. It must be created by you.');
	}

	if (reply_id) {
		let updatePayload = {
			$set: {
				'comments.$[comment].replies.$[reply].comment': comment,
				'comments.$[comment].replies.$[reply].updatedAt': new Date(),
			},
		};

		let arrayFilters = [{ 'comment._id': comment_id }, { 'reply._id': reply_id }];

		GeneralCache.emit(LectureCommentsModifiedEvent);

		return findLectureComment.updateOne(updatePayload, { arrayFilters, new: true });
	} else if (comment_id) {
		let updatePayload = {
			$set: {
				'comments.$[comment].comment': comment,
				'comments.$[comment].updatedAt': new Date(),
			},
		};

		let arrayFilters = [{ 'comment._id': comment_id }];

		GeneralCache.emit(LectureCommentsModifiedEvent);

		return findLectureComment.updateOne(updatePayload, { arrayFilters, new: true });
	} else {
		new Error('comment_id or reply_id is required. passing all possible parameters improve query performance.');
	}
}
module.exports.updateComment = updateComment;

/**
 * @author Brijesh Prajapati
 * @description Delete Comment in lecture
 * @param {Object} data
 * @param {ObjectId} data.lecture_id
 * @param {ObjectId} data.comment_id
 * @param {ObjectId} data.reply_id
 * @param {ObjectId} data.user_id
 * @param {boolean} data.is_admin // If so, it has privilege to delete any comment
 */
async function deleteComment(data) {
	logger.info('Controllers > Functions > Comments > deleteComment');

	let { lecture_id, comment_id, reply_id, user_id, is_admin } = data;

	if (!comment_id && !reply_id) {
		throw new Error('comment_id or reply_id is required. passing all possible parameters improve query performance.');
	}

	if (comment_id) {
		if (!ObjectId.isValid(comment_id)) {
			throw new Error('Invalid comment id');
		}

		comment_id = ObjectId.createFromHexString(comment_id);
	}

	if (reply_id) {
		if (!ObjectId.isValid(reply_id)) {
			throw new Error('Invalid reply id');
		}

		reply_id = ObjectId.createFromHexString(reply_id);
	}

	if (!user_id || !ObjectId.isValid(user_id)) {
		throw new Error('Invalid user id');
	} else {
		user_id = ObjectId.createFromHexString(user_id);
	}

	if (lecture_id) {
		if (!ObjectId.isValid(lecture_id)) {
			throw new Error('Invalid lecture id');
		}

		lecture_id = ObjectId.createFromHexString(lecture_id);
	}

	let findLectureComment;
	if (lecture_id) {
		findLectureComment = await FitnessCourseLectureCommentsRepo.findById(lecture_id);

		if (!findLectureComment) {
			throw new Error('Comment not found');
		}

		let isCommentOrReplyExist = findLectureComment.comments.find((comment) => {
			if (comment_id && reply_id) {
				return comment._id.equals(comment_id) && comment.replies.find((reply) => reply._id.equals(reply_id));
			} else if (comment_id) {
				return comment._id.equals(comment_id);
			} else if (reply_id) {
				return comment.replies.find((reply) => reply._id.equals(reply_id));
			}

			return false;
		});

		if (!isCommentOrReplyExist) {
			throw new Error('Comment does not exist');
		}

		if (!is_admin) {
			let isItCreatedByGivenUser = findLectureComment.comments.find((comment) => {
				if (comment_id && reply_id) {
					return comment._id.equals(comment_id) && comment.replies.find((reply) => reply._id.equals(reply_id) && reply.createdBy.equals(user_id));
				} else if (comment_id) {
					return comment._id.equals(comment_id) && comment.createdBy.equals(user_id);
				} else if (reply_id) {
					return comment.replies.find((reply) => reply._id.equals(reply_id) && reply.createdBy.equals(user_id));
				}

				return false;
			});

			if (!isItCreatedByGivenUser) {
				throw new Error('You are not allowed to delete this comment');
			}
		}
	} else {
		let findQuery = {};
		if (comment_id) {
			findQuery['comments._id'] = comment_id;
		}

		if (reply_id) {
			findQuery['comments.replies._id'] = reply_id;
			findQuery['comments.replies.createdBy'] = user_id;
		}

		findLectureComment = await FitnessCourseLectureCommentsRepo.findOne(findQuery);
	}

	if (!findLectureComment) {
		throw new Error('Comment not found. It must be created by you.');
	}

	if (reply_id) {
		let updatePayload = {
			$pull: {
				'comments.$[comment].replies': { _id: reply_id },
			},
		};

		let arrayFilters = [{ 'comment._id': comment_id }];

		GeneralCache.emit(LectureCommentsModifiedEvent);
		return findLectureComment.updateOne(updatePayload, { arrayFilters, new: true });
	} else if (comment_id) {
		let updatePayload = {
			$pull: {
				comments: { _id: comment_id },
			},
		};

		GeneralCache.emit(LectureCommentsModifiedEvent);
		return findLectureComment.updateOne(updatePayload, { new: true });
	} else {
		throw new Error('comment_id or reply_id is required. passing all possible parameters improve query performance.');
	}
}
module.exports.deleteComment = deleteComment;

/**
 * @author Brijesh Prajapati
 * @description Get Comments in lecture
 * This function can be used in user route but must pass user_id in data object.
 * @param {Object} data
 * @param {ObjectId} data.lecture_id
 * @param {ObjectId} data.user_id It will filter comments created by this user.
 * @param {Number} data.page
 * @param {Number} data.limit
 * @returns {Promise<Array>}
 */
async function getComments(data = {}) {
	logger.info('Controllers > Functions > Comments > getComments');

	let { lecture_id, user_id } = pickBy(data);

	let findQuery = {};

	if (user_id) {
		if (!ObjectId.isValid(user_id)) throw new Error('Invalid user id');

		user_id = ObjectId.createFromHexString(user_id);
		findQuery['comments.createdBy'] = user_id;
	}

	if (lecture_id) {
		if (!ObjectId.isValid(lecture_id)) {
			throw new Error('Invalid lecture id');
		}

		findQuery._id = ObjectId.createFromHexString(lecture_id);
	}

	const pagination = PaginationHelper.getPagination(data, { maxLimit: data.maxLimit });
	const SortQuery = MongoDBQueryBuilder.sortQuery(data.sort, data.sortOrder);

	return await FitnessCourseLectureCommentsRepo.find(findQuery)
		.skip(pagination.skip)
		.limit(pagination.limit)
		.sort(SortQuery)
		.then(async (result) => {
			// This is user route, so only return comments thread created by user
			/**
			 * Future Implementation note:
			 *
			 * If future requirement requests to return all public comments thread and replies, it can be implemented below this comment.
			 *
			 * Do not need to filter replies, because replies are always created by admin. If it is created by another user, that means it is public by default.
			 * However, public replies or comment thread user can be anonymous, so make sure only public comments with privacy setting public users information should be populate.
			 */

			let filterUserComment = result;

			if (user_id) {
				filterUserComment = result.map((lecture) => {
					lecture = lecture.toObject();
					lecture.comments = lecture.comments.filter((comment) => comment.createdBy.equals(user_id));
					return lecture;
				});
			} else {
				filterUserComment = result.map((lecture) => {
					lecture = lecture.toObject();
					return lecture;
				});
			}

			let allUserIds = new Set();
			let allLectureIds = new Set();

			for (let lecture of filterUserComment) {
				allLectureIds.add(lecture._id.toString());

				for (let comment of lecture.comments) {
					allUserIds.add(comment.createdBy.toString());

					for (let reply of comment.replies) {
						allUserIds.add(reply.createdBy.toString());
					}
				}
			}

			const [AdminUsers, Users, Lectures] = await Promise.all([
				AdminRepo.find()
					.select('full_name')
					.then((result) => result.map((admin) => ({ _id: admin._id, first_name: admin.full_name, isAdmin: true }))),
				UserRepo.find({ _id: { $in: Array.from(allUserIds.values()) }, lock: { $ne: true }, status: userStatus.active }).select('first_name last_name profile_image'),
				FitnessCourseLectureRepo.find({ _id: { $in: Array.from(allLectureIds.values()) } }).select('title lecture_index thumbnail_image'),
			]);

			// Map users
			filterUserComment = filterUserComment.map((lecture) => {
				// Lecture
				lecture.lecture = Lectures.find((lec) => lec._id.equals(lecture._id));

				// Comments
				lecture.comments = lecture.comments.map((comment) => {
					let findCommentAuthor = Users.find((user) => user._id.equals(comment.createdBy)) || AdminUsers.find((user) => user._id.equals(comment.createdBy));

					if (findCommentAuthor) {
						comment.full_name = [findCommentAuthor.first_name, findCommentAuthor.last_name, findCommentAuthor.full_name].join(' ').trim();
						comment.profile_image = findCommentAuthor.profile_image;
						comment.isAdmin = findCommentAuthor.isAdmin;
					} else {
						comment.full_name = '(User Removed)';
						comment.isUserDeleted = true;
					}

					// Replies
					comment.replies = comment.replies.map((reply) => {
						let findReplyAuthor = Users.find((user) => user._id.equals(reply.createdBy)) || AdminUsers.find((user) => user._id.equals(reply.createdBy));
						if (findReplyAuthor) {
							reply.full_name = [findReplyAuthor.first_name, findReplyAuthor.last_name, findReplyAuthor.full_name].join(' ').trim();
							reply.profile_image = findReplyAuthor.profile_image;
							reply.isAdmin = findReplyAuthor.isAdmin;
						} else {
							reply.full_name = '(User Removed)';
							reply.isUserDeleted = true;
						}

						if (reply.createdBy.equals(comment.createdBy)) reply.isAuthor = true;

						return reply;
					});

					let isLastRepliedByAdmin = false;

					if (comment.replies.length > 0) {
						isLastRepliedByAdmin = comment.replies[comment.replies.length - 1].isAdmin === true;
					} else if (comment.replies.length === 0 && comment.isAdmin === true) {
						isLastRepliedByAdmin = true;
					}

					comment.is_replied_by_admin = isLastRepliedByAdmin;

					return comment;
				});

				return lecture;
			});

			return Promise.resolve(filterUserComment);
		});
}
module.exports.getComments = getComments;
