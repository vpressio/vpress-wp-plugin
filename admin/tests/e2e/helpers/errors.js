/**
 * Collect console errors and uncaught page errors for a page. Returns a live
 * array plus a formatter for assertion messages.
 */
export function collectPageErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const loc = msg.location();
      errors.push(`console.error: ${msg.text()}${loc && loc.url ? ` (${loc.url}:${loc.lineNumber})` : ''}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}\n${err.stack || ''}`);
  });
  return {
    errors,
    report: () => (errors.length ? `\n${errors.join('\n')}` : '')
  };
}
