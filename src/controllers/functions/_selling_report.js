// THIS IS FOR PERSONAL USE ONLY. NOT FOR PRODUCTION. NOT FOR COMMERCIAL USE.

const { pick } = require('lodash');
const { purchaseMode, CourseCategory, itemType } = require('../../common');
const { UserFitnessCourseRepo, OrdersRepo, FitnessCourseRepo, UserBooksRepo, BooksRepo, UserEBooksRepo, EBookRepo } = require('../../database');
const { DayJS, logger } = require('../../services');
const process = require('process');
let fnReturnInterfaceKeys = ['razorpay_payment_id', 'order_id', 'receipt_id', 'item_type', 'item_name', 'remark', 'amount', 'order_at'];

// FGIIT: Flexible Course Report
async function flexibleCourseReport({ from_date, to_date } = { from_date: new Date('2021-01-01'), to_date: new Date() }) {
	let query = {
		createdAt: {
			$gte: from_date,
			$lte: to_date,
		},
	};
	return await UserFitnessCourseRepo.find(query)
		.populate('order_id', { _id: true, receipt_id: true, amount: true, order_item_type: true, gateway_transaction_id: true }, OrdersRepo, { purchase_mode: purchaseMode.online })
		.populate('course_id', { course_name: true, course_category: true, amount: true }, FitnessCourseRepo, { course_category: CourseCategory.flexible })
		.then((result) => {
			let resultArray = [];

			result.map((data) => {
				if (!data.order_id || !data.course_id) return;
				let { order_id, course_id } = data;
				let { receipt_id, amount, gateway_transaction_id, order_item_type } = order_id;
				let { course_name, course_category, amount: CourseAmount } = course_id;

				if (amount == 0) {
					amount = CourseAmount;
				}

				resultArray.push({
					razorpay_payment_id: gateway_transaction_id,
					order_id: data.order_id._id,
					receipt_id: receipt_id,
					item_type: order_item_type,
					item_name: course_name,
					remark: course_category,
					amount: amount,
					order_at: data.createdAt,
				});
			});

			return resultArray;
		});
}

// FGIIT: Online Course Report
async function onlineCourseReport({ from_date, to_date } = { from_date: new Date('2021-01-01'), to_date: new Date() }) {
	let query = {
		createdAt: {
			$gte: from_date,
			$lte: to_date,
		},
	};

	return await UserFitnessCourseRepo.find(query)
		.populate('order_id', { _id: true, receipt_id: true, amount: true, order_item_type: true, gateway_transaction_id: true }, OrdersRepo, { purchase_mode: purchaseMode.online })
		.populate('course_id', { course_name: true, course_category: true, amount: true }, FitnessCourseRepo, { course_category: CourseCategory.online })
		.then((result) => {
			result = result.filter((data) => data.order_id && data.course_id);

			let resultArray = [];

			result.map((data) => {
				if (!data.order_id || !data.course_id) return;
				let { order_id, course_id } = data;
				let { receipt_id, amount, gateway_transaction_id, order_item_type } = order_id;
				let { course_name, course_category, amount: CourseAmount } = course_id;

				if (amount == 0) {
					amount = CourseAmount;
				}

				resultArray.push({
					razorpay_payment_id: gateway_transaction_id,
					order_id: data.order_id._id,
					receipt_id: receipt_id,
					item_type: order_item_type,
					item_name: course_name,
					remark: course_category,
					amount: amount,
					order_at: data.createdAt,
				});
			});

			return resultArray;
		});
}

// FGIIT: Offline Course
async function offlineCourseReport({ from_date, to_date } = { from_date: new Date('2021-01-01'), to_date: new Date() }) {
	let query = {
		createdAt: {
			$gte: from_date,
			$lte: to_date,
		},
	};

	return await UserFitnessCourseRepo.find(query)
		.populate('order_id', { _id: true, receipt_id: true, amount: true, order_item_type: true, gateway_transaction_id: true }, OrdersRepo, { purchase_mode: purchaseMode.online })
		.populate('course_id', { course_name: true, course_category: true }, FitnessCourseRepo, { course_category: CourseCategory.offline })
		.then((result) => {
			result = result.filter((data) => data.order_id && data.course_id);

			let resultArray = [];

			result.map((data) => {
				if (!data.order_id || !data.course_id) return;
				let { order_id, course_id } = data;
				let { receipt_id, amount, gateway_transaction_id, order_item_type } = order_id;
				let { course_name, course_category } = course_id;

				resultArray.push({
					razorpay_payment_id: gateway_transaction_id,
					order_id: data.order_id._id,
					receipt_id: receipt_id,
					item_type: order_item_type,
					item_name: course_name,
					remark: course_category,
					amount: amount,
					order_at: data.createdAt,
				});
			});

			return resultArray;
		});
}

// FGIIT: Book Report
async function bookReport({ from_date, to_date } = { from_date: new Date('2021-01-01'), to_date: new Date() }) {
	let query = {
		createdAt: {
			$gte: from_date,
			$lte: to_date,
		},
	};
	return await UserBooksRepo.find(query)
		.populate('order_id', { _id: true, receipt_id: true, amount: true, order_item_type: true, gateway_transaction_id: true }, OrdersRepo, { purchase_mode: purchaseMode.online })
		.populate('book_id', { book_title: true }, BooksRepo)
		.then((result) => {
			result = result.filter((data) => data.order_id && data.book_id);

			let resultArray = [];

			result.map((data) => {
				if (!data.order_id || !data.book_id) return;

				let { order_id, book_id } = data;
				let { receipt_id, amount, gateway_transaction_id, order_item_type } = order_id;
				let { book_title } = book_id;

				resultArray.push({
					razorpay_payment_id: gateway_transaction_id,
					order_id: data.order_id._id,
					receipt_id: receipt_id,
					item_type: order_item_type,
					item_name: book_title,
					remark: itemType.books,
					amount: amount,
					order_at: data.createdAt,
				});
			});

			return resultArray;
		});
}

// FGIIT: E-Book Report
async function ebookReport({ from_date, to_date } = { from_date: new Date('2021-01-01'), to_date: new Date() }) {
	let query = {
		createdAt: {
			$gte: from_date,
			$lte: to_date,
		},
	};

	return await UserEBooksRepo.find(query)
		.populate('order_id', { _id: true, receipt_id: true, amount: true, order_item_type: true, gateway_transaction_id: true }, OrdersRepo, { purchase_mode: purchaseMode.online })
		.populate('ebook_id', { ebook_title: true }, EBookRepo)
		.then((result) => {
			result = result.filter((data) => data.order_id && data.ebook_id);

			let resultArray = [];

			result.map((data) => {
				if (!data.order_id || !data.ebook_id) return;

				let { order_id, ebook_id } = data;
				let { receipt_id, amount, gateway_transaction_id, order_item_type } = order_id;
				let { ebook_title } = ebook_id;

				resultArray.push({
					razorpay_payment_id: gateway_transaction_id,
					order_id: data.order_id._id,
					receipt_id: receipt_id,
					item_type: order_item_type,
					item_name: ebook_title,
					remark: itemType.ebooks,
					amount: amount,
					order_at: data.createdAt,
				});
			});

			return resultArray;
		});
}

const fromDate = new Date('2024/03/01');
const toDate = new Date('2024/03/30');
const fs = require('fs');

Promise.all([
	flexibleCourseReport({ from_date: fromDate, to_date: toDate }),
	onlineCourseReport({ from_date: fromDate, to_date: toDate }),
	offlineCourseReport({ from_date: fromDate, to_date: toDate }),
	bookReport({ from_date: fromDate, to_date: toDate }),
	ebookReport({ from_date: fromDate, to_date: toDate }),
])
	.then((result) => {
		let [flexibleCourseReport, onlineCourseReport, offlineCourseReport, bookReport, ebookReport] = result;
		let finalResult = [...flexibleCourseReport, ...onlineCourseReport, ...offlineCourseReport, ...bookReport, ...ebookReport];

		const Domain = {
			development: 'https://admin.fggroup.in/pages/user/user_order_view.html?order_id=',
			production: 'https://admin.fggroup.in/pages/user/user_order_view.html?order_id=',
		};

		let TotalAmount = {
			[CourseCategory.flexible]: flexibleCourseReport.reduce((a, b) => a + b.amount, 0),
			[CourseCategory.online]: onlineCourseReport.reduce((a, b) => a + b.amount, 0),
			[CourseCategory.offline]: offlineCourseReport.reduce((a, b) => a + b.amount, 0),
			[itemType.books]: bookReport.reduce((a, b) => a + b.amount, 0),
			[itemType.ebooks]: ebookReport.reduce((a, b) => a + b.amount, 0),
		};

		finalResult = finalResult.map((item) => {
			item = pick(item, fnReturnInterfaceKeys);
			item.order_at = DayJS(item.order_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
			item.ViewOrder = Domain[process.env.NODE_ENV] + item.order_id;
			return item;
		});

		TotalAmount['Total'] = [...Object.values(TotalAmount)].reduce((a, b) => a + b, 0);

		finalResult.push(TotalAmount);

		fs.writeFile(`../commission_report_${DayJS(fromDate).format('YYYY-MM-DD')}_TO_${DayJS(toDate).format('YYYY-MM-DD')}.json`, JSON.stringify(finalResult), (error) => {
			if (error) return console.error(error);

			logger.info('Report Generated Successfully');
		});
	})
	.catch((error) => {
		logger.error(error);
	});
