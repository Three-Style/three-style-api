/**
 * @author Brijesh Prajapati
 * @description Time Validation
 */

const logger = require('../services/winston'),
	moment = require('moment');

module.exports.minuteHour = (value) => {
	if (value) {
		let [hour, minute] = String(value).split(':');

		// Hour Validation
		if (isNaN(parseInt(hour)) || hour.length != 2 || hour < 0 || hour > 23) {
			logger.error(`Time ${hour}:${minute} is invalid. Hour and Minutes must be integer value`);
			return false;
		}

		// Minute Validation
		if (isNaN(parseInt(minute)) || minute.length != 2 || minute < 0 || minute >= 60) {
			logger.error(`Time ${hour}:${minute} is invalid. Hour and Minutes must be integer value`);
			return false;
		}

		return `${parseInt(hour)}:${parseInt(minute)}`;
	}
	return false;
};

module.exports.timeDifference = (startTimeObject, endTimeObject, unit) => Math.abs(moment(new Date(startTimeObject)).diff(moment(new Date(endTimeObject)), unit || 'hours'));
