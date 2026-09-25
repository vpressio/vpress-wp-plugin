import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initStories, stepNearestMiddle, ACTIVE_STEP_CLASS, STEP_ROOT_MARGIN } from '../../src/story.js';

/**
 * The scrollytelling controller against the markup blocks/story/render.php
 * prints. The observer is stubbed so a test can say exactly which steps are
 * in the band and where, which is the only way to assert "nearest the middle"
 * without a real viewport.
 */

const observers = [];

class IntersectionObserverStub {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    observers.push(this);
  }

  observe(el) {
    this.observed.push(el);
  }

  disconnect() {
    this.observed = [];
  }

  /** Deliver entries, as the browser would. */
  fire(entries) {
    this.callback(entries.map(([target, isIntersecting]) => ({ target, isIntersecting })));
  }
}

const STEPS = [
  { heading: 'Todo el año', overrides: { show: [] } },
  { heading: 'El pico de octubre', overrides: { show: ['a1'], emphasize: ['a1'] } },
  { heading: 'Lo que vino después', overrides: { show: ['a1', 'a2'] } }
];

/** The server-rendered story: live region, figure with an annotation, steps. */
function story(steps = STEPS, { figure = true } = {}) {
  const figureHtml = figure
    ? '<figure class="vpress-figure" id="vpress-figure-1" data-vpress-chart="1">' +
      '<div class="vpress-figure__chart" role="group" aria-describedby="vpress-figure-1-desc" aria-busy="true">' +
      '<svg><g class="vpress-annotations">' +
      '<g class="vpress-annotation" data-annotation-id="a1"><text class="vpress-annotation__label">+73% vs. septiembre</text></g>' +
      '<g class="vpress-annotation" data-annotation-id="a2"><text class="vpress-annotation__label">Meta anual</text></g>' +
      '</g></svg></div>' +
      '<p class="vpress-figure__alt screen-reader-text" id="vpress-figure-1-desc">Bar chart.</p>' +
      '<figcaption class="vpress-figure__caption"><span class="vpress-figure__title">Quejas</span></figcaption>' +
      '</figure>'
    : '';

  document.body.innerHTML =
    '<section class="vpress-story" data-vpress-story="">' +
    '<div class="vpress-story__figure">' +
    '<p class="vpress-story__now" data-vpress-story-status role="status" aria-live="polite">' +
    (steps[0] ? steps[0].heading : '') +
    '</p>' +
    figureHtml +
    '</div>' +
    '<div class="vpress-story__steps">' +
    steps
      .map(
        (step) =>
          `<div class="vpress-story__step" data-vpress-step='${JSON.stringify(step.overrides || {})}'>` +
          `<h3 class="vpress-story__heading">${step.heading}</h3>` +
          `<div class="vpress-story__text">…</div></div>`
      )
      .join('') +
    '</div></section>';

  return document.querySelector('[data-vpress-story]');
}

function handleFor() {
  return { applyStoryState: vi.fn(), readStoryState: vi.fn() };
}

function stepNodes() {
  return Array.from(document.querySelectorAll('[data-vpress-step]'));
}

function statusText() {
  return document.querySelector('[data-vpress-story-status]').textContent;
}

beforeEach(() => {
  observers.length = 0;
  window.IntersectionObserver = IntersectionObserverStub;
  // A viewport with a middle at 500.
  window.innerHeight = 1000;
});

afterEach(() => {
  delete window.IntersectionObserver;
  document.body.innerHTML = '';
});

describe('the story controller', () => {
  it('applies the first step synchronously, before any intersection', () => {
    const root = story();
    const handle = handleFor();

    initStories(document, () => handle);

    // No observer callback has fired, and none ever will in a viewport too
    // short to scroll, a print, or a screenshot.
    expect(handle.applyStoryState).toHaveBeenCalledTimes(1);
    expect(handle.applyStoryState).toHaveBeenCalledWith({ show: [] });
    expect(stepNodes()[0].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);
    expect(stepNodes()[0].getAttribute('aria-current')).toBe('step');
    expect(root.dataset.vpressStoryReady).toBe('true');
  });

  it('observes every step in a band around the viewport middle', () => {
    story();
    initStories(document, handleFor);

    expect(observers).toHaveLength(1);
    expect(observers[0].options.rootMargin).toBe(STEP_ROOT_MARGIN);
    expect(STEP_ROOT_MARGIN).toBe('-45% 0px -45% 0px');
    expect(observers[0].observed).toHaveLength(3);
  });

  it('activates the step nearest the viewport middle, not the last one reported', () => {
    story();
    const handle = handleFor();
    initStories(document, () => handle);
    const steps = stepNodes();

    // Two steps in the band at once: the second is nearer the middle (500).
    steps[1].getBoundingClientRect = () => ({ top: 420, bottom: 560 });
    steps[2].getBoundingClientRect = () => ({ top: 700, bottom: 900 });
    observers[0].fire([
      [steps[2], true],
      [steps[1], true]
    ]);

    expect(steps[1].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);
    expect(steps[2].classList.contains(ACTIVE_STEP_CLASS)).toBe(false);
    expect(handle.applyStoryState).toHaveBeenLastCalledWith({ show: ['a1'], emphasize: ['a1'] });
  });

  it('keeps the step the reader reached when nothing is in the band', () => {
    story();
    const handle = handleFor();
    initStories(document, () => handle);
    const steps = stepNodes();

    steps[1].getBoundingClientRect = () => ({ top: 450, bottom: 550 });
    observers[0].fire([[steps[1], true]]);
    expect(steps[1].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);

    // Scrolled past the last step: no step is active-able, and blanking the
    // chart would be worse than leaving the last frame up.
    observers[0].fire([[steps[1], false]]);
    expect(steps[1].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);
    expect(handle.applyStoryState).toHaveBeenCalledTimes(2);
  });

  it('announces the active step, and only on a change', () => {
    story();
    initStories(document, handleFor);
    const steps = stepNodes();
    expect(statusText()).toBe('Todo el año');

    steps[1].getBoundingClientRect = () => ({ top: 450, bottom: 550 });
    observers[0].fire([[steps[1], true]]);
    expect(statusText()).toBe('El pico de octubre');

    // The same step again is not a change, so nothing is re-announced.
    const status = document.querySelector('[data-vpress-story-status]');
    const spy = vi.spyOn(status, 'textContent', 'set');
    observers[0].fire([[steps[1], true]]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not rewrite the live region at boot with what the server already put there', () => {
    // Writing the same string into a live region is still a mutation, and some
    // assistive tech reads it out — so the first step must not re-announce the
    // heading the server had already rendered into it.
    story();
    const status = document.querySelector('[data-vpress-story-status]');
    const spy = vi.spyOn(status, 'textContent', 'set');

    initStories(document, handleFor);

    expect(spy).not.toHaveBeenCalled();
    expect(statusText()).toBe('Todo el año');
  });

  it('leaves the live region alone for a step with no heading of its own', () => {
    // A story that opens on prose. vpress_story_first_heading() fills the
    // region server-side with the first NON-EMPTY heading, so a step without
    // one must leave it standing: blanking it would disagree with the server
    // and would announce nothing at the moment the reader arrives.
    story([
      { heading: '', overrides: { show: [] } },
      { heading: 'El pico de octubre', overrides: { show: ['a1'] } }
    ]);
    document.querySelector('[data-vpress-story-status]').textContent = 'El pico de octubre';

    initStories(document, handleFor);

    expect(statusText()).toBe('El pico de octubre');
  });

  it('blanks the kicker for a headingless step further into the story', () => {
    // Only the OPENING step defers to what the server put there. Mid-story,
    // leaving the previous step's heading standing would caption the wrong
    // step — and the figure description below already drops its "Paso n de N"
    // clause for this same step, so keeping the kicker would disagree with it.
    story([
      { heading: 'Todo el año', overrides: { show: [] } },
      { heading: '', overrides: { show: ['a1'] } }
    ]);
    initStories(document, handleFor);
    expect(statusText()).toBe('Todo el año');
    const steps = stepNodes();

    steps[1].getBoundingClientRect = () => ({ top: 450, bottom: 550 });
    observers[0].fire([[steps[1], true]]);

    expect(statusText()).toBe('');
  });

  it('describes the active step to the figure, in words, beside its own description', () => {
    story();
    initStories(document, handleFor);

    const slot = document.querySelector('.vpress-figure__chart');
    const ids = slot.getAttribute('aria-describedby').split(' ');
    expect(ids[0]).toBe('vpress-figure-1-desc'); // the chart's own, first
    expect(ids).toHaveLength(2);

    const description = document.getElementById(ids[1]);
    expect(description.className).toContain('screen-reader-text');
    expect(description.textContent).toBe('Paso 1 de 3: Todo el año.');
    // It sits before the caption, so the <figcaption> stays the last child.
    expect(document.querySelector('.vpress-figure').lastElementChild.tagName).toBe('FIGCAPTION');

    const steps = stepNodes();
    steps[1].getBoundingClientRect = () => ({ top: 450, bottom: 550 });
    observers[0].fire([[steps[1], true]]);

    // A sighted reader gets the emphasis visually; this is the same thing in
    // words, named by the annotation's own label.
    expect(description.textContent).toBe('Paso 2 de 3: El pico de octubre. Se destaca: +73% vs. septiembre.');
  });

  it('adds no focusable element to the sticky figure', () => {
    story();
    initStories(document, handleFor);

    const figure = document.querySelector('.vpress-figure');
    expect(figure.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(document.querySelector('[data-vpress-story-status]').hasAttribute('tabindex')).toBe(false);
  });

  it('is a no-op for a step naming an annotation the chart does not have', () => {
    story([{ heading: 'Fantasma', overrides: { show: ['gone'], emphasize: ['gone'] } }]);
    const handle = handleFor();

    expect(() => initStories(document, () => handle)).not.toThrow();
    expect(handle.applyStoryState).toHaveBeenCalledWith({ show: ['gone'], emphasize: ['gone'] });
    // Nothing to name, so nothing is claimed about the emphasis.
    const slot = document.querySelector('.vpress-figure__chart');
    const ids = slot.getAttribute('aria-describedby').split(' ');
    expect(document.getElementById(ids[1]).textContent).toBe('Paso 1 de 1: Fantasma.');
  });

  it('survives a step whose state is not readable JSON', () => {
    story();
    document.querySelector('[data-vpress-step]').setAttribute('data-vpress-step', '{oops');
    const handle = handleFor();

    expect(() => initStories(document, () => handle)).not.toThrow();
    expect(handle.applyStoryState).toHaveBeenCalledWith({});
    expect(statusText()).toBe('Todo el año');
  });

  it('survives a step whose applyStoryState throws', () => {
    story();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handle = {
      applyStoryState: vi.fn(() => {
        throw new Error('boom');
      })
    };

    expect(() => initStories(document, () => handle)).not.toThrow();
    // The prose, the announcement and the step classes still happen: one
    // broken step must not take the rest of the story with it.
    expect(statusText()).toBe('Todo el año');
    expect(stepNodes()[0].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it('still reads and still announces when the chart never mounted', () => {
    story(STEPS, { figure: false });

    const controllers = initStories(document, () => null);

    expect(controllers).toHaveLength(1);
    expect(statusText()).toBe('Todo el año');
    expect(stepNodes()[0].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);
  });

  it('is complete at rest without IntersectionObserver at all', () => {
    delete window.IntersectionObserver;
    story();
    const handle = handleFor();

    const controllers = initStories(document, () => handle);

    expect(controllers).toHaveLength(1);
    expect(handle.applyStoryState).toHaveBeenCalledWith({ show: [] });
    expect(stepNodes()[0].classList.contains(ACTIVE_STEP_CLASS)).toBe(true);
  });

  it('wires a story once, however often it is asked to', () => {
    story();
    const handle = handleFor();

    expect(initStories(document, () => handle)).toHaveLength(1);
    expect(initStories(document, () => handle)).toHaveLength(0);
    expect(observers).toHaveLength(1);
    expect(document.querySelectorAll('.vpress-story__figure-desc')).toHaveLength(1);
  });

  it('ignores a story with no steps', () => {
    story([]);
    expect(initStories(document, handleFor)).toHaveLength(0);
    expect(observers).toHaveLength(0);
  });
});

describe('stepNearestMiddle', () => {
  const win = { innerHeight: 1000 };
  const step = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }) });

  it('picks the one whose centre is closest to the middle', () => {
    const a = step(0, 200); // centre 100
    const b = step(400, 600); // centre 500 — the middle
    const c = step(800, 1000); // centre 900
    expect(stepNearestMiddle([a, b, c], new Set([a, b, c]), win)).toBe(1);
  });

  it('ignores steps that are not in the band', () => {
    const a = step(400, 600);
    const b = step(900, 1000);
    expect(stepNearestMiddle([a, b], new Set([b]), win)).toBe(1);
  });

  it('is -1 when nothing is in the band', () => {
    expect(stepNearestMiddle([step(0, 10)], new Set(), win)).toBe(-1);
  });

  it('falls back to the document height when the window has none', () => {
    const doc = { documentElement: { clientHeight: 1000 } };
    const a = step(400, 600);
    expect(stepNearestMiddle([a], new Set([a]), { document: doc })).toBe(0);
  });
});
