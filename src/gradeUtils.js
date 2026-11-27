export const GRADE_VALUES = Object.freeze({ 5: 500, 4: 300, 3: -150, 2: -500 });

export const GRADE_OPTIONS = Object.freeze([
  { grade: 5, name: 'Пятёрка', amount: 500 },
  { grade: 4, name: 'Четвёрка', amount: 300 },
  { grade: 3, name: 'Тройка', amount: -150 },
  { grade: 2, name: 'Двойка', amount: -500 },
]);

const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];
const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
export const WEEKDAY_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const WEEKDAY_LONG = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

function localDate(year, month, day) {
  // setFullYear avoids the Date constructor's special handling of years 0–99.
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dateToKey(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Construct local dates explicitly: parsing YYYY-MM-DD with new Date(string) uses UTC.
export function dateFromKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = localDate(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function addDays(date, amount) {
  const result = localDate(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

export function addMonths(date, amount) {
  const target = localDate(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = localDate(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function startOfWeek(date) {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

export function getPeriodBounds(date, period) {
  if (period === 'week') {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 6) };
  }
  return {
    start: localDate(date.getFullYear(), date.getMonth(), 1),
    end: localDate(date.getFullYear(), date.getMonth() + 1, 0),
  };
}

export function entriesInPeriod(entries, date, period) {
  const { start, end } = getPeriodBounds(date, period);
  const from = dateToKey(start);
  const to = dateToKey(end);
  return entries.filter((entry) => entry.date >= from && entry.date <= to);
}

export function summarize(entries) {
  return entries.reduce((result, entry) => {
    const amount = GRADE_VALUES[entry.grade];
    result.total += amount;
    if (amount > 0) result.earned += amount;
    else result.spent += Math.abs(amount);
    result.counts[entry.grade] += 1;
    return result;
  }, { total: 0, earned: 0, spent: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0 } });
}

export function formatMoney(amount, showPlus = false) {
  const sign = amount < 0 ? '−' : amount > 0 && showPlus ? '+' : '';
  return `${sign}${new Intl.NumberFormat('ru-RU').format(Math.abs(amount))} ₽`;
}

export function pluralGrades(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'оценок';
  if (last === 1) return 'оценка';
  if (last >= 2 && last <= 4) return 'оценки';
  return 'оценок';
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMonth(date) {
  return `${capitalize(MONTHS[date.getMonth()])} ${date.getFullYear()}`;
}

export function formatDay(date, includeYear = false) {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}${includeYear ? ` ${date.getFullYear()}` : ''}`;
}

export function formatWeekRange(date) {
  const { start, end } = getPeriodBounds(date, 'week');
  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatDay(start, true)} – ${formatDay(end, true)}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${formatDay(start)} – ${formatDay(end, true)}`;
  }
  return `${start.getDate()} – ${formatDay(end, true)}`;
}

export function formatToday(date) {
  return `${capitalize(WEEKDAY_LONG[date.getDay()])}, ${formatDay(date)}`;
}

export function formatEntryDay(date, today) {
  const key = dateToKey(date);
  if (key === dateToKey(today)) return `Сегодня, ${formatDay(date)}`;
  if (key === dateToKey(addDays(today, -1))) return `Вчера, ${formatDay(date)}`;
  return `${capitalize(WEEKDAY_LONG[date.getDay()])}, ${formatDay(date, date.getFullYear() !== today.getFullYear())}`;
}

export function isValidEntry(entry) {
  return Boolean(
    entry && typeof entry.id === 'string' && entry.id &&
    Number.isInteger(entry.grade) && Object.hasOwn(GRADE_VALUES, entry.grade) &&
    dateFromKey(entry.date) && Number.isFinite(entry.createdAt),
  );
}

export function sortEntries(entries) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}
