/** Date helpers. Everything is local-time; dates are stored as `YYYY-MM-DD`. */

export function toISODate(d = new Date()) {
  const dt = typeof d === 'string' ? new Date(`${d}T00:00:00`) : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local midnight for a `YYYY-MM-DD` string. */
export function fromISODate(iso) {
  return new Date(`${iso}T00:00:00`);
}

export const MS_HOUR = 3600 * 1000;
export const MS_DAY = 24 * MS_HOUR;

export function hoursBetween(fromMs, toMs) {
  return (toMs - fromMs) / MS_HOUR;
}

/** Whole days between two `YYYY-MM-DD` dates (b - a). */
export function daysBetweenDates(aISO, bISO) {
  return Math.round((fromISODate(bISO) - fromISODate(aISO)) / MS_DAY);
}

export function addDays(iso, n) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Monday-anchored week start for a `YYYY-MM-DD` date. */
export function weekStart(iso) {
  const d = fromISODate(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export function monthMatrix(year, month) {
  // month is 0-indexed. Returns 6 rows x 7 cols of ISO dates (Monday first).
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(start);
      d.setDate(start.getDate() + r * 7 + c);
      row.push({ iso: toISODate(d), inMonth: d.getMonth() === month });
    }
    rows.push(row);
  }
  return rows;
}

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const WEEKDAYS_SHORT = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
};

export const monthName = (month, lang) => MONTHS[lang]?.[month] ?? MONTHS.en[month];
export const weekdayShort = (lang) => WEEKDAYS_SHORT[lang] ?? WEEKDAYS_SHORT.en;

export function formatDate(iso, lang) {
  const d = fromISODate(iso);
  const m = monthName(d.getMonth(), lang);
  return lang === 'es' ? `${d.getDate()} ${m.toLowerCase()} ${d.getFullYear()}` : `${m} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatHoursAgo(hours, lang) {
  if (hours == null || !Number.isFinite(hours)) return lang === 'es' ? 'nunca' : 'never';
  if (hours < 1) return lang === 'es' ? 'hace <1 h' : '<1h ago';
  if (hours < 48) return lang === 'es' ? `hace ${Math.round(hours)} h` : `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return lang === 'es' ? `hace ${days} d` : `${days}d ago`;
}
