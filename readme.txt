=== Vpress ===
Contributors: alecsgarza
Tags: charts, data visualization, datasets, maps, storytelling
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.3.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Turn data into stories: import datasets, build interactive charts and maps, and publish them anywhere on your WordPress site.

== Description ==

Vpress is a data-visualization studio that lives inside your WordPress admin. Upload a spreadsheet, drag the columns you care about into a chart, give it your own look, and publish it on any post or page. No coding, no external dashboard, no separate account.

**How it works — four steps**

1. **Import** — upload a CSV file. Vpress stores it as a dataset in your own WordPress database.
2. **Chart** — pick a chart type and drag and drop the columns you want to visualize.
3. **Style** — adjust titles, axes, color palettes, fonts and proportions so the chart matches your brand.
4. **Publish** — embed the chart with a shortcode, or share its public chart page.

**Features**

* Chunked CSV import of files up to 20 MB that works on any host, with zero server configuration: no php.ini changes, no `LOAD DATA LOCAL INFILE`, no WP-Cron. A progress dialog shows rows imported as it goes.
* Automatic encoding detection, so spreadsheets exported from Excel on Windows keep their accents.
* Chart types: bars, stacked bars, scatter, heatmap, timeline and maps.
* Drag-and-drop chart editor with a live preview.
* Styles panel for titles, axes, colors and proportions.
* Shortcode embedding: `[vpress id="123"]` places chart 123 in any post, page or widget.
* A public page for every chart at `/chart/{id}`, ready to share.
* Your data stays in your own database. Vpress has no accounts, no telemetry and never sends your datasets to a third party.

**External services**

Vpress does not send your data anywhere. To draw some screens, the browser of the person viewing a chart loads these third-party resources:

* Map charts load base-map tiles from the OpenStreetMap tile servers (openstreetmap.fr). Only tile coordinates are requested; your dataset is never sent. Terms: https://operations.osmfoundation.org/policies/tiles/ — Privacy: https://osmfoundation.org/wiki/Privacy_Policy
* The Vpress admin screen and public chart pages load the Roboto font from Google Fonts. Terms: https://policies.google.com/terms — Privacy: https://policies.google.com/privacy

== Installation ==

1. In your WordPress admin go to **Plugins → Add New**, search for "Vpress", then click **Install Now** and **Activate**.
2. Or upload the `vpress` folder to `/wp-content/plugins/` and activate it from the **Plugins** screen.
3. Make sure **Settings → Permalinks** is set to anything other than "Plain", so public chart pages at `/chart/{id}` resolve.
4. Open the **Vpress** menu in your admin and import your first dataset.

No php.ini changes are required.

== Frequently Asked Questions ==

= How large a CSV can I import, and do I still need LOAD DATA LOCAL INFILE? =

Files up to 20 MB import on any host. Vpress uploads the file in small chunks and parses it on the server in short steps driven by your browser, so it never hits upload-size or execution-time limits. Earlier versions relied on MySQL's `LOAD DATA LOCAL INFILE`, which most shared hosts disable; that is no longer needed and no server configuration is required.

= Where does my data live? =

In your own WordPress database. Each dataset becomes its own table (prefixed `vpress_`), and Vpress keeps its registry of datasets, charts and imports in three tables prefixed `vpresscore_`. Nothing is copied to an external server.

= Does Vpress call external services? =

Not with your data. Vpress has no accounts, no telemetry and no remote API. The only third-party requests are display resources loaded by the viewer's browser: map tiles from OpenStreetMap for map charts, and the Roboto font from Google Fonts. See "External services" in the description.

= How do I embed a chart? =

Copy the chart's ID from the Vpress chart list and add the shortcode `[vpress id="123"]` (with your chart's ID) to any post, page or widget. Every chart also has a public page at `/chart/123`.

= How do I erase all Vpress data when I uninstall? =

By default, deleting the plugin keeps your datasets and charts so a reinstall picks up where you left off; only the options `vpress_db_version` and `vpress_erase_data_on_uninstall` are removed. To erase your data too, set the option `vpress_erase_data_on_uninstall` to true before deleting the plugin (for example with WP-CLI: `wp option update vpress_erase_data_on_uninstall 1`), or return true from the `vpress_erase_data_on_uninstall` filter. On uninstall Vpress then removes exactly:

* Tables: every dataset table (`vpress_` plus the dataset slug) and the `vpresscore_datasets`, `vpresscore_charts` and `vpresscore_imports` tables.
* Options: `vpress_db_version` and `vpress_erase_data_on_uninstall`.
* Transients: every transient whose name starts with `vpress_`.
* Files: the `wp-content/uploads/vpress` folder and everything in it.

On multisite this runs for every site in the network.

== Screenshots ==

1. Dataset list — every dataset you have imported.
2. Import progress dialog — a chunked CSV import reporting rows as it runs.
3. Chart editor — drag and drop columns onto the chart.
4. Styles panel — titles, axes, colors and proportions.
5. Public chart page — a published chart at /chart/{id}.
6. Shortcode in a post — a chart embedded with [vpress id="123"].

== Changelog ==

= 0.3.0 =
* Chunked CSV import (up to 20 MB, no server configuration), encoding detection, and WordPress.org readiness: English readme, opt-in data erasure on uninstall, rewrite rules flushed only on activation and deactivation, and Leaflet styles bundled locally. Full details: https://gitlab.com/vpress/vpress-wp-plugin/-/blob/master/CHANGELOG.md

= 0.2.0 =
* Admin app migrated to Vue 3, Vuetify 3 and Vite.

= 0.1.0 =
* Beta release: dataset import, chart editor, saved charts and datasets lists.

== Upgrade Notice ==

= 0.3.0 =
Large CSV files now import on any host without php.ini changes. Requires WordPress 6.5 and PHP 8.1.

== Descripción (Español) ==

Transforma tus datos en impacto: ¡publica y cuenta tu historia! Vpress te permite recolectar, analizar y visualizar tus datos desde el administrador de WordPress.

1. **Sube tus datos** — importa archivos CSV; se guardan como datasets en tu propia base de datos.
2. **Crea tu gráfica** — elige qué mostrar (comparaciones, proporciones, relaciones, distribuciones) y arrastra y suelta las columnas: barras, dispersión, mapas de calor, líneas de tiempo y mapas.
3. **Dale estilo** — ajusta títulos, ejes, colores, tipografías y proporciones para darle tu identidad.
4. **Publícala** — insértala en tu blog con el shortcode `[vpress id="123"]` o comparte su página pública `/chart/{id}`.

Tus datos nunca salen de tu base de datos.
