/**
 * @author Brijesh Prajapati
 * @description Validate Value with Regex
 */

const logger = require('../services/winston'),
	unirest = require('unirest');

/**
 *
 * @param {string} value
 * @param {boolean} checkDisposable
 * @returns {boolean}
 */
module.exports.email = async (value, checkDisposable) => {
	let regex =
		// eslint-disable-next-line no-control-regex, no-useless-escape
		/(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

	if (value != '') {
		if (!regex.test(value)) {
			logger.error('Incorrect Email Value. Not match with regex');
			return false;
		}
	} else {
		logger.error('Incorrect Email Value. Value not Found');
		return false;
	}

	if (checkDisposable) {
		let { body } = await unirest.get('https://open.kickbox.com/v1/disposable/' + value);

		if (body.disposable) {
			logger.error('Disposable Email found');
			return false; // explicitly reject disposable email
		}
	}

	return true; // If Pass the Validation
};

module.exports.mobile = (value) => {
	if (String(value).length != 10) {
		logger.error(`Mobile Length more than 10. Value: ${String(value)} and length: ${String(value).length}`);
		return false;
	}

	value = String(value);

	let mobileRegex = /^[6-9][0-9]{9}$/;
	if (!value.match(mobileRegex) || value.match(mobileRegex) != value) {
		return false;
	}

	return true;
};

// Ref.: https://stackoverflow.com/a/18690202
const longitudeRegex = new RegExp(/\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
const latitudeRegex = new RegExp(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/);

/**
 * @param {Number} longitude
 * @returns {Boolean}
 * @throws {Error}
 * */
function isValidLongitude(longitude) {
	if (typeof longitude !== 'number') {
		throw new Error('Longitude must be a number');
	}

	return longitudeRegex.test(longitude);
}
module.exports.isValidLongitude = isValidLongitude;

/**
 * @param {Number} latitude
 * @returns {Boolean}
 * @throws {Error}
 * */
function isValidLatitude(latitude) {
	if (typeof latitude !== 'number') {
		throw new Error('Latitude must be a number');
	}

	return latitudeRegex.test(latitude);
}
module.exports.isValidLatitude = isValidLatitude;

/**
 *
 * @param {[Number, Number]} coordinates [longitude, latitude]
 * @returns {Boolean}
 * @throws {Error}
 */
function isValidCoordinates(coordinates) {
	if (!Array.isArray(coordinates)) {
		throw new Error('Coordinates must be an array');
	}

	if (coordinates.length != 2) {
		throw new Error('Coordinates must have 2 values');
	}

	if (!isValidLongitude(coordinates[0])) {
		throw new Error('Longitude must be a valid longitude');
	}

	if (!isValidLatitude(coordinates[1])) {
		throw new Error('Latitude must be a valid latitude');
	}

	return true;
}
module.exports.isValidCoordinates = isValidCoordinates;
