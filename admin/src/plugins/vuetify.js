import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import '@mdi/font/css/materialdesignicons.css';
import vpressConfig from '../assets/vpress.theme.json';

// Vuetify 2 theme shape: { themes: { light: { primary: '#...' } } }
// Vuetify 3 theme shape: { themes: { light: { colors: { primary: '#...' } } } }
// The JSON also carries non-color config (logo, gradient) consumed directly by
// components via vpress.theme.json — only real color strings go to Vuetify.
const normalizeColor = (value) =>
  /^[0-9a-fA-F]{6}$/.test(value) ? `#${value}` : value;

const themeColors = (entries) =>
  Object.fromEntries(
    Object.entries(entries)
      .filter(([, value]) => typeof value === 'string' && value !== '')
      .map(([key, value]) => [key, normalizeColor(value)])
  );

// The dark theme in vpress.theme.json is mostly empty — inherit the light
// brand colors so theme="dark" scopes resolve primary/color2/etc. to the
// brand palette instead of Vuetify's default dark palette (Material blue).
const lightColors = themeColors(vpressConfig.themes.light || {});
const themes = Object.fromEntries(
  Object.entries(vpressConfig.themes).map(([name, entries]) => [
    name,
    {
      // Without dark:true Vuetify builds the theme with light on-surface
      // tokens — theme="dark" scopes would render black text.
      dark: name === 'dark',
      colors: name === 'dark'
        ? { ...lightColors, ...themeColors(entries) }
        : themeColors(entries)
    }
  ])
);

// Movable-dialog behavior (ported from the Vuetify 2 build; overlay selectors updated).
(function () {
  const d = {};
  document.addEventListener('mousedown', (e) => {
    const closestDialog = e.target.closest('.v-overlay--active .v-overlay__content');
    if (e.button === 0 && closestDialog != null && e.target.closest('.v-card-title')) {
      d.el = closestDialog;
      d.mouseStartX = e.clientX;
      d.mouseStartY = e.clientY;
      d.elStartX = d.el.getBoundingClientRect().left;
      d.elStartY = d.el.getBoundingClientRect().top;
      d.el.style.position = 'fixed';
      d.el.style.margin = 0;
      d.oldTransition = d.el.style.transition;
      d.el.style.transition = 'none';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (d.el === undefined) return;
    d.el.style.left =
      Math.min(
        Math.max(d.elStartX + e.clientX - d.mouseStartX, 0),
        window.innerWidth - d.el.getBoundingClientRect().width
      ) + 'px';
    d.el.style.top =
      Math.min(
        Math.max(d.elStartY + e.clientY - d.mouseStartY, 0),
        window.innerHeight - d.el.getBoundingClientRect().height
      ) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (d.el === undefined) return;
    d.el.style.transition = d.oldTransition;
    d.el = undefined;
  });
})();

export default createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: { themes }
});
