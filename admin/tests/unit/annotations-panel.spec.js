import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('../../src/utils/axios.js', () => ({
  default: {
    dataset: { data: vi.fn().mockResolvedValue({ data: { data: [] } }) },
    chart: { create: vi.fn(), update: vi.fn(), query: vi.fn().mockResolvedValue({ data: { data: [] } }) }
  }
}));

import VpressConfigAnnotations, { typedPosition } from '../../src/components/vpress-config-annotations.vue';
import { useEditorStore } from '../../src/store/editor.js';
import { useWorkspaceStore } from '../../src/store/workspace.js';
import { ANNOTATION_MAX } from '../../src/charts/annotations.js';

/** A live editor store with one chart on one dataset, as the editor has. */
async function editorWith(annotations, seq) {
  const workspace = useWorkspaceStore();
  const dataset = await workspace.ADD_DATASET({
    id: 1, name: 'Ventas', slug: 'ventas', description: '', owner_id: 1,
    permissions: 'public', source: 'csv', tag: '', rows: 0, size: 0
  });
  workspace.UPDATE_ACTIVE_DATASET(dataset.slug);
  const editor = useEditorStore();
  editor.LOAD_VIZZES({ vizValues: [] });
  if (annotations) {
    const values = { ...editor.chart, annotations };
    // undefined models a config saved before the counter existed.
    if (seq === undefined) delete values.annotationSeq;
    else values.annotationSeq = seq;
    editor.UPDATE_VIZ({ values });
  }
  return editor;
}

let pinia;

async function panel(annotations, seq) {
  const editor = await editorWith(annotations, seq);
  const wrapper = mount(VpressConfigAnnotations, {
    global: { plugins: [pinia, createVuetify({ components, directives })] }
  });
  return { editor, wrapper, vm: wrapper.vm };
}

describe('the annotations editor panel', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('lists the chart annotations, one row each', async () => {
    const { wrapper } = await panel([
      { id: 'a1', type: 'line', axis: 'y', value: 500, label: 'Meta anual' },
      { id: 'a2', type: 'text', x: 'Oct', y: 1, label: 'Nota' }
    ]);

    const rows = wrapper.findAll('.annotation-row');
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.find('.annotation-kind').text())).toEqual(['Línea', 'Nota']);
    expect(rows.map((row) => row.find('.annotation-id').text())).toEqual(['a1', 'a2']);
    // The label lives in an input, not in the rendered text.
    expect(rows[0].find('input').element.value).toBe('Meta anual');
  });

  it('says so when the chart has none', async () => {
    const { wrapper } = await panel([]);
    expect(wrapper.findAll('.annotation-row')).toHaveLength(0);
    expect(wrapper.text()).toContain('aún no tiene anotaciones');
  });

  it('adding an annotation appends one with a fresh id', async () => {
    const { editor, vm } = await panel([{ id: 'a1', type: 'line', axis: 'y', value: 500 }]);

    await vm.addAnnotation('point');

    const list = editor.chart.annotations;
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('a1');
    expect(list[1].id).toBe('a2');
  });

  it('adds one of each type, each shaped as the data model says', async () => {
    const { editor, vm } = await panel([]);

    await vm.addAnnotation('line');
    await vm.addAnnotation('point');
    await vm.addAnnotation('range');
    await vm.addAnnotation('text');

    expect(editor.chart.annotations).toEqual([
      { id: 'a1', type: 'line', axis: 'y', value: 0, label: '' },
      { id: 'a2', type: 'point', x: 0, y: 0, label: '' },
      { id: 'a3', type: 'range', axis: 'x', from: 0, to: 0, label: '' },
      { id: 'a4', type: 'text', x: 0, y: 0, label: '' }
    ]);
  });

  it('deleting one does not renumber the others', async () => {
    const { editor, vm } = await panel([
      { id: 'a1', type: 'line', axis: 'y', value: 1 },
      { id: 'a2', type: 'line', axis: 'y', value: 2 },
      { id: 'a3', type: 'line', axis: 'y', value: 3 }
    ]);

    await vm.removeAnnotation('a2');

    expect(editor.chart.annotations.map((a) => a.id)).toEqual(['a1', 'a3']);
    expect(editor.chart.annotations.map((a) => a.value)).toEqual([1, 3]);
  });

  it('never hands a deleted id to the next annotation added', async () => {
    const { editor, vm } = await panel([
      { id: 'a1', type: 'line', axis: 'y', value: 1 },
      { id: 'a2', type: 'line', axis: 'y', value: 2 }
    ]);

    // Deleting the LAST one is the case a max+1 counter gets wrong.
    await vm.removeAnnotation('a2');
    await vm.addAnnotation('line');

    expect(editor.chart.annotations.map((a) => a.id)).toEqual(['a1', 'a3']);
  });

  it('still does not, across a reload — the counter is in the config', async () => {
    const first = await panel([
      { id: 'a1', type: 'line', axis: 'y', value: 1 },
      { id: 'a2', type: 'line', axis: 'y', value: 2 }
    ]);
    await first.vm.removeAnnotation('a2');

    // A reload: nothing survives but what was SAVED. Round-trip the config
    // through the server's own sanitiser shape and start a fresh everything.
    const saved = JSON.parse(JSON.stringify(first.editor.chart));
    expect(saved.annotationSeq, 'the counter was persisted with the config').toBe(2);
    first.wrapper.unmount();
    pinia = createPinia();
    setActivePinia(pinia);

    const second = await panel(saved.annotations, saved.annotationSeq);
    await second.vm.addAnnotation('line');

    expect(second.editor.chart.annotations.map((a) => a.id)).toEqual(['a1', 'a3']);
    expect(second.editor.chart.annotationSeq).toBe(3);
  });

  it('derives the counter for a chart saved before it existed', async () => {
    // A legacy config: ids, no annotationSeq.
    const { editor, vm } = await panel([
      { id: 'a1', type: 'line', axis: 'y', value: 1 },
      { id: 'a2', type: 'line', axis: 'y', value: 2 },
      { id: 'a3', type: 'line', axis: 'y', value: 3 }
    ]);
    expect(vm.seq).toBe(0, 'nothing was stored');

    await vm.addAnnotation('line');

    expect(editor.chart.annotations.map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(editor.chart.annotationSeq).toBe(4);
  });

  it('floors a counter that is below the ids actually in use', async () => {
    const { editor, vm } = await panel(
      [{ id: 'a1', type: 'line', axis: 'y', value: 1 }, { id: 'a9', type: 'line', axis: 'y', value: 9 }],
      2
    );

    await vm.addAnnotation('line');

    expect(editor.chart.annotations.map((a) => a.id)).toEqual(['a1', 'a9', 'a10']);
    expect(editor.chart.annotationSeq).toBe(10);
  });

  it('raises the counter on an add and leaves it alone on a delete', async () => {
    const { editor, vm } = await panel([]);

    await vm.addAnnotation('line');
    expect(editor.chart.annotationSeq).toBe(1);
    await vm.addAnnotation('line');
    expect(editor.chart.annotationSeq).toBe(2);

    await vm.removeAnnotation('a2');
    expect(editor.chart.annotationSeq).toBe(2, 'a delete never lowers it');
    await vm.removeAnnotation('a1');
    expect(editor.chart.annotationSeq).toBe(2);
  });

  it('edits the label, the axis, the positions and the colour token', async () => {
    const { editor, vm } = await panel([{ id: 'a1', type: 'line', axis: 'y', value: 0, label: '' }]);

    await vm.updateField('a1', 'label', 'Meta anual');
    await vm.updateField('a1', 'value', '500');
    await vm.updateField('a1', 'color', 'muted');
    await vm.updateField('a1', 'axis', 'x');

    expect(editor.chart.annotations[0]).toEqual({
      id: 'a1',
      type: 'line',
      axis: 'x',
      value: 500,
      label: 'Meta anual',
      color: 'muted'
    });
  });

  it('edits only the annotation named, leaving the rest untouched', async () => {
    const { editor, vm } = await panel([
      { id: 'a1', type: 'line', axis: 'y', value: 1, label: 'uno' },
      { id: 'a2', type: 'line', axis: 'y', value: 2, label: 'dos' }
    ]);

    await vm.updateField('a2', 'label', 'DOS');

    expect(editor.chart.annotations.map((a) => a.label)).toEqual(['uno', 'DOS']);
  });

  it('keeps a category position a string and a numeric one a number', () => {
    expect(typedPosition('Oct')).toBe('Oct');
    expect(typedPosition('500')).toBe(500);
    expect(typedPosition(' 68.5 ')).toBe(68.5);
    expect(typedPosition('')).toBe('');
    expect(typedPosition(0)).toBe(0);
  });

  it('refuses to add past the cap, and says why', async () => {
    const full = Array.from({ length: ANNOTATION_MAX }, (_, i) => ({
      id: `a${i + 1}`,
      type: 'line',
      axis: 'y',
      value: i
    }));
    const { editor, vm, wrapper } = await panel(full);

    expect(vm.atCap).toBe(true);
    expect(wrapper.text()).toContain(`Máximo ${ANNOTATION_MAX} anotaciones`);

    await vm.addAnnotation('line');

    expect(editor.chart.annotations).toHaveLength(ANNOTATION_MAX);
  });

  it('writes a whole new array, never mutating the one in the store', async () => {
    const { editor, vm } = await panel([{ id: 'a1', type: 'line', axis: 'y', value: 1 }]);
    const before = editor.chart.annotations;

    await vm.addAnnotation('line');

    expect(editor.chart.annotations).not.toBe(before);
    expect(before).toHaveLength(1);
  });
});
