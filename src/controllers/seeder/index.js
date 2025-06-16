/**
 * @author Brijesh Prajapati
 * @description Seeders
 */

const process = require('process');
const { FitnessPlanRepo, RecipeRepo, FitnessCourseRepo, scholarshipQuestionRepo, DigitalPlansRepo, ProductsRepo } = require('../../database');
const response = require('../../utils/response');
const httpStatus = require('http-status');

module.exports.fitnessPlan = (req, res) => {
	const fitnessSeed = require('../../common/seeder/fitness_plan.json');

	try {
		fitnessSeed.forEach((data) => FitnessPlanRepo.findOneAndUpdate({ _id: data._id }, data, { upsert: true }).catch());
		return response(res, httpStatus.OK, 'Fitness Plan updated Successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.recipeData = (req, res) => {
	const recipeSeed = require('../../common/seeder/recipe.json');

	try {
		recipeSeed.forEach((data) => RecipeRepo.findOneAndUpdate({ _id: data._id }, data, { upsert: true }).catch());
		return response(res, httpStatus.OK, 'Recipe updated successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.fitnessCourse = (req, res) => {
	const courseSeed = require('../../common/seeder/fitness_course.json');

	try {
		courseSeed.forEach((data) => FitnessCourseRepo.findOneAndUpdate({ _id: data._id }, data, { upsert: true }).catch());
		return response(res, httpStatus.OK, 'Fitness Course updated successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.scholarshipQuestion = (req, res) => {
	const questionSeed = require('../../common/seeder/scholarship_question.json');

	try {
		questionSeed.forEach((data) => scholarshipQuestionRepo.findOneAndUpdate({ _id: data._id }, data, { upsert: true }).catch());
		return response(res, httpStatus.OK, 'Scholarship Questions updated successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.digitalPlans = (req, res) => {
	const digitalPlans = require('../../common/seeder/digital_plans.json');

	try {
		digitalPlans.forEach((data) => DigitalPlansRepo.findOneAndUpdate({ _id: data._id }, data, { upsert: true }).catch());
		return response(res, httpStatus.OK, 'Digital Plans updated successfully');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.mealProducts = (req, res) => {
	const products = require('../../common/seeder/meal_products.json');

	try {
		products.forEach((data) =>
			ProductsRepo.findOneAndUpdate(
				{ _id: data._id },
				{ ...data, display_image: process.env.NODE_ENV + '/' + data.display_image, createdBy: req.headers.adminAuthData.id, updatedBy: req.headers.adminAuthData.id },
				{ upsert: true }
			).catch()
		);
		return response(res, httpStatus.OK, 'Product Seeding Completed');
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
