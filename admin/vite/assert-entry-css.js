import { statSync } from 'node:fs';
import { basename, join } from 'node:path';

// Fail the build loudly when the stylesheet contract the PHP loaders rely on
// breaks: css/app.css (admin) and css/embed.css (public embed) must exist and
// be non-empty, and any other stylesheet must be one that emitted JS loads
// itself (lazy-chunk CSS such as chunk-leaflet.css). A stray per-chunk file
// nobody loads means styles silently went missing from the enqueued files.
export default function assertEntryCss(files = ['css/app.css', 'css/embed.css']) {
  return {
    name: 'vpress-assert-entry-css',
    apply: 'build',
    writeBundle(options, bundle) {
      const problems = [];

      const sizeOf = (file) => {
        try {
          return statSync(join(options.dir, file)).size;
        } catch {
          return 0;
        }
      };
      files
        .filter((file) => sizeOf(file) === 0)
        .forEach((file) => problems.push(`${file} is missing or empty`));

      const code = Object.values(bundle)
        .filter((out) => out.type === 'chunk')
        .map((chunk) => chunk.code)
        .join('\n');
      Object.keys(bundle)
        .filter((file) => file.endsWith('.css') && !files.includes(file))
        .filter((file) => !code.includes(basename(file)))
        .forEach((file) => problems.push(`${file} is emitted but never loaded (not folded into an entry stylesheet)`));

      if (problems.length) {
        this.error(`stylesheet contract broken: ${problems.join('; ')}`);
      }
    }
  };
}
