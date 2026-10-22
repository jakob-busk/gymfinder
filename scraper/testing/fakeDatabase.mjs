// Falsk Realtime Database til tests af nat-jobbet. Efterligner de dele af firebase-admin, jobbet
// bruger: ref(path).get() og ref().update({ 'a/b': værdi }), med samme regler som den rigtige:
// - null sletter, og tomme objekter forsvinder (RTDB gemmer hverken null eller tomme noder).
// - undefined afvises.
// - en multi-path-opdatering må ikke have en sti, der ligger inde under en anden sti.

const splitPath = (path) => String(path ?? '').split('/').filter(Boolean);

function assertNoUndefined(value, path) {
  if (value === undefined) {
    throw new Error(`update failed: values argument contains undefined in property '${path}'`);
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertNoUndefined(child, `${path}.${key}`);
  }
}

// Fjerner null og tomme objekter, som RTDB gør. Lister uden huller kommer tilbage som lister.
function prune(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const items = value.map(prune);
    if (items.every((item) => item != null)) return items.length === 0 ? null : items;
  }
  const entries = Object.entries(value)
    .map(([key, child]) => [key, prune(child)])
    .filter(([, child]) => child !== null && child !== undefined);
  return entries.length === 0 ? null : Object.fromEntries(entries);
}

export function createFakeDatabase(initial = {}) {
  let root = prune(structuredClone(initial)) ?? {};
  const updates = [];

  const read = (segments) => segments.reduce((node, key) => node?.[key], root) ?? null;

  const write = (segments, value) => {
    if (segments.length === 0) {
      root = prune(structuredClone(value)) ?? {};
      return;
    }
    let node = root;
    for (const key of segments.slice(0, -1)) {
      if (node[key] == null || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    node[segments.at(-1)] = structuredClone(value);
    root = prune(root) ?? {};
  };

  function ref(path = '') {
    const base = splitPath(path);
    return {
      async get() {
        const value = structuredClone(read(base));
        return { val: () => value, exists: () => value !== null };
      },
      async update(values) {
        const paths = Object.keys(values).map((key) => [...base, ...splitPath(key)]);
        for (const [key, value] of Object.entries(values)) assertNoUndefined(value, key);
        for (const a of paths) {
          for (const b of paths) {
            if (a !== b && a.length < b.length && a.every((key, i) => key === b[i])) {
              const [ancestor, child] = [a.join('/'), b.join('/')];
              throw new Error(`update failed: Path ${ancestor} is an ancestor of ${child}`);
            }
          }
        }
        updates.push(structuredClone(values));
        Object.entries(values).forEach(([, value], i) => write(paths[i], value));
      },
    };
  }

  return {
    ref,
    // Hjælpere til testene.
    snapshot: () => structuredClone(root),
    updates,
  };
}
