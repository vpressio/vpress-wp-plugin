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

/** The message of a WP_Error REST response, or a fallback. */
export function restErrorMessage(error, fallback) {
  const data = error && error.response && error.response.data;
  return (data && data.message) || fallback;
}
