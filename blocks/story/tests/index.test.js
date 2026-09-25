/**
 * blocks/story/index.js and blocks/story-step/index.js under JSDOM with a
 * stubbed `window.wp`.
 *
 * The scripts are plain (no build step), so they are evaluated as-is, in the
 * dependency order their index.asset.php files declare. The hooks runtime
 * that stands in for React is in blocks/shared/tests/editor-runtime.js.
 */
import EMBED_LOADER from '../../shared/embed-loader.js?raw';
import CHART_PICKER from '../../shared/chart-picker.js?raw';
import STORY from '../index.js?raw';
import STEP from '../../story-step/index.js?raw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuntime, find, stubComponent } from '../../shared/tests/editor-runtime.js';

const ANNOTATIONS = [
  { id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta anual', color: 'signal' },
  { id: 'a2', type: 'point', x: 'Oct', y: 688, label: '+73% vs. septiembre' },
  { id: 'a3', type: 'range', axis: 'x', from: 'Oct', to: 'Dic' } // no label: shown by id
];

const CHARTS = [
  {
    id: '1',
    title: 'Quejas por mes',
    value: JSON.stringify({ chart: 'bars', subtitle: 'Datos de ejemplo', annotations: ANNOTATIONS })
  },
  { id: '2', title: 'Sin anotaciones', value: JSON.stringify({ chart: 'bars' }) }
];

let wp;
let runtime;
let registered;
let apiFetch;

/** Evaluate the scripts WordPress prints for these blocks, in dependency order. */
function loadScripts() {
  new Function(EMBED_LOADER)();
  new Function(CHART_PICKER)();
  new Function(STORY)();
  new Function(STEP)();
}

function blockNamed(name) {
  return registered.find((block) => block.name === name);
}

beforeEach(() => {
  runtime = createRuntime();
  registered = [];
  apiFetch = vi.fn(({ path }) => {
    if (path.startsWith('/vpress/v1/chart/list/')) return Promise.resolve({ data: CHARTS, total: CHARTS.length });
    return Promise.reject(new Error(`unexpected ${path}`));
  });
  const components = {};
  for (const name of [
    'Placeholder',
    'ComboboxControl',
    'ToggleControl',
    'CheckboxControl',
    'SelectControl',
    'TextControl',
    'PanelBody',
    'Spinner',
    'Button'
  ]) {
    components[name] = stubComponent(name);
  }
  const InnerBlocks = stubComponent('InnerBlocks');
  InnerBlocks.Content = stubComponent('InnerBlocksContent');

  wp = {
    blocks: {
      getBlockType: vi.fn((name) => registered.find((b) => b.name === name)),
      registerBlockType: vi.fn((name, settings) => registered.push({ name, settings }))
    },
    blockEditor: {
      // Core prefixes the block's own class; both blocks pass one of their own.
      useBlockProps: vi.fn((props = {}) => {
        const own = String(props.className || '');
        const block = own.includes('vpress-story__step') ? 'wp-block-vpress-story-step' : 'wp-block-vpress-story';
        return { className: `${block} ${own}`.trim() };
      }),
      useInnerBlocksProps: vi.fn((props, settings) => ({ ...props, 'data-inner': JSON.stringify(settings) })),
      InnerBlocks,
      InspectorControls: stubComponent('InspectorControls'),
      PlainText: stubComponent('PlainText'),
      RichText: stubComponent('RichText')
    },
    components,
    element: runtime.element,
    apiFetch,
    i18n: {
      __: (text) => text,
      sprintf: (format, ...args) => format.replace(/%[ds]/, String(args[0]))
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
  delete window.vpressBlockEmbed;
  delete window.vpressBlockChart;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

const flush = () => new Promise((r) => setTimeout(r, 0));

function editStory(attributes, setAttributes = vi.fn()) {
  return runtime.element.createElement(blockNamed('vpress/story').settings.edit, { attributes, setAttributes });
}

function editStep(attributes, extra = {}) {
  return runtime.element.createElement(blockNamed('vpress/story-step').settings.edit, {
    attributes,
    setAttributes: extra.setAttributes || vi.fn(),
    context: { 'vpress/chartId': extra.chartId === undefined ? 1 : extra.chartId },
    isSelected: extra.isSelected === true
  });
}

function container(doc = document) {
  const div = doc.createElement('div');
  doc.body.appendChild(div);
  return div;
}

/**
 * A container that sits inside a rendered story, next to a figure carrying a
 * mounted chart — which is how a selected step finds the preview to drive.
 */
function stepInsideStory(handle) {
  const story = document.createElement('div');
  story.className = 'wp-block-vpress-story';
  const figure = document.createElement('figure');
  figure.setAttribute('data-vpress-chart', '1');
  if (handle) figure.vpressStoryHandle = handle;
  story.appendChild(figure);
  const slot = document.createElement('div');
  story.appendChild(slot);
  document.body.appendChild(story);
  return { story, figure, slot };
}

/** Complete the embed <script> the block injected into `doc`, as a browser would. */
function finishEmbedLoad(doc, mount) {
  const script = doc.querySelector('script[data-vpress-embed]');
  expect(script, 'embed script injected').not.toBeNull();
  doc.defaultView.vpress = { mount };
  script.dispatchEvent(new doc.defaultView.Event('load'));
}

describe('vpress/story editor script', () => {
  it('registers both blocks once, and the parent serializes its children', () => {
    loadScripts();
    loadScripts();

    expect(wp.blocks.registerBlockType).toHaveBeenCalledTimes(2);
    expect(registered.map((block) => block.name)).toEqual(['vpress/story', 'vpress/story-step']);

    // A dynamic PARENT whose save returns null serializes to a self-closing
    // comment, and every step is silently dropped on the next save.
    const saved = blockNamed('vpress/story').settings.save();
    expect(saved.type).toBe(wp.blockEditor.InnerBlocks.Content);
    expect(blockNamed('vpress/story-step').settings.save()).toBeNull();
  });

  it('inserts two empty steps and allows nothing else inside', async () => {
    loadScripts();

    await runtime.render(editStory({ chartId: 1 }), container());

    const [props, settings] = wp.blockEditor.useInnerBlocksProps.mock.calls[0];
    expect(props.className).toBe('vpress-story__steps');
    expect(settings.allowedBlocks).toEqual(['vpress/story-step']);
    expect(settings.template).toEqual([['vpress/story-step'], ['vpress/story-step']]);
  });

  it('renders the figure contract, the live region and the steps', async () => {
    loadScripts();
    const host = container();

    await runtime.render(editStory({ chartId: 1, showCaption: true }), host);

    const figure = host.querySelector('figure');
    expect(figure.getAttribute('data-vpress-chart')).toBe('1');
    expect(figure.getAttribute('data-vpress-rest')).toBe('http://example.test/wp-json/vpress/v1/');
    expect(figure.getAttribute('data-vpress-nonce')).toBe('n0nce');
    expect(figure.querySelector('.vpress-figure__title').textContent).toBe('Quejas por mes');
    expect(host.querySelector('[data-vpress-story-status]')).not.toBeNull();
    expect(host.querySelector('.vpress-story__steps')).not.toBeNull();
  });

  it('parks the mounted chart on the figure so a step can drive it', async () => {
    loadScripts();
    const host = container();
    const handle = { applyStoryState: vi.fn(), readStoryState: vi.fn(), unmount: vi.fn() };
    const mount = vi.fn(() => [handle]);

    await runtime.render(editStory({ chartId: 1 }), host);
    finishEmbedLoad(document, mount);
    await flush();

    const figure = host.querySelector('figure');
    expect(mount).toHaveBeenCalledWith(figure);
    expect(figure.vpressStoryHandle).toBe(handle);
  });

  it('keeps the steps mounted while no chart is chosen', async () => {
    loadScripts();
    const host = container();

    const tree = await runtime.render(editStory({}), host);

    expect(find(tree, (n) => n.type === wp.components.Placeholder)).toHaveLength(1);
    expect(host.querySelector('figure')).toBeNull();
    // An author can write the narrative first and pick the chart afterwards.
    expect(host.querySelector('.vpress-story__steps')).not.toBeNull();
  });
});

describe('vpress/story-step editor script', () => {
  it('lists the chart’s own annotations as show/emphasise checkboxes', async () => {
    loadScripts();

    const tree = await runtime.render(editStep({ overrides: {} }), container());

    const boxes = find(tree, (n) => n.type === wp.components.CheckboxControl);
    expect(boxes).toHaveLength(ANNOTATIONS.length * 2);
    const labels = find(tree, (n) => n.props.className === 'vpress-story-step__annotation-label').map(
      (n) => n.props.children[0]
    );
    expect(labels).toEqual(['Meta anual (a1)', '+73% vs. septiembre (a2)', 'a3']);

    // No `show` yet means every annotation is visible, and none emphasised.
    expect(boxes.filter((b) => b.props.label === 'Show').map((b) => b.props.checked)).toEqual([true, true, true]);
    expect(boxes.filter((b) => b.props.label === 'Emphasise').map((b) => b.props.checked)).toEqual([
      false,
      false,
      false
    ]);
  });

  it('materialises the allow-list on the first change, so "none" is expressible', async () => {
    loadScripts();
    const setAttributes = vi.fn();

    const tree = await runtime.render(editStep({ overrides: {} }, { setAttributes }), container());
    const show = find(tree, (n) => n.type === wp.components.CheckboxControl).filter((b) => b.props.label === 'Show');

    show[0].props.onChange(false);

    // Absent meant "all"; unticking one has to write the other two, or the
    // step would silently go from "everything" to "nothing".
    expect(setAttributes).toHaveBeenCalledWith({ overrides: { show: ['a2', 'a3'] } });
  });

  it('cannot leave an annotation emphasised while hiding it', async () => {
    loadScripts();
    const setAttributes = vi.fn();

    const tree = await runtime.render(
      editStep({ overrides: { show: ['a1', 'a2'], emphasize: ['a1'] } }, { setAttributes }),
      container()
    );
    const boxes = find(tree, (n) => n.type === wp.components.CheckboxControl);

    // a3 is not shown, so it cannot be emphasised either.
    const emphasise = boxes.filter((b) => b.props.label === 'Emphasise');
    expect(emphasise.map((b) => b.props.disabled)).toEqual([false, false, true]);

    boxes.filter((b) => b.props.label === 'Show')[0].props.onChange(false);
    expect(setAttributes).toHaveBeenCalledWith({ overrides: { show: ['a2'], emphasize: [] } });
  });

  it('says so, rather than nothing, when the chart has no annotations', async () => {
    loadScripts();

    const tree = await runtime.render(editStep({ overrides: {} }, { chartId: 2 }), container());

    expect(find(tree, (n) => n.type === wp.components.CheckboxControl)).toHaveLength(0);
    expect(find(tree, (n) => n.props.className === 'vpress-story-step__empty')).toHaveLength(1);
  });

  it('drives the story preview while it is the selected step', async () => {
    loadScripts();
    const handle = { applyStoryState: vi.fn(), readStoryState: vi.fn() };
    const { slot } = stepInsideStory(handle);

    await runtime.render(editStep({ overrides: { show: ['a2'], emphasize: ['a2'] } }, { isSelected: true }), slot);

    expect(handle.applyStoryState).toHaveBeenCalledWith({ show: ['a2'], emphasize: ['a2'] });
  });

  it('leaves the preview alone when it is not the selected step', async () => {
    loadScripts();
    const handle = { applyStoryState: vi.fn(), readStoryState: vi.fn() };
    const { slot } = stepInsideStory(handle);

    await runtime.render(editStep({ overrides: { show: ['a2'] } }, { isSelected: false }), slot);

    expect(handle.applyStoryState).not.toHaveBeenCalled();
  });

  it('captures the preview’s real state into the step', async () => {
    loadScripts();
    const setAttributes = vi.fn();
    const handle = {
      applyStoryState: vi.fn(),
      readStoryState: vi.fn(() => ({
        show: ['a1', 'a2'],
        emphasize: ['a2'],
        filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }],
        chartType: 'timeline',
        title: ''
      }))
    };
    const { slot } = stepInsideStory(handle);

    const tree = await runtime.render(
      editStep({ overrides: { hide: ['a3'] } }, { setAttributes, isSelected: true }),
      slot
    );
    const capture = find(tree, (n) => n.props.className === 'vpress-story-step__capture')[0];
    expect(capture.props.children).toEqual(['Capturar estado actual']);

    capture.props.onClick();

    expect(setAttributes).toHaveBeenCalledWith({
      overrides: {
        show: ['a1', 'a2'],
        emphasize: ['a2'],
        hide: ['a3'],
        filters: [{ slug: 'mes', type: 'ordinal', value: ['Oct'] }],
        chartType: 'timeline'
      }
    });
  });

  it('says the preview is not ready rather than writing an empty state', async () => {
    loadScripts();
    const setAttributes = vi.fn();
    const { slot } = stepInsideStory(null); // mounted figure, no handle yet

    const tree = await runtime.render(editStep({ overrides: {} }, { setAttributes }), slot);
    find(tree, (n) => n.props.className === 'vpress-story-step__capture')[0].props.onClick();
    await flush();

    expect(setAttributes).not.toHaveBeenCalled();
    const after = await runtime.render(editStep({ overrides: {} }, { setAttributes }), slot);
    expect(find(after, (n) => n.props.className === 'vpress-story-step__notice')).toHaveLength(1);
  });

  it('offers only the chart types the container can switch to', async () => {
    loadScripts();

    const tree = await runtime.render(editStep({ overrides: {} }), container());
    const select = find(tree, (n) => n.type === wp.components.SelectControl)[0];

    expect(select.props.options.map((o) => o.value)).toEqual([
      '',
      'bars',
      'heatmap',
      'spineplot',
      'scatter',
      'timeline'
    ]);
    // treemap makes the chart container's config watcher throw; map passes it
    // and then draws nothing. An option that cannot work is worse than an
    // absent one: the author picks it, the step goes blank, nothing says why.
    expect(select.props.options.some((o) => o.value === 'treemap')).toBe(false);
    expect(select.props.options.some((o) => o.value === 'map')).toBe(false);
  });

  it('drops an emptied title override instead of storing a blank one', async () => {
    loadScripts();
    const setAttributes = vi.fn();

    const tree = await runtime.render(editStep({ overrides: { title: 'Octubre' } }, { setAttributes }), container());
    find(tree, (n) => n.type === wp.components.TextControl)[0].props.onChange('');

    expect(setAttributes).toHaveBeenCalledWith({ overrides: {} });
  });
});
