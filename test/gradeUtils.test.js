import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRADE_VALUES,
  addDays,
  addMonths,
  dateFromKey,
  dateToKey,
  entriesInPeriod,
  formatMoney,
  formatMonth,
  formatWeekRange,
  getPeriodBounds,
  isValidEntry,
  pluralGrades,
  startOfWeek,
  summarize,
} from '../src/gradeUtils.js';

function entry(grade, date, id = `${grade}-${date}`, createdAt = 1) {
  return { id, grade, date, createdAt };
}

test('каждая оценка стоит ровно столько, сколько указано в правилах', () => {
  assert.deepEqual(GRADE_VALUES, { 5: 500, 4: 300, 3: -150, 2: -500 });
  const result = summarize([entry(5, '2026-11-23'), entry(4, '2026-11-24'), entry(3, '2026-11-25'), entry(2, '2026-11-26')]);
  assert.equal(result.total, 150);
  assert.equal(result.earned, 800);
  assert.equal(result.spent, 650);
  assert.deepEqual(result.counts, { 5: 1, 4: 1, 3: 1, 2: 1 });
  assert.equal(summarize([entry(2, '2026-11-23'), entry(3, '2026-11-24')]).total, -650);
  assert.equal(summarize([]).total, 0);
});

test('дата разбирается как локальный календарный день и проверяется', () => {
  assert.equal(dateToKey(dateFromKey('2026-11-27')), '2026-11-27');
  assert.equal(dateToKey(dateFromKey('0099-01-01')), '0099-01-01');
  assert.equal(dateFromKey('2026-02-29'), null);
  assert.equal(dateToKey(dateFromKey('2024-02-29')), '2024-02-29');
  assert.equal(dateFromKey('2026-13-01'), null);
  assert.equal(dateFromKey('not a date'), null);
});

test('неделя начинается в понедельник и может пересекать границу года', () => {
  const sunday = dateFromKey('2027-01-03');
  assert.equal(dateToKey(startOfWeek(sunday)), '2026-12-28');
  const bounds = getPeriodBounds(sunday, 'week');
  assert.equal(dateToKey(bounds.start), '2026-12-28');
  assert.equal(dateToKey(bounds.end), '2027-01-03');
  assert.equal(formatWeekRange(sunday), '28 декабря 2026 – 3 января 2027');
  assert.equal(formatWeekRange(dateFromKey('2026-11-27')), '23 – 29 ноября 2026');
});

test('месяц и перемещение по датам учитывают разную длину месяцев', () => {
  assert.equal(dateToKey(addMonths(dateFromKey('2024-01-31'), 1)), '2024-02-29');
  assert.equal(dateToKey(addMonths(dateFromKey('2026-03-31'), -1)), '2026-02-28');
  assert.equal(dateToKey(addDays(dateFromKey('2026-12-31'), 1)), '2027-01-01');
  const bounds = getPeriodBounds(dateFromKey('2024-02-15'), 'month');
  assert.equal(dateToKey(bounds.start), '2024-02-01');
  assert.equal(dateToKey(bounds.end), '2024-02-29');
  assert.equal(formatMonth(dateFromKey('2026-11-27')), 'Ноябрь 2026');
});

test('в выборку попадают только оценки за выбранную неделю или месяц', () => {
  const records = [
    entry(5, '2026-11-22'),
    entry(4, '2026-11-23'),
    entry(3, '2026-11-27'),
    entry(2, '2026-11-29'),
    entry(5, '2026-11-30'),
    entry(4, '2026-12-01'),
  ];
  const anchor = dateFromKey('2026-11-27');
  assert.deepEqual(entriesInPeriod(records, anchor, 'week').map((item) => item.date), ['2026-11-23', '2026-11-27', '2026-11-29']);
  assert.equal(summarize(entriesInPeriod(records, anchor, 'week')).total, -350);
  assert.equal(entriesInPeriod(records, anchor, 'month').length, 5);
  assert.equal(summarize(entriesInPeriod(records, anchor, 'month')).total, 650);
});

test('суммы и окончания отображаются по-русски', () => {
  assert.equal(formatMoney(500, true), '+500 ₽');
  assert.equal(formatMoney(-150, true), '−150 ₽');
  assert.equal(formatMoney(0, true), '0 ₽');
  assert.equal(formatMoney(1500, true), '+1 500 ₽');
  assert.deepEqual([0, 1, 2, 4, 5, 11, 21, 22, 25, 111].map(pluralGrades), ['оценок', 'оценка', 'оценки', 'оценки', 'оценок', 'оценок', 'оценка', 'оценки', 'оценок', 'оценок']);
});

test('из хранилища принимаются только корректные записи', () => {
  assert.equal(isValidEntry(entry(5, '2026-11-27')), true);
  assert.equal(isValidEntry(entry(1, '2026-11-27')), false);
  assert.equal(isValidEntry(entry(5, '2026-02-30')), false);
  assert.equal(isValidEntry({ grade: 5, date: '2026-11-27' }), false);
});
