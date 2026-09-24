// Live data sources (CSV URL / Google Sheets): client-side helpers shared by
// the "Desde URL" form and the dataset card. The server re-validates
// everything (vpress_source_normalize); these only drive the UI.

export const REFRESH_INTERVALS = [
  { title: 'Manual', value: 'none' },
  { title: 'Cada hora', value: 'hourly' },
  { title: 'Diario', value: 'daily' },
  { title: 'Semanal', value: 'weekly' }
];

function parse(url) {
  try {
    return new URL(String(url || '').trim());
  } catch {
    return null;
  }
}

export function isHttpUrl(url) {
  const parsed = parse(url);
  return !!parsed && (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname;
}

export function isGoogleSheetUrl(url) {
  const parsed = parse(url);
  return !!parsed && parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/spreadsheets/');
}

/**
 * A dataset name suggested by the URL: the sheet title when the link carries
 * one (?title=…), otherwise the last path segment without its extension.
 * Google Sheets paths end in /edit or /pub, which name nothing.
 */
export function suggestDatasetName(url) {
  const parsed = parse(url);
  if (!parsed) return '';
  const title = parsed.searchParams.get('title');
  if (title) return title.trim();
  if (isGoogleSheetUrl(url)) return '';
  const segment = parsed.pathname.split('/').filter(Boolean).pop() || '';
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // keep the raw segment
  }
  return decoded.replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[-_]+/g, ' ').trim();
}

export function intervalLabel(value) {
  const found = REFRESH_INTERVALS.find(i => i.value === value);
  return found ? found.title : '';
}

/**
 * "hace 5 minutos"-style text for a UTC MySQL datetime ('YYYY-MM-DD HH:MM:SS').
 */
export function relativeTime(mysqlUtc, now = Date.now()) {
  if (!mysqlUtc) return 'nunca';
  const then = Date.parse(String(mysqlUtc).replace(' ', 'T') + 'Z');
  if (Number.isNaN(then)) return 'nunca';
  const seconds = Math.round((then - now) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'minute');
}

// ---- Provenance (source name / licence / data date / notes) ----

/**
 * Suggested licences for the combobox. Free text is allowed: the field is a
 * v-combobox, and the server only trims and caps the value.
 */
export const LICENSE_SUGGESTIONS = ['CC0-1.0', 'CC-BY-4.0', 'ODbL-1.0', 'Public domain', 'Otra'];

/** Whether a value is '' or a real YYYY-MM-DD calendar date (the server re-checks). */
export function isProvenanceDate(value) {
  const text = String(value == null ? '' : value).trim();
  if (text === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/**
 * "September 1, 2026" for a YYYY-MM-DD date, in UTC so the day never shifts.
 *
 * English, and WordPress's default `date_format` (F j, Y), because this feeds
 * the preview of a line the PAGE renders from English msgids through
 * wp_date( get_option( 'date_format' ) ) — see provenanceLine().
 */
export function provenanceDateLabel(value) {
  if (!isProvenanceDate(value) || !String(value || '').trim()) return '';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00Z`));
}

/** The YYYY-MM-DD day of a UTC MySQL datetime ('YYYY-MM-DD HH:MM:SS'). */
function mysqlDay(mysqlUtc) {
  return String(mysqlUtc || '').slice(0, 10);
}

/**
 * The source line as the figure will print it, for the editor's preview.
 *
 * Mirrors vpress_figure_source_footer(): nothing without a name or URL, the
 * host standing in for a missing name, and a live source's last refresh
 * winning over the editor's own date.
 *
 * DELIBERATELY ENGLISH, unlike the rest of this admin. The figure prints
 * these words from English msgids, and the plugin ships no translation, so a
 * Spanish preview would promise text the page does not print. The msgids stay
 * English (correct for i18n); if a translation is ever shipped, this preview
 * has to follow it rather than the other way round.
 */
export function provenanceLine(fields = {}) {
  const url = String(fields.source_url || '').trim();
  const linkable = /^https?:\/\//i.test(url);
  let name = String(fields.source_name || '').trim();
  if (!name && linkable) {
    const parsed = parse(url);
    name = parsed ? parsed.hostname : '';
  }
  if (!name) return '';

  const parts = [`Source: ${name}`];
  const license = String(fields.license || '').trim();
  if (license) parts.push(license);

  // The figure dates live sources by their last successful refresh, and
  // formats both with the site's date_format - never as relative time.
  const live = fields.source_type && fields.source_type !== 'upload';
  const date =
    live && fields.last_refreshed_at
      ? provenanceDateLabel(mysqlDay(fields.last_refreshed_at))
      : provenanceDateLabel(fields.retrieved_at);
  if (date) parts.push(`Data as of ${date}`);

  parts.push('Download data (JSON)');
  return parts.join(' · ');
}

/** The message of a WP_Error REST response, or a fallback. */
export function restErrorMessage(error, fallback) {
  const data = error && error.response && error.response.data;
  return (data && data.message) || fallback;
}
