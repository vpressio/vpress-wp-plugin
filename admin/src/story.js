// Scrollytelling: one chart that stays put while the reader scrolls through
// steps that change what it emphasises.
//
// This is an ENHANCEMENT and nothing here is load-bearing for the content.
// The server already printed the chart, its description, its data table and
// every step's prose in document order (blocks/story/render.php); with
// scripting off that is the whole story, read top to bottom. What this adds
// is: which step is active, what the chart emphasises while it is, and a
// polite announcement of the change for a reader who is not looking at it.
//
// Deliberately NOT the WordPress Interactivity API, which is present in this
// WordPress and would have worked. The embed is a Vue app; Interactivity is
// Preact-based. Putting it in charge of DOM a Vue app owns buys a framework
// boundary and a hydration hazard in exchange for the IntersectionObserver
// below. If the block ecosystem ever standardises on it for view logic, this
// one file is the rewrite.

const STORY_SELECTOR = '[data-vpress-story]';
const STEP_SELECTOR = '[data-vpress-step]';
const STATUS_SELECTOR = '[data-vpress-story-status]';
const FIGURE_SELECTOR = '[data-vpress-chart]';

/** Class on the step the reader is on. */
export const ACTIVE_STEP_CLASS = 'is-active';

/**
 * The band, as a share of the viewport, in which a step takes over. -45% top
 * and bottom leaves the middle 10%, so a step becomes active as it crosses
 * the viewport's middle — the behaviour the approved prototype has.
 */
export const STEP_ROOT_MARGIN = '-45% 0px -45% 0px';

let uid = 0;

/** A step's heading, as plain text. */
function headingOf(step) {
  const node = step.querySelector('.vpress-story__heading, h1, h2, h3, h4, h5, h6');
  return node ? node.textContent.trim() : '';
}

/** A step's state. Unreadable JSON is an empty state, never a throw. */
function overridesOf(step) {
  const raw = step.getAttribute('data-vpress-step');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The labels of the annotations a step emphasises, read off the drawn chart.
 *
 * By id rather than by the emphasis class, so the sentence does not depend on
 * when the paint happened — and an id this chart does not have contributes
 * nothing, which is the same no-op it is everywhere else.
 */
function emphasisLabels(figure, overrides) {
  const ids = Array.isArray(overrides.emphasize) ? overrides.emphasize.map((id) => String(id).toLowerCase()) : [];
  if (!figure || !ids.length) return [];
  return Array.from(figure.querySelectorAll('[data-annotation-id]'))
    .filter((node) => ids.includes(String(node.getAttribute('data-annotation-id') || '').toLowerCase()))
    .map((node) => {
      const label = node.querySelector('.vpress-annotation__label');
      return label ? label.textContent.trim() : '';
    })
    .filter(Boolean);
}

/**
 * Add a second description to the figure, carrying the active step.
 *
 * The figure's server-rendered description says what the chart shows; this
 * says what it is showing NOW. Regenerating the server description per step
 * would mean a round trip per step, so it is appended to `aria-describedby`
 * instead: a screen-reader reader arriving at the figure gets both, in order.
 *
 * Created here rather than server-rendered on purpose — it only ever
 * describes a state that exists when this file is running.
 */
function attachDescription(figure) {
  const slot = figure.querySelector('.vpress-figure__chart');
  if (!slot) return null;
  const doc = figure.ownerDocument;
  const id = `${figure.id || `vpress-story-${++uid}`}-story-desc`;
  const node = doc.createElement('p');
  node.className = 'vpress-story__figure-desc screen-reader-text';
  node.id = id;

  // The <figcaption> stays the figure's last child where there is one.
  const caption = figure.querySelector('.vpress-figure__caption');
  if (caption) figure.insertBefore(node, caption);
  else figure.appendChild(node);

  const described = (slot.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!described.includes(id)) described.push(id);
  slot.setAttribute('aria-describedby', described.join(' '));
  return node;
}

/**
 * Of the steps currently intersecting the observer's band, the one whose
 * middle is nearest the viewport's.
 *
 * Usually only one is in a 10% band, but a short step (or a short viewport)
 * can put two there, and "the last entry the callback happened to mention"
 * is then a coin toss that reads as a glitch.
 *
 * @param {Element[]} steps All steps, in order.
 * @param {Set<Element>} visible Steps currently intersecting.
 * @param {Window} win
 * @returns {number} index, or -1 when none is intersecting.
 */
export function stepNearestMiddle(steps, visible, win) {
  const height =
    (win && win.innerHeight) ||
    (win && win.document && win.document.documentElement && win.document.documentElement.clientHeight) ||
    0;
  const middle = height / 2;
  let best = -1;
  let bestDistance = Infinity;
  steps.forEach((step, index) => {
    if (!visible.has(step)) return;
    const rect = step.getBoundingClientRect();
    const distance = Math.abs((rect.top + rect.bottom) / 2 - middle);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/**
 * Wire one `[data-vpress-story]`.
 *
 * @param {Element} story
 * @param {(figure: Element) => object|null} lookup Resolves a figure to the
 *   handle `mount()` returned for it.
 * @returns {object|null} the controller, or null when there is nothing to do.
 */
function initStory(story, lookup) {
  if (story.dataset.vpressStoryReady) return null;
  const steps = Array.from(story.querySelectorAll(STEP_SELECTOR));
  if (!steps.length) return null;
  story.dataset.vpressStoryReady = 'true';

  const doc = story.ownerDocument;
  const win = doc.defaultView || window;
  const figure = story.querySelector(FIGURE_SELECTOR);
  const handle = figure && typeof lookup === 'function' ? lookup(figure) : null;
  const status = story.querySelector(STATUS_SELECTOR);
  const description = figure ? attachDescription(figure) : null;

  let active = -1;

  function activate(index) {
    if (index < 0 || index >= steps.length || index === active) return;
    // Before `active` is overwritten: the server's markup is only untouched
    // while nothing has been activated yet. Scoping the deference below to
    // "index 0" instead would fire again every time the reader scrolls back
    // up to a headingless first step, leaving a heading from further down the
    // story standing over it — the staleness this is here to prevent.
    const firstActivation = active === -1;
    active = index;
    const step = steps[index];
    const overrides = overridesOf(step);
    const heading = headingOf(step);

    steps.forEach((node, i) => {
      node.classList.toggle(ACTIVE_STEP_CLASS, i === index);
      if (i === index) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });

    if (handle && typeof handle.applyStoryState === 'function') {
      // A broken step must not take the rest of the story with it.
      try {
        handle.applyStoryState(overrides);
      } catch (error) {
        console.error('[vpress] story step:', error);
      }
    }

    /*
     * The visible kicker and the polite announcement are the same node, so
     * both guards here are about not announcing what has not changed:
     *
     * - The FIRST activation, when that step has no heading of its own,
     *   leaves the region alone. vpress_story_first_heading() fills it
     *   server-side with the first NON-EMPTY heading, so a story that opens
     *   on prose would otherwise go blank the moment this file ran. Scoped to
     *   the first activation and not to `index === 0`, because that step can
     *   be activated again — a reader scrolling back up to it would then keep
     *   a heading from further down the story standing over it. Every later
     *   headingless step blanks the kicker, which is also what the figure
     *   description right below does for that same step.
     * - An assignment that would not change the text is skipped. Writing the
     *   same string into a live region is still a mutation and some assistive
     *   tech reads it out, including at boot, over markup the server had
     *   already filled in correctly. Both sides are trimmed for this
     *   comparison — see vpress_story_first_heading().
     */
    const keepServerHeading = firstActivation && !heading;
    if (status && !keepServerHeading && status.textContent !== heading) {
      status.textContent = heading;
    }

    if (description) {
      const labels = emphasisLabels(figure, overrides);
      const parts = [];
      if (heading) parts.push(`Paso ${index + 1} de ${steps.length}: ${heading}.`);
      if (labels.length) parts.push(`Se destaca: ${labels.join('; ')}.`);
      description.textContent = parts.join(' ');
    }
  }

  const controller = {
    story,
    steps,
    activate,
    get active() {
      return active;
    },
    destroy() {
      if (controller.observer) controller.observer.disconnect();
      controller.observer = null;
      delete story.dataset.vpressStoryReady;
    }
  };

  /*
   * Complete at rest. The first step is applied NOW, not on the first
   * intersection: a screenshot, a print, a viewport too short to scroll and
   * a browser without IntersectionObserver must all show a correct chart,
   * and none of them will ever deliver that first callback.
   */
  activate(0);

  if (typeof win.IntersectionObserver !== 'function') return controller;

  const visible = new Set();
  controller.observer = new win.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      // Nothing in the band (between steps, or scrolled past the last one):
      // the step the reader last reached stays active rather than blanking.
      const next = stepNearestMiddle(steps, visible, win);
      if (next !== -1) activate(next);
    },
    { rootMargin: STEP_ROOT_MARGIN, threshold: 0 }
  );
  steps.forEach((step) => controller.observer.observe(step));

  return controller;
}

/**
 * Wire every story in `el` (defaults to the document). Already-wired stories
 * are skipped, so calling this repeatedly is safe.
 *
 * @param {Element|Document} [el]
 * @param {(figure: Element) => object|null} [lookup]
 * @returns {object[]} the controllers created by this call
 */
export function initStories(el = document, lookup = () => null) {
  if (!el) return [];
  const stories =
    el.matches && el.matches(STORY_SELECTOR) ? [el] : Array.from(el.querySelectorAll(STORY_SELECTOR));
  return stories.map((story) => initStory(story, lookup)).filter(Boolean);
}
