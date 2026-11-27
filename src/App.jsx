import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  History,
  LayoutGrid,
  LockKeyhole,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import {
  GRADE_OPTIONS,
  GRADE_VALUES,
  WEEKDAY_SHORT,
  addDays,
  addMonths,
  dateFromKey,
  dateToKey,
  entriesInPeriod,
  formatDay,
  formatEntryDay,
  formatMoney,
  formatMonth,
  formatToday,
  formatWeekRange,
  getPeriodBounds,
  isValidEntry,
  pluralGrades,
  sortEntries,
  startOfWeek,
  summarize,
} from './gradeUtils';

const STORAGE_KEY = 'pyaterka.grades.v1';

function readSavedEntries() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { entries: [], failed: false };
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isValidEntry)) throw new Error('Invalid saved data');
    return { entries: parsed, failed: false };
  } catch {
    // Don't overwrite unreadable data. The app remains usable in memory and tells the user.
    return { entries: [], failed: true };
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Logo({ compact = false }) {
  return (
    <a className={`brand ${compact ? 'brand--compact' : ''}`} href="#overview">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M19.5 5.5 23 15.4l9.9 3.6-9.9 3.5-3.5 10-3.6-10L6 19l9.9-3.6 3.6-9.9Z" fill="currentColor" />
          <circle cx="31.7" cy="30.7" r="2.7" fill="#F3D076" />
        </svg>
      </span>
      <span className="brand-wordmark">
        <strong>пятёрка<span>.</span></strong>
        <small>КОПИЛКА ОЦЕНОК</small>
      </span>
    </a>
  );
}

function Sidebar() {
  const [active, setActive] = useState('overview');

  return (
    <aside className="sidebar">
      <Logo />
      <div className="sidebar-divider" />

      <nav className="side-navigation" aria-label="Навигация по странице">
        <p className="side-caption">МЕНЮ</p>
        <a className={`side-link ${active === 'overview' ? 'is-active' : ''}`} href="#overview" onClick={() => setActive('overview')}>
          <LayoutGrid size={18} strokeWidth={1.8} />
          <span>Обзор</span>
          <ChevronRight className="side-link-arrow" size={15} />
        </a>
        <a className={`side-link ${active === 'history' ? 'is-active' : ''}`} href="#history" onClick={() => setActive('history')}>
          <History size={18} strokeWidth={1.8} />
          <span>История оценок</span>
          <ChevronRight className="side-link-arrow" size={15} />
        </a>
      </nav>

      <div className="sidebar-divider rules-divider" />
      <section className="sidebar-rules" aria-label="Стоимость оценок">
        <p className="side-caption">СТОИМОСТЬ ОЦЕНОК</p>
        <div className="rate-list">
          {GRADE_OPTIONS.map(({ grade, name, amount }) => (
            <div className="rate-row" key={grade}>
              <span className={`rate-number grade-tone-${grade}`}>{grade}</span>
              <span className="rate-name">{name}</span>
              <span className={`rate-amount ${amount < 0 ? 'is-negative' : ''}`}>{formatMoney(amount, true)}</span>
            </div>
          ))}
        </div>
        <p className="rates-footnote">За каждую записанную оценку</p>
      </section>

      <div className="sidebar-spacer" />
      <div className="sidebar-note">
        <span className="note-icon"><Sparkles size={17} strokeWidth={1.8} /></span>
        <span className="note-star" aria-hidden="true">✳</span>
        <strong>Каждая оценка —<br />шаг вперёд</strong>
        <p>Маленькие успехи складываются в большие достижения.</p>
      </div>
      <div className="sidebar-privacy"><LockKeyhole size={14} /> <span>Данные только на этом устройстве</span></div>
    </aside>
  );
}

function BalanceCard({ monthEntries, weekEntries, today }) {
  const month = summarize(monthEntries);
  const week = summarize(weekEntries);
  const formattedBalance = formatMoney(month.total, true);
  // Keep larger amounts legible without letting them run into the illustration.
  const amountScale = Math.min(1, 7 / formattedBalance.length);
  let status = 'Добавь первую оценку — всё только начинается!';
  if (monthEntries.length > 0 && month.total > 0) status = 'Отлично! В этом месяце ты в плюсе.';
  if (monthEntries.length > 0 && month.total < 0) status = 'Пока в минусе, но всё можно исправить!';
  if (monthEntries.length > 0 && month.total === 0) status = 'Баланс ровный. Продолжай в том же духе!';

  return (
    <section className="balance-card" aria-label="Баланс за текущий месяц">
      <div className="balance-topline">
        <span className="balance-eyebrow"><WalletCards size={15} strokeWidth={1.9} /> МОЯ КОПИЛКА</span>
        <span className="month-chip">{formatMonth(today)}</span>
      </div>
      <div className="balance-main">
        <div className="balance-copy">
          <p className="balance-label">Баланс за месяц</p>
          <div className={`balance-amount ${month.total < 0 ? 'balance-amount--negative' : ''}`} style={{ '--amount-scale': amountScale }}>{formattedBalance}</div>
          <p className="balance-status"><span aria-hidden="true" />{status}</p>
        </div>
        <img className="piggy-image" src="/images/kopilka.webp" alt="" aria-hidden="true" />
      </div>
      <div className="balance-stats">
        <div>
          <span>За эту неделю</span>
          <strong>{formatMoney(week.total, true)}</strong>
        </div>
        <div>
          <span>Оценок за месяц</span>
          <strong>{monthEntries.length}</strong>
        </div>
        <div className="balance-stats-icon" aria-hidden="true"><ArrowUpRight size={17} /></div>
      </div>
    </section>
  );
}

function EntryForm({ date, setDate, todayKey, onAdd }) {
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function submit(event) {
    event.preventDefault();
    const numericGrade = Number(grade);
    if (!/^[2-5]$/.test(grade) || !Object.hasOwn(GRADE_VALUES, numericGrade)) {
      setError('Введи оценку от 2 до 5.');
      inputRef.current?.focus();
      return;
    }
    if (!dateFromKey(date) || date > todayKey) {
      setError('Выбери дату не позже сегодняшнего дня.');
      return;
    }
    onAdd(numericGrade, date);
    setGrade('');
    setError('');
  }

  return (
    <section className="entry-card" id="add-grade" aria-labelledby="entry-title">
      <div className="entry-heading">
        <div>
          <p className="card-eyebrow">НОВАЯ ЗАПИСЬ</p>
          <h2 id="entry-title">Добавить оценку</h2>
        </div>
        <span className="entry-heading-icon" aria-hidden="true"><Plus size={20} strokeWidth={1.7} /></span>
      </div>
      <p className="entry-description">Выбери оценку или введи её вручную.</p>
      <form onSubmit={submit} noValidate>
        <div className="grade-picker" role="group" aria-label="Выбрать оценку">
          {GRADE_OPTIONS.map(({ grade: option, amount }) => (
            <button
              className={`grade-option grade-tone-${option} ${grade === String(option) ? 'is-selected' : ''}`}
              type="button"
              key={option}
              aria-label={`Оценка ${option}, ${formatMoney(amount, true)}`}
              aria-pressed={grade === String(option)}
              onClick={() => { setGrade(String(option)); setError(''); }}
            >
              <strong>{option}</strong>
              <span>{formatMoney(amount, true)}</span>
            </button>
          ))}
        </div>
        <div className="form-fields">
          <label className="field">
            <span>Оценка <span className="field-hint">от 2 до 5</span></span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[2-5]"
              maxLength={1}
              placeholder="Например, 5"
              value={grade}
              onChange={(event) => { setGrade(event.target.value); setError(''); }}
              aria-invalid={Boolean(error) && !/^[2-5]$/.test(grade)}
              aria-describedby={error ? 'entry-error' : undefined}
            />
          </label>
          <label className="field field-date">
            <span>Дата оценки</span>
            <input
              type="date"
              max={todayKey}
              value={date}
              onChange={(event) => { setDate(event.target.value); setError(''); }}
              aria-invalid={Boolean(error) && (!dateFromKey(date) || date > todayKey)}
              aria-describedby={error ? 'entry-error' : undefined}
            />
          </label>
        </div>
        {error && <p className="form-error" id="entry-error" role="alert">{error}</p>}
        <button className="add-button" type="submit">
          <Plus size={17} strokeWidth={2} />
          <span>Добавить в дневник</span>
          <ArrowUpRight className="add-button-arrow" size={17} />
        </button>
      </form>
    </section>
  );
}

function WeekStrip({ anchor, entries, todayKey }) {
  const start = startOfWeek(anchor);
  return (
    <div className="week-strip" aria-label="Оценки по дням недели">
      {WEEKDAY_SHORT.map((weekday, index) => {
        const date = addDays(start, index);
        const key = dateToKey(date);
        const dayEntries = sortEntries(entries.filter((entry) => entry.date === key));
        return (
          <div className={`week-day ${key === todayKey ? 'is-today' : ''}`} key={key} aria-label={`${formatDay(date, true)}: ${dayEntries.length} ${pluralGrades(dayEntries.length)}`}>
            <span className="week-day-name">{weekday}</span>
            <span className="week-day-date">{date.getDate()}</span>
            <div className="day-marks" aria-hidden="true">
              {dayEntries.length === 0 ? <span className="day-empty">—</span> : dayEntries.slice(0, 3).map((entry) => (
                <span className={`day-mark grade-tone-${entry.grade}`} key={entry.id}>{entry.grade}</span>
              ))}
              {dayEntries.length > 3 && <span className="day-more">+{dayEntries.length - 3}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthBreakdown({ summary }) {
  return (
    <div className="month-breakdown" aria-label="Количество каждой оценки за месяц">
      <span className="breakdown-label">ПО ОЦЕНКАМ</span>
      <div className="breakdown-items">
        {GRADE_OPTIONS.map(({ grade }) => (
          <div className="breakdown-item" key={grade}>
            <span className={`breakdown-grade grade-tone-${grade}`}>{grade}</span>
            <span><strong>{summary.counts[grade]}</strong> <span className="breakdown-word">{pluralGrades(summary.counts[grade])}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryList({ entries, today, onDelete, onAddClick }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true"><BookOpenText size={24} strokeWidth={1.45} /><span>✳</span></div>
        <div>
          <strong>Здесь пока нет оценок</strong>
          <p>Добавь первую оценку, и она появится в дневнике.</p>
        </div>
        <button type="button" className="empty-action" onClick={onAddClick}><Plus size={15} /> Добавить оценку</button>
      </div>
    );
  }

  const groups = new Map();
  for (const entry of sortEntries(entries)) {
    if (!groups.has(entry.date)) groups.set(entry.date, []);
    groups.get(entry.date).push(entry);
  }

  return (
    <div className="entries-list">
      {[...groups.entries()].map(([date, dayEntries]) => (
        <section className="entry-group" key={date} aria-label={formatEntryDay(dateFromKey(date), today)}>
          <div className="entry-group-heading">
            <h3>{formatEntryDay(dateFromKey(date), today)}</h3>
            <span>{dayEntries.length} {pluralGrades(dayEntries.length)}</span>
          </div>
          {dayEntries.map((entry) => {
            const amount = GRADE_VALUES[entry.grade];
            return (
              <div className="entry-row" key={entry.id}>
                <span className={`entry-grade grade-tone-${entry.grade}`}>{entry.grade}</span>
                <span className="entry-details"><strong>Оценка «{entry.grade}»</strong><small>{amount > 0 ? 'Начисление в копилку' : 'Списание из копилки'}</small></span>
                <strong className={`entry-amount ${amount < 0 ? 'is-negative' : ''}`}>{formatMoney(amount, true)}</strong>
                <button
                  className="delete-button"
                  type="button"
                  aria-label={`Удалить оценку ${entry.grade} от ${formatDay(dateFromKey(entry.date), true)}`}
                  title="Удалить оценку"
                  onClick={() => onDelete(entry)}
                ><Trash2 size={17} strokeWidth={1.7} /></button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function HistorySection({ entries, today, todayKey, period, setPeriod, anchor, setAnchor, onDelete, onAddClick }) {
  const periodEntries = useMemo(() => entriesInPeriod(entries, anchor, period), [entries, anchor, period]);
  const summary = useMemo(() => summarize(periodEntries), [periodEntries]);
  const currentStart = dateToKey(getPeriodBounds(today, period).start);
  const selectedStart = dateToKey(getPeriodBounds(anchor, period).start);
  const isCurrent = currentStart === selectedStart;
  const nextAnchor = period === 'week' ? addDays(anchor, 7) : addMonths(anchor, 1);
  const canGoNext = dateToKey(getPeriodBounds(nextAnchor, period).start) <= currentStart;
  const label = period === 'week' ? formatWeekRange(anchor) : formatMonth(anchor);

  function movePeriod(direction) {
    setAnchor(period === 'week' ? addDays(anchor, direction * 7) : addMonths(anchor, direction));
  }

  return (
    <section className="history-section" id="history" aria-labelledby="history-title">
      <div className="section-heading">
        <div className="section-title-wrap">
          <span className="section-icon" aria-hidden="true"><ClipboardList size={20} strokeWidth={1.7} /></span>
          <div>
            <p className="card-eyebrow">ТВОЙ ПРОГРЕСС</p>
            <h2 id="history-title">История оценок</h2>
          </div>
        </div>
        <div className="period-tabs" role="group" aria-label="Период истории">
          <button type="button" className={period === 'week' ? 'is-active' : ''} aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>Неделя</button>
          <button type="button" className={period === 'month' ? 'is-active' : ''} aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>Месяц</button>
        </div>
      </div>
      <div className="history-card">
        <div className="history-toolbar">
          <div className="period-navigation">
            <button className="period-arrow" type="button" onClick={() => movePeriod(-1)} aria-label={period === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'}><ChevronLeft size={18} /></button>
            <div className="period-label">
              <strong>{label}</strong>
              <span>{isCurrent ? (period === 'week' ? 'Текущая неделя' : 'Текущий месяц') : (period === 'week' ? 'Неделя' : 'Месяц')}</span>
            </div>
            <button className="period-arrow" type="button" onClick={() => movePeriod(1)} disabled={!canGoNext} aria-label={period === 'week' ? 'Следующая неделя' : 'Следующий месяц'}><ChevronRight size={18} /></button>
            {!isCurrent && <button type="button" className="back-to-today" onClick={() => setAnchor(today)}>Сегодня</button>}
          </div>
          <div className="period-totals">
            <div><span>Всего оценок</span><strong>{periodEntries.length}</strong></div>
            <div><span>Итого за {period === 'week' ? 'неделю' : 'месяц'}</span><strong className={summary.total < 0 ? 'is-negative' : ''}>{formatMoney(summary.total, true)}</strong></div>
          </div>
        </div>
        {period === 'week'
          ? <WeekStrip anchor={anchor} entries={periodEntries} todayKey={todayKey} />
          : <MonthBreakdown summary={summary} />}
        <EntryList entries={periodEntries} today={today} onDelete={onDelete} onAddClick={onAddClick} />
        <div className="history-footer">
          <div><span className="footer-icon footer-icon--positive"><ArrowUpRight size={14} /></span> Начислено <strong>{formatMoney(summary.earned, true)}</strong></div>
          <div><span className="footer-icon footer-icon--negative"><ArrowDownLeft size={14} /></span> Списано <strong>{formatMoney(-summary.spent, true)}</strong></div>
          <span className="footer-note">Расчёт за выбранный период</span>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [saved] = useState(readSavedEntries);
  const [entries, setEntries] = useState(saved.entries);
  const [saveFailed, setSaveFailed] = useState(saved.failed);
  const [todayKey, setTodayKey] = useState(() => dateToKey(new Date()));
  const [entryDate, setEntryDate] = useState(todayKey);
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(() => dateFromKey(todayKey));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const previousToday = useRef(todayKey);
  const today = useMemo(() => dateFromKey(todayKey), [todayKey]);

  useEffect(() => {
    if (saved.failed) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [entries, saved.failed]);

  useEffect(() => {
    if (saved.failed) return undefined;
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        const next = event.newValue === null ? [] : JSON.parse(event.newValue);
        if (Array.isArray(next) && next.every(isValidEntry)) setEntries(next);
      } catch {
        setSaveFailed(true);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [saved.failed]);

  useEffect(() => {
    const timer = window.setInterval(() => setTodayKey(dateToKey(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (previousToday.current === todayKey) return;
    const oldTodayKey = previousToday.current;
    const oldToday = dateFromKey(oldTodayKey);
    setEntryDate((value) => value === oldTodayKey ? todayKey : value);
    setAnchor((value) => dateToKey(getPeriodBounds(value, period).start) === dateToKey(getPeriodBounds(oldToday, period).start) ? dateFromKey(todayKey) : value);
    previousToday.current = todayKey;
  }, [todayKey, period]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const monthEntries = useMemo(() => entriesInPeriod(entries, today, 'month'), [entries, today]);
  const weekEntries = useMemo(() => entriesInPeriod(entries, today, 'week'), [entries, today]);

  function showToast(message, undoEntry = null) {
    window.clearTimeout(toastTimer.current);
    setToast({ message, undoEntry });
    toastTimer.current = window.setTimeout(() => setToast(null), undoEntry ? 8000 : 3500);
  }

  function addEntry(grade, date) {
    const entry = { id: makeId(), grade, date, createdAt: Date.now() };
    setEntries((previous) => [...previous, entry]);
    setAnchor(dateFromKey(date));
    showToast(`Оценка ${grade} добавлена · ${formatMoney(GRADE_VALUES[grade], true)}`);
  }

  function deleteEntry(entry) {
    setEntries((previous) => previous.filter((item) => item.id !== entry.id));
    showToast('Оценка удалена', entry);
  }

  function undoDelete() {
    if (!toast?.undoEntry) return;
    const restored = toast.undoEntry;
    setEntries((previous) => previous.some((entry) => entry.id === restored.id) ? previous : [...previous, restored]);
    showToast('Оценка восстановлена');
  }

  function focusEntryForm() {
    setEntryDate(dateToKey(anchor) <= todayKey ? dateToKey(anchor) : todayKey);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('add-grade')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(() => document.querySelector('#add-grade input')?.focus({ preventScroll: true }), reducedMotion ? 0 : 350);
  }

  return (
    <div className="app-shell" id="overview">
      <Sidebar />
      <main className="workspace">
        <div className="mobile-topbar"><Logo compact /><a href="#history"><History size={17} /> История</a></div>
        <header className="topbar">
          <div className="breadcrumb"><span>МОЙ ДНЕВНИК</span><ChevronRight size={13} /><strong>ОБЗОР</strong></div>
          <div className="topbar-right"><span className="today-pill"><CalendarDays size={15} /> {formatToday(today)}</span><span className="topbar-avatar" aria-hidden="true"><Sparkles size={17} /></span></div>
        </header>
        <div className="page-content">
          {saveFailed && <div className="storage-warning" role="alert"><CircleHelp size={18} /><span>Не удалось прочитать или сохранить данные в браузере. Новые оценки доступны только до закрытия страницы.</span></div>}
          <div className="page-intro">
            <div>
              <div className="intro-kicker"><span /> ТВОЙ ДНЕВНИК УСПЕХОВ</div>
              <h1>Твоя копилка оценок <span aria-hidden="true">✳</span></h1>
              <p>Записывай оценки и смотри, как растёт твой результат.</p>
            </div>
            <div className="intro-aside"><span>✦</span> Каждый успех на счету</div>
          </div>
          <div className="dashboard-grid">
            <BalanceCard monthEntries={monthEntries} weekEntries={weekEntries} today={today} />
            <EntryForm date={entryDate} setDate={setEntryDate} todayKey={todayKey} onAdd={addEntry} />
          </div>
          <HistorySection
            entries={entries}
            today={today}
            todayKey={todayKey}
            period={period}
            setPeriod={setPeriod}
            anchor={anchor}
            setAnchor={setAnchor}
            onDelete={deleteEntry}
            onAddClick={focusEntryForm}
          />
          <footer className="page-footer"><span>Пятёрка · копилка твоих успехов</span><span><LockKeyhole size={13} /> {saveFailed ? 'Сохранение недоступно' : 'Всё сохраняется в этом браузере'}</span></footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Check size={15} /></span>
          <span>{toast.message}</span>
          {toast.undoEntry && <button type="button" className="toast-undo" onClick={undoDelete}><RotateCcw size={14} /> Вернуть</button>}
          <button type="button" className="toast-close" aria-label="Закрыть уведомление" onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}
    </div>
  );
}
