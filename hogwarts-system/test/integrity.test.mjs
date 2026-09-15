/**
 * Structural integrity tests.
 *
 * `rules.test.mjs` checks the arithmetic of the rules. These check that the code
 * holds together: declared actions, present translation keys, existing
 * templates, effective CSS selectors. Each one was born from a bug actually hit,
 * and none of them needs Foundry to boot.
 *
 * Run with: node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Every file under a tree carrying the given extension. */
function filesUnder(root, ext) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(root, e.name);
    if (e.isDirectory()) return filesUnder(p, ext);
    return e.name.endsWith(ext) ? [p] : [];
  });
}

const TEMPLATES = filesUnder('templates', '.hbs');
const MODULES = filesUnder('module', '.mjs');
const read = (f) => fs.readFileSync(f, 'utf-8');

/** Body of a `key: { ... }` block, with balanced braces. */
function blockBody(src, key) {
  const i = src.indexOf(key);
  if (i < 0) return null;
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let k = start; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(start + 1, k);
  }
  return null;
}

/** Every action name declared in an `actions: { ... }` block, mapped to its file. */
function declaredActions() {
  const declared = new Map();
  for (const f of MODULES) {
    let rest = read(f);
    while (rest.includes('actions: {')) {
      const body = blockBody(rest, 'actions: {');
      if (!body) break;
      for (const m of body.matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)) declared.set(m[1], f);
      rest = rest.slice(rest.indexOf('actions: {') + 10);
    }
  }
  return declared;
}

/** Flattens a language file into dotted keys. */
function flatKeys(file) {
  const flat = {};
  const walk = (o, prefix) => {
    for (const [k, v] of Object.entries(o)) {
      const dotted = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, dotted);
      else flat[dotted] = v;
    }
  };
  walk(JSON.parse(read(file)), '');
  return flat;
}

test('templates — every action used is declared in a class', () => {
  // ApplicationV2 silently ignores an unknown `data-action`: the button does
  // nothing, without the slightest console error.
  const declared = declaredActions();
  assert.ok(declared.size > 20, `too few actions detected (${declared.size})`);

  const missing = new Map();
  for (const f of TEMPLATES) {
    for (const m of read(f).matchAll(/data-action=['"]([^'"{}]+)['"]/g)) {
      const action = m[1].trim();
      if (declared.has(action)) continue;
      if (!missing.has(action)) missing.set(action, []);
      missing.get(action).push(f);
    }
  }
  assert.deepEqual([...missing.keys()], [], `undeclared actions: ${[...missing].map(([a, f]) => `${a} (${f.join(', ')})`).join(' | ')}`);
});

test('templates — every declared action is reachable', () => {
  // The previous test covers the other direction. A declared action that no
  // control ever calls is an unreachable feature: that is how the school
  // maximum toggle and the spell learning roll vanished from the sheet without
  // anything breaking.
  const declared = declaredActions();

  const reached = new Set();
  for (const f of TEMPLATES) {
    // `data-action` is the common case; `data-change` wires the `change` event,
    // which a <select> requires.
    for (const m of read(f).matchAll(/data-(?:action|change)=['"]([^'"{}]+)['"]/g)) reached.add(m[1].trim());
  }
  // Some buttons are built in JavaScript rather than in a template.
  for (const f of MODULES) {
    for (const m of read(f).matchAll(/action:\s*['"](\w+)['"]/g)) reached.add(m[1]);
  }

  const unreachable = [...declared].filter(([a]) => !reached.has(a)).map(([a, f]) => `${a} (${f})`);
  assert.deepEqual(unreachable, []);
});

test('templates — no data-action on a select or a text field', () => {
  // Actions are wired to the click. On a <select>, the click is the very
  // gesture that unrolls the list: the re-render closes it again at once. A
  // checkbox is legitimate, since a click toggles it.
  const offenders = [];
  for (const f of TEMPLATES) {
    for (const m of read(f).matchAll(/<(select|textarea|input)\b[^>]*>/gs)) {
      const tag = m[0];
      if (!tag.includes('data-action')) continue;
      const type = tag.match(/type=['"](\w+)['"]/)?.[1];
      if (m[1] === 'input' && ['checkbox', 'radio'].includes(type)) continue;
      offenders.push(`${f}:<${m[1]}${type ? ` type=${type}` : ''}>`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('translations — every literal key exists in both fr and en', () => {
  const fr = flatKeys('lang/fr.json');
  const en = flatKeys('lang/en.json');

  const missing = [];
  // Templates are not the only source: `game.i18n.localize(...)` in JavaScript
  // counts just as much, and that is how dialog windows get their labels. Keys
  // built dynamically cannot be checked.
  for (const f of [...TEMPLATES, ...MODULES]) {
    const src = read(f);
    const keys = [
      ...[...src.matchAll(/localize\s+['"]([\w.-]+)['"]/g)].map((m) => m[1]),
      ...[...src.matchAll(/i18n\.(?:localize|format)\(\s*['"]([\w.-]+)['"]/g)].map((m) => m[1]),
    ];
    for (const key of keys) {
      // Only the system's own keys are ours: DOCUMENT.*, EFFECT.* and friends
      // are supplied by the Foundry core.
      if (!key.startsWith('HOGWARTS.')) continue;
      if (!(key in fr)) missing.push(`${key} (fr, ${f})`);
      if (!(key in en)) missing.push(`${key} (en, ${f})`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('translations — format arguments match the placeholders', () => {
  // `{{localize 'K' age=age malus=m}}` only substitutes when the argument name
  // matches the `{placeholder}`. Renaming one side alone leaves a raw `{malus}`
  // on screen, with no error anywhere.
  //
  // Only calls that actually pass arguments are checked: a string carrying
  // braces but invoked bare is documentation meant to be shown verbatim, such
  // as `xp.multiplier.skill.{nom}` in the effect-key hint.
  const fr = flatKeys('lang/fr.json');
  const mismatches = [];

  for (const f of TEMPLATES) {
    for (const m of read(f).matchAll(/\{\{\s*localize\s+['"]([\w.-]+)['"]([^}]*)\}\}/g)) {
      const [, key, tail] = m;
      if (!key.startsWith('HOGWARTS.') || typeof fr[key] !== 'string') continue;
      const given = new Set([...tail.matchAll(/(\w+)=/g)].map((x) => x[1]));
      if (!given.size) continue;
      const expected = new Set([...fr[key].matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
      for (const p of expected) if (!given.has(p)) mismatches.push(`${key}: '{${p}}' expected but not supplied (${f})`);
      for (const g of given) if (!expected.has(g)) mismatches.push(`${key}: '${g}=' supplied with no matching placeholder (${f})`);
    }
  }
  assert.deepEqual(mismatches, []);
});

test('translations — fr and en declare exactly the same keys', () => {
  const fr = Object.keys(flatKeys('lang/fr.json')).sort();
  const en = Object.keys(flatKeys('lang/en.json')).sort();
  assert.deepEqual(fr.filter((k) => !en.includes(k)), [], 'present in fr, absent from en');
  assert.deepEqual(en.filter((k) => !fr.includes(k)), [], 'present in en, absent from fr');
});

test('templates — every path referenced in the code exists on disk', () => {
  const absent = [];
  for (const f of MODULES) {
    for (const m of read(f).matchAll(/['"]systems\/hogwarts-system\/(templates\/[\w/-]+\.hbs)['"]/g)) {
      if (!fs.existsSync(m[1])) absent.push(`${m[1]} (${f})`);
    }
  }
  assert.deepEqual(absent, []);
});

test('CSS — application root classes are targeted without a descendant', () => {
  // ApplicationV2 puts every entry of `classes` on the SAME element.
  // `.hogwarts-system .x` (descendant) therefore never matches anything;
  // it has to be `.hogwarts-system.x`, written `&.x` in SCSS.
  const css = read('css/hogwarts-system.css');
  // A boundary is essential: without it, `.item` would match `.item-name` and
  // the test would cry wolf over perfectly correct selectors.
  const hasRootRule = (klass) => new RegExp(`\\.hogwarts-system\\.${klass}(?![\\w-])`).test(css);

  const descendantOnly = [];
  for (const f of MODULES) {
    for (const m of read(f).matchAll(/classes:\s*\[([^\]]+)\]/g)) {
      const list = [...m[1].matchAll(/['"]([\w-]+)['"]/g)].map((x) => x[1]);
      if (!list.includes('hogwarts-system')) continue;
      for (const klass of list.filter((c) => c !== 'hogwarts-system')) {
        // A class may legitimately double as an inner element class (`.item`
        // for list rows). What matters is that at least one rule sits on the
        // root element.
        const styled = new RegExp(`\\.${klass}(?![\\w-])`).test(css);
        if (styled && !hasRootRule(klass)) descendantOnly.push(`${klass} (${f})`);
      }
    }
  }
  assert.deepEqual(descendantOnly, [], 'classes styled only as descendants, hence never applied');
});

test('system.json — version aligned and declared files present', () => {
  const sys = JSON.parse(read('system.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(sys.version, pkg.version, 'system.json and package.json disagree');

  const absent = [];
  for (const p of [...sys.esmodules, ...sys.styles]) {
    if (!fs.existsSync(p)) absent.push(p);
  }
  for (const l of sys.languages) {
    if (!fs.existsSync(l.path.replace('systems/hogwarts-system/', ''))) absent.push(l.path);
  }
  for (const p of sys.packs) {
    if (!fs.existsSync(p.path)) absent.push(p.path);
  }
  assert.deepEqual(absent, []);
});
