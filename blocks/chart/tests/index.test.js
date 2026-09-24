/**
 * blocks/chart/index.js under JSDOM with a stubbed `window.wp`.
 *
 * The script is plain (no build step), so it is evaluated as-is. A small
 * hooks renderer stands in for React: it expands function components, keeps
 * useState/useRef slots per component instance, runs effects when their deps
 * change, and materialises the tree into a real DOM container so refs point
 * at real elements (in the top document or in an iframe, like the editor canvas).
 */
// The script's source text (Vite ?raw), evaluated like WordPress prints it.
import SOURCE from '../index.js?raw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CHARTS = [
  { id: '1', title: 'Ventas por estado', value: JSON.stringify({ chart: 'bars', subtitle: 'Suma 2026' }) },
  { id: '2', title: '', value: JSON.stringify({ chart: 'map', theme: 'dark', title: 'Mapa' }) },
  { id: '3', title: '', value: '{}' }
];

function stubComponent(name) {
  const fn = () => null;
  Object.defineProperty(fn, 'name', { value: name });
  fn.isStub = true;
  return fn;
}

/** Minimal React-ish runtime over plain element objects. */
function createRuntime() {
  const instances = new Map(); // path -> { hooks: [], effects: [] }
  let current = null;
  let dirty = false;
  const seen = new Set();

  const slot = (init) => {
    const i = current.index++;
    if (!(i in current.hooks)) current.hooks[i] = init();
    return current.hooks[i];
  };

  const element = {
    Fragment: 'fragment',
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children: children.flat() } };
    },
    useState(initial) {
      const cell = slot(() => ({ value: typeof initial === 'function' ? initial() : initial }));
      return [cell.value, (next) => {
        cell.value = typeof next === 'function' ? next(cell.value) : next;
        dirty = true;
      }];
    },
    useRef(initial) {
      return slot(() => ({ current: initial }));
    },
    useEffect(fn, deps) {
      const cell = slot(() => ({ deps: undefined, cleanup: undefined, pending: null }));
      const changed = !cell.deps || !deps || deps.length !== cell.deps.length || deps.some((d, i) => !Object.is(d, cell.deps[i]));
      if (changed) {
        cell.pending = fn;
        cell.deps = deps;
        current.effects.push(cell);
      }
    }
  };

  // Expand function components into host elements (strings / stubs).
  function expand(node, path) {
    if (node == null || node === false || typeof node === 'string' || typeof node === 'number') return node;
    const key = node.props && node.props.key != null ? `k${node.props.key}` : '';
    const here = `${path}/${key}`;
    if (typeof node.type === 'function' && !node.type.isStub) {
      const id = `${here}:${node.type.name}`;
      seen.add(id);
      if (!instances.has(id)) instances.set(id, { hooks: [], effects: [] });
      const parent = current;
      current = instances.get(id);
      current.index = 0;
      const out = node.type(node.props);
      current = parent;
      return expand(out, id);
    }
    return {
      type: node.type,
      props: { ...node.props, children: (node.props.children || []).map((c, i) => expand(c, `${here}.${i}`)) }
    };
  }

  function materialize(node, doc) {
    if (node == null || node === false) return null;
    if (typeof node === 'string' || typeof node === 'number') return doc.createTextNode(String(node));
    const tag = typeof node.type === 'string' && node.type !== 'fragment' ? node.type : 'div';
    const dom = doc.createElement(tag);
    if (typeof node.type === 'function') dom.setAttribute('data-stub', node.type.name);
    if (node.type === 'fragment') dom.setAttribute('data-fragment', '');
    for (const [name, value] of Object.entries(node.props)) {
      if (name === 'children' || name === 'key' || value === undefined) continue;
      if (name === 'ref') value.current = dom;
      else if (name === 'className') dom.setAttribute('class', value);
      else if (typeof value === 'string' || typeof value === 'number') dom.setAttribute(name, String(value));
    }
    for (const child of node.props.children || []) {
      const c = materialize(child, doc);
      if (c) dom.appendChild(c);
    }
    return dom;
  }

  async function render(root, container) {
    let tree;
    for (let pass = 0; pass < 20; pass++) {
      dirty = false;
      seen.clear();
      current = null;
      tree = expand(root, '');
      // Unmount instances that left the tree.
      for (const [id, inst] of instances) {
        if (!seen.has(id)) {
          inst.hooks.forEach((h) => h && typeof h.cleanup === 'function' && h.cleanup());
          instances.delete(id);
        }
      }
      container.replaceChildren(materialize(tree, container.ownerDocument));
      for (const inst of instances.values()) {
        const effects = inst.effects.splice(0);
        for (const cell of effects) {
          if (typeof cell.cleanup === 'function') cell.cleanup();
          cell.cleanup = cell.pending();
          cell.pending = null;
        }
      }
      await new Promise((r) => setTimeout(r, 0));
      if (!dirty) break;
    }
    return tree;
  }

  return { element, render };
}

function find(tree, predicate, out = []) {
  if (!tree || typeof tree !== 'object') return out;
  if (predicate(tree)) out.push(tree);
  (tree.props.children || []).forEach((c) => find(c, predicate, out));
  return out;
}

let wp;
let runtime;
let registered;
let apiFetch;

function loadScript() {
  new Function(SOURCE)();
}

beforeEach(() => {
  runtime = createRuntime();
  registered = [];
  apiFetch = vi.fn(({ path }) => {
    if (path.startsWith('/vpress/v1/chart/list/')) return Promise.resolve({ data: CHARTS, total: CHARTS.length });
    if (path === '/vpress/v1/chart/get/250') return Promise.resolve({ data: { id: '250', title: 'Far away', value: '{}' } });
    if (path.startsWith('/vpress/v1/chart/get/')) return Promise.resolve({ data: null });
    return Promise.reject(new Error(`unexpected ${path}`));
  });
  const components = {};
  for (const name of ['Placeholder', 'ComboboxControl', 'ToggleControl', 'PanelBody', 'Spinner', 'Button']) {
    components[name] = stubComponent(name);
  }
  wp = {
    blocks: {
      getBlockType: vi.fn((name) => registered.find((b) => b.name === name)),
      registerBlockType: vi.fn((name, settings) => registered.push({ name, settings }))
    },
    blockEditor: {
      useBlockProps: vi.fn(() => ({ className: 'wp-block-vpress-chart' })),
      InspectorControls: stubComponent('InspectorControls')
    },
    components,
    element: runtime.element,
    apiFetch,
    i18n: {
      __: (text) => text,
      sprintf: (format, ...args) => format.replace(/%d/, String(args[0]))
    }
  };
  window.wp = wp;
  window.vpressBlock = {
    embedUrl: 'http://example.test/wp-content/plugins/vpress/admin/dist/js/embed.js?ver=1',
    embedCss: 'http://example.test/wp-content/plugins/vpress/admin/dist/css/embed.css?ver=1',
    restRoot: 'http://example.test/wp-json/vpress/v1/',
    adminUrl: 'http://example.test/wp-admin/admin.php?page=vpress',
    nonce: 'n0nce'
  };
});

afterEach(() => {
  delete window.wp;
  delete window.vpressBlock;
  delete window.vpress;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

function edit(attributes, setAttributes = vi.fn()) {
  const { createElement } = runtime.element;
  return createElement(registered[0].settings.edit, { attributes, setAttributes });
}

function container(doc = document) {
  const div = doc.createElement('div');
  doc.body.appendChild(div);
  return div;
}

/** Complete the embed <script> the block injected into `doc`, as a browser would. */
function finishEmbedLoad(doc, mount) {
  const script = doc.querySelector('script[data-vpress-embed]');
  expect(script, 'embed script injected').not.toBeNull();
  doc.defaultView.vpress = { mount };
  script.dispatchEvent(new doc.defaultView.Event('load'));
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('vpress/chart editor script', () => {
  it('registers vpress/chart once, as a dynamic block', () => {
    loadScript();
    loadScript();

    expect(wp.blocks.registerBlockType).toHaveBeenCalledTimes(1);
    expect(wp.blocks.registerBlockType.mock.calls[0][0]).toBe('vpress/chart');
    const settings = wp.blocks.registerBlockType.mock.calls[0][1];
    expect(typeof settings.edit).toBe('function');
    expect(settings.save()).toBeNull();
  });

  it('renders a placeholder with the chart combobox when no chart is set', async () => {
    loadScript();
    const setAttributes = vi.fn();

    const tree = await runtime.render(edit({ showCaption: true }, setAttributes), container());

    expect(apiFetch).toHaveBeenCalledWith({ path: '/vpress/v1/chart/list/?page=1&perPage=100&q=' });
    const placeholder = find(tree, (n) => n.type === wp.components.Placeholder);
    expect(placeholder).toHaveLength(1);
    expect(find(tree, (n) => n.type === 'figure')).toHaveLength(0);

    const combo = find(placeholder[0], (n) => n.type === wp.components.ComboboxControl)[0];
    expect(combo.props.options).toEqual([
      { label: 'Ventas por estado', value: '1' },
      { label: 'Mapa', value: '2' },
      { label: 'Chart #3', value: '3' }
    ]);
    combo.props.onChange('2');
    expect(setAttributes).toHaveBeenCalledWith({ chartId: 2 });
    combo.props.onChange(null);
    expect(setAttributes).toHaveBeenLastCalledWith({ chartId: undefined });

    const create = find(placeholder[0], (n) => n.type === wp.components.Button)[0];
    expect(create.props.href).toBe('http://example.test/wp-admin/admin.php?page=vpress');
    expect(create.props.children).toEqual(['Create a chart']);

    // Wrapped in the block props.
    expect(tree.props.className).toBe('wp-block-vpress-chart');
  });

  it('wires the inspector: chart combobox, caption toggle, Edit in Vpress link', async () => {
    loadScript();
    const setAttributes = vi.fn();
    const tree = await runtime.render(edit({ chartId: 1, showCaption: false }, setAttributes), container());
    finishEmbedLoad(document, vi.fn(() => []));

    const inspector = find(tree, (n) => n.type === wp.blockEditor.InspectorControls)[0];
    const combo = find(inspector, (n) => n.type === wp.components.ComboboxControl)[0];
    expect(combo.props.value).toBe('1');
    const toggle = find(inspector, (n) => n.type === wp.components.ToggleControl)[0];
    expect(toggle.props.label).toBe('Show caption');
    expect(toggle.props.checked).toBe(false);
    toggle.props.onChange(true);
    expect(setAttributes).toHaveBeenCalledWith({ showCaption: true });
    const link = find(inspector, (n) => n.type === wp.components.Button)[0];
    expect(link.props.children).toEqual(['Edit in Vpress']);
    expect(link.props.href).toBe('http://example.test/wp-admin/admin.php?page=vpress');
  });

  it('renders the figure contract and mounts the embed into it', async () => {
    loadScript();
    const host = container();
    const app = { unmount: vi.fn() };
    const mount = vi.fn(() => [app]);

    const tree = await runtime.render(edit({ chartId: 1, showCaption: true }), host);

    const figure = host.querySelector('figure');
    expect(figure.getAttribute('data-vpress-chart')).toBe('1');
    expect(figure.getAttribute('data-vpress-rest')).toBe('http://example.test/wp-json/vpress/v1/');
    expect(figure.getAttribute('data-vpress-nonce')).toBe('n0nce');
    expect(figure.className).toBe('vpress-figure vpress-figure--bars vpress-figure--light');
    expect(figure.querySelector('.vpress-figure__chart').getAttribute('aria-label')).toBe('Ventas por estado');
    expect(figure.querySelector('.vpress-figure__title').textContent).toBe('Ventas por estado');
    expect(figure.querySelector('.vpress-figure__subtitle').textContent).toBe('Suma 2026');
    expect(find(tree, (n) => n.type === wp.components.Placeholder)).toHaveLength(0);

    // Embed module + stylesheet go into the figure's own document, once.
    expect(document.querySelectorAll('script[data-vpress-embed]')).toHaveLength(1);
    const script = document.querySelector('script[data-vpress-embed]');
    expect(script.type).toBe('module');
    expect(script.src).toBe(window.vpressBlock.embedUrl);
    const link = document.querySelector('link[data-vpress-embed-css]');
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toBe(window.vpressBlock.embedCss);
    // Held back from the embed's own auto-mount until the block mounts it.
    expect(figure.dataset.vpressMounted).toBe('pending');

    finishEmbedLoad(document, mount);
    await flush();

    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount.mock.calls[0][0]).toBe(figure);
    expect(figure.dataset.vpressMounted).toBeUndefined();
  });

  it('omits the caption when showCaption is false', async () => {
    loadScript();
    const host = container();
    await runtime.render(edit({ chartId: 2, showCaption: false }), host);

    const figure = host.querySelector('figure');
    expect(figure.className).toBe('vpress-figure vpress-figure--map vpress-figure--dark');
    expect(figure.querySelector('figcaption')).toBeNull();
  });

  it('mounts into the editor canvas iframe with the iframe window’s embed', async () => {
    loadScript();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const canvas = iframe.contentDocument;
    const host = container(canvas);
    const mount = vi.fn(() => []);

    await runtime.render(edit({ chartId: 1, showCaption: true }), host);

    expect(canvas.querySelector('script[data-vpress-embed]')).not.toBeNull();
    expect(canvas.querySelector('link[data-vpress-embed-css]')).not.toBeNull();
    expect(document.querySelector('script[data-vpress-embed]')).toBeNull();
    expect(document.querySelector('link[data-vpress-embed-css]')).toBeNull();

    finishEmbedLoad(canvas, mount);
    await flush();

    expect(mount).toHaveBeenCalledWith(host.querySelector('figure'));
    expect(window.vpress).toBeUndefined();
  });

  it('reuses a document’s loaded embed for a second block and unmounts on chart change', async () => {
    loadScript();
    const app = { unmount: vi.fn() };
    const mount = vi.fn(() => [app]);
    const setAttributes = vi.fn();

    const first = container();
    await runtime.render(edit({ chartId: 1 }, setAttributes), first);
    finishEmbedLoad(document, mount);
    await flush();

    // Same runtime, new chart → old preview cleaned up, new figure mounted.
    await runtime.render(edit({ chartId: 2 }, setAttributes), first);
    await flush();
    expect(app.unmount).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(2);
    expect(mount.mock.calls[1][0].getAttribute('data-vpress-chart')).toBe('2');
    expect(document.querySelectorAll('script[data-vpress-embed]')).toHaveLength(1);
    expect(document.querySelectorAll('link[data-vpress-embed-css]')).toHaveLength(1);
  });

  it('looks up a chart outside the first page of the list by id', async () => {
    loadScript();
    const host = container();
    await runtime.render(edit({ chartId: 250 }), host);

    expect(apiFetch).toHaveBeenCalledWith({ path: '/vpress/v1/chart/get/250' });
    expect(host.querySelector('figure').getAttribute('data-vpress-chart')).toBe('250');
  });

  it('shows an "unknown chart" placeholder when the chart no longer exists', async () => {
    loadScript();
    const host = container();
    const tree = await runtime.render(edit({ chartId: 99 }), host);

    expect(host.querySelector('figure')).toBeNull();
    const placeholder = find(tree, (n) => n.type === wp.components.Placeholder)[0];
    expect(placeholder.props.instructions).toContain('Chart #99 is not available');
    const combo = find(placeholder, (n) => n.type === wp.components.ComboboxControl)[0];
    expect(combo.props.value).toBeNull();
    expect(document.querySelector('script[data-vpress-embed]')).toBeNull();
  });

  it('shows a load error when the embed module fails', async () => {
    loadScript();
    const host = container();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runtime.render(edit({ chartId: 1 }), host);

    document.querySelector('script[data-vpress-embed]').dispatchEvent(new Event('error'));
    await flush();
    await runtime.render(edit({ chartId: 1 }), host);

    expect(host.querySelector('.vpress-block__error').textContent).toBe('The chart preview could not be loaded.');
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
