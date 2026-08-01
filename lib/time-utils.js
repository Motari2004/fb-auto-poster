import moment from 'moment-timezone';

const TIMEZONE = process.env.TIMEZONE || 'Africa/Nairobi';

export function getKenyaTime() {
  return moment().tz(TIMEZONE);
}

export function formatKenyaDateTime(dt = null) {
  const time = dt ? moment(dt).tz(TIMEZONE) : getKenyaTime();
  return time.format('DD/MM/YYYY, hh:mm A');
}

export function formatKenyaTime(dt = null) {
  const time = dt ? moment(dt).tz(TIMEZONE) : getKenyaTime();
  return time.format('hh:mm A');
}

export function formatKenyaDate(dt = null) {
  const time = dt ? moment(dt).tz(TIMEZONE) : getKenyaTime();
  return time.format('DD/MM/YYYY');
}

export function convertToKenyaTime(dt) {
  return moment(dt).tz(TIMEZONE);
}