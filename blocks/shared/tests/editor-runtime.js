/**
 * A minimal React-ish runtime for the block editor scripts' JSDOM tests.
 *
 * The scripts are plain (no build step), so a test evaluates them as-is with
 * `window.wp` stubbed. This stands in for React: it expands function
 * components, keeps useState/useRef slots per component instance, runs
 * effects when their deps change, and materialises the tree into a real DOM
 * container so refs point at real elements (in the top document or in an
 * iframe, like the editor canvas).
 *
 * Shared by blocks/chart and blocks/story, which register three scripts
 * between them and must agree on how a component tree is driven.
 */
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

export { createRuntime, find, stubComponent };
