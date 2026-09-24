// One stylesheet per entry: css/app.css (admin) and css/embed.css (public
// embed) — the files the PHP loaders enqueue.
//
// With `cssCodeSplit: true` Vite emits one CSS file per chunk (chunk-vuetify.css,
// vpress-chart-container.css, …) and only an HTML page would link them all.
// WordPress enqueues a single file per surface, so this folds the CSS of every
// chunk an entry imports *statically* into that entry's css/<name>.css
// (dependencies first, the entry's own CSS last — the cascade order a single
// bundle had). CSS of lazily imported chunks (e.g. leaflet for maps) stays a
// separate file that Vite's preload helper fetches with the chunk; a folded
// file is deleted unless such a lazy chunk (or its imports) needs it.
export default function cssPerEntry() {
  return {
    name: 'vpress-css-per-entry',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((file) => file.type === 'chunk');
      const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
      const folded = new Set();

      for (const entry of chunks.filter((chunk) => chunk.isEntry)) {
        const seen = new Set();
        const cssFiles = [];
        const visit = (chunk) => {
          if (!chunk || seen.has(chunk.fileName)) return;
          seen.add(chunk.fileName);
          chunk.imports.forEach((file) => visit(byName.get(file)));
          (chunk.viteMetadata?.importedCss ?? new Set()).forEach((css) => {
            if (!cssFiles.includes(css)) cssFiles.push(css);
          });
        };
        visit(entry);

        const target = `css/${entry.name}.css`;
        const parts = cssFiles.map((file) => String(bundle[file]?.source ?? ''));
        // @charset is only valid as the very first rule of a stylesheet.
        const hasCharset = parts.some((css) => css.includes('@charset'));
        const body = parts
          .map((css) => css.replace(/@charset\s+"[^"]*";\s*/gi, '').trim())
          .filter(Boolean)
          .join('\n');
        const source = body && hasCharset ? `@charset "UTF-8";\n${body}` : body;
        if (!source) continue;

        cssFiles.filter((file) => file !== target).forEach((file) => folded.add(file));
        if (bundle[target]) {
          bundle[target].source = source;
        } else {
          this.emitFile({ type: 'asset', fileName: target, source });
        }
      }

      // CSS a lazily imported chunk (or anything it imports) needs at runtime:
      // Vite's preload helper fetches it by file name, so it must survive.
      const lazyCss = new Set();
      const lazySeen = new Set();
      const visitLazy = (chunk) => {
        if (!chunk || lazySeen.has(chunk.fileName)) return;
        lazySeen.add(chunk.fileName);
        chunk.imports.forEach((file) => visitLazy(byName.get(file)));
        (chunk.viteMetadata?.importedCss ?? new Set()).forEach((css) => lazyCss.add(css));
      };
      chunks.forEach((chunk) => chunk.dynamicImports.forEach((file) => visitLazy(byName.get(file))));

      for (const file of folded) {
        if (bundle[file] && !lazyCss.has(file) && !/^css\/(app|embed)\.css$/.test(file)) {
          delete bundle[file];
        }
      }
    }
  };
}
