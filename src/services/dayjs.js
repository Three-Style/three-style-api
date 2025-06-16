const DayJS = require('dayjs');
DayJS.extend(require('dayjs/plugin/customParseFormat'));
DayJS.extend(require('dayjs/plugin/utc'));
DayJS.extend(require('dayjs/plugin/timezone'));
DayJS.extend(require('dayjs/plugin/weekOfYear'));
DayJS.extend(require('dayjs/plugin/relativeTime'));
DayJS.extend(require('dayjs/plugin/localizedFormat'));
DayJS.extend(require('dayjs/plugin/isBetween'));
DayJS.extend(require('dayjs/plugin/minMax'));

/**
 * @type {DayJS.Dayjs}
 */
module.exports = DayJS;
