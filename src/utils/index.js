/**
 * @author Brijesh Prajapati
 * @description Export utils
 */

const { cloneDeep } = require('lodash');

module.exports.arrayItemInArrayUtil = require('./array-item-in-array');
module.exports.randomGenerateUtil = require('./random');
module.exports.regexValidateUtil = require('./regex');
module.exports.timeUtil = require('./time-validation');
module.exports.responseUtil = require('./response');
module.exports.replaceAll = require('./replaceAll');
module.exports.JSONSort = require('./sort-json-alphabetically'); // This function bind JSON object prototype to sort JSON alphabetically
module.exports.hideSensitiveValue = require('./hide-sensitive-value');
module.exports.getLoggerInstance = require('./find-parent-logger');

/**
 *
 * @param {Number} days
 * @returns
 */
function convertDaysToYearsMonthsDays(days = 0) {
	days = Math.floor(Number(days));

	if (isNaN(days) || days <= 0) {
		return {
			input: days,
			years: 0,
			months: 0,
			days: 0,
			text: '0 days',
		};
	}

	const years = Math.floor(days / 365);
	const months = Math.floor((days % 365) / 30);
	const remainingDays = days % 30;

	let result = '';

	if (years > 0) {
		result += `${years} year${years > 1 ? 's' : ''} `;
	}

	if (months > 0) {
		result += `${months} month${months > 1 ? 's' : ''} `;
	}

	if (remainingDays > 0) {
		result += `${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
	}

	return {
		input: days,
		years,
		months,
		days: remainingDays,
		text: result.trim(),
	};
}
module.exports.convertDaysToYearsMonthsDays = convertDaysToYearsMonthsDays;

/**
 * Sorts an array of objects by a specified key.
 * @param {Array} array - The array to be sorted.
 * @param {string} key - The key to sort the array by.
 * @param {string} order - The order of sorting. Can be 'asc' for ascending or 'desc' for descending.
 * @returns {Array} - The sorted array.
 */
function sortJSONByValue(array, key, order) {
	return array.sort(function (a, b) {
		var x = a[key];
		var y = b[key];
		if (order === 'asc') return x < y ? -1 : x > y ? 1 : 0;
		else return x > y ? -1 : x < y ? 1 : 0;
	});
}
module.exports.sortJSONByValue = sortJSONByValue;

/**
 * @author Brijesh Prajapati
 * @description Add items to an array at a specified index
 * @param {Array} array - The array to which the items are to be added
 * @param {Number} index - The index at which the items are to be added
 * @param {Any} items - The items to be added to the array
 * @param {Object} options - Additional options
 * @param {Boolean} options.cloneInput - Whether to clone the input array before adding items
 * @returns {Array} - The updated array
 */
function addItemsToArrayAtIndex(array, index, items, options = { cloneInput: false }) {
	if (!Array.isArray(array)) {
		throw new Error('First argument must be an array');
	}

	if (typeof index !== 'number') {
		throw new Error('Second argument must be a number');
	}

	if (index < 0 || index > array.length) {
		throw new Error('Index out of bounds');
	}

	if (options.cloneInput === true) {
		array = cloneDeep(array);
	}

	if (!Array.isArray(items)) {
		items = [items];
	}

	array.splice(index, 0, ...items);

	return array;
}
module.exports.addItemsToArrayAtIndex = addItemsToArrayAtIndex;
