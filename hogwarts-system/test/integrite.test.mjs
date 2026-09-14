/**
 * Tests d'intégrité structurelle.
 *
 * Les tests de `rules.test.mjs` vérifient l'arithmétique des règles. Ceux-ci
 * vérifient que le code tient debout : actions déclarées, clés de traduction
 * présentes, gabarits existants, sélecteurs CSS effectifs. Chacun est né d'un
 * bug réellement rencontré, et aucun n'a besoin de démarrer Foundry.
 *
 * Lancer avec : node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Tous les fichiers d'une arborescence portant l'extension donnée. */
function fichiers(racine, ext) {
  if (!fs.existsSync(racine)) return [];
  return fs.readdirSync(racine, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(racine, e.name);
    if (e.isDirectory()) return fichiers(p, ext);
    return e.name.endsWith(ext) ? [p] : [];
  });
}

const GABARITS = fichiers('templates', '.hbs');
const MODULES = fichiers('module', '.mjs');
const lire = (f) => fs.readFileSync(f, 'utf-8');

/** Contenu d'un bloc `cle: { ... }`, accolades équilibrées. */
function bloc(src, cle) {
  const i = src.indexOf(cle);
  if (i < 0) return null;
  const debut = src.indexOf('{', i);
  let d = 0;
  for (let k = debut; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && --d === 0) return src.slice(debut + 1, k);
  }
  return null;
}

test('gabarits — toute action utilisée est déclarée dans une classe', () => {
  // ApplicationV2 ignore silencieusement un `data-action` inconnu : le bouton
  // ne fait rien, sans la moindre erreur en console.
  const declarees = new Set();
  for (const f of MODULES) {
    const src = lire(f);
    let reste = src;
    while (reste.includes('actions: {')) {
      const corps = bloc(reste, 'actions: {');
      if (!corps) break;
      for (const m of corps.matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)) declarees.add(m[1]);
      reste = reste.slice(reste.indexOf('actions: {') + 10);
    }
  }
  assert.ok(declarees.size > 20, `trop peu d'actions détectées (${declarees.size})`);

  const manquantes = new Map();
  for (const f of GABARITS) {
    for (const m of lire(f).matchAll(/data-action=['"]([^'"{}]+)['"]/g)) {
      const action = m[1].trim();
      if (declarees.has(action)) continue;
      if (!manquantes.has(action)) manquantes.set(action, []);
      manquantes.get(action).push(f);
    }
  }
  assert.deepEqual([...manquantes.keys()], [], `actions non déclarées : ${[...manquantes].map(([a, f]) => `${a} (${f.join(', ')})`).join(' | ')}`);
});

test('gabarits — aucun data-action sur un select ou un champ texte', () => {
  // Les actions sont branchées sur le clic. Sur un <select>, le clic est le
  // geste qui déroule la liste : le re-rendu la referme aussitôt. Une case à
  // cocher est légitime, le clic la bascule.
  const fautifs = [];
  for (const f of GABARITS) {
    const src = lire(f);
    for (const m of src.matchAll(/<(select|textarea|input)\b[^>]*>/gs)) {
      const balise = m[0];
      if (!balise.includes('data-action')) continue;
      const type = balise.match(/type=['"](\w+)['"]/)?.[1];
      if (m[1] === 'input' && ['checkbox', 'radio'].includes(type)) continue;
      fautifs.push(`${f}:<${m[1]}${type ? ` type=${type}` : ''}>`);
    }
  }
  assert.deepEqual(fautifs, []);
});

test('traductions — toute clé littérale des gabarits existe en fr et en en', () => {
  const charger = (f) => {
    const plat = {};
    const parcourir = (o, prefixe) => {
      for (const [k, v] of Object.entries(o)) {
        const chemin = prefixe ? `${prefixe}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) parcourir(v, chemin);
        else plat[chemin] = v;
      }
    };
    parcourir(JSON.parse(lire(f)), '');
    return plat;
  };
  const fr = charger('lang/fr.json');
  const en = charger('lang/en.json');

  const absentes = [];
  for (const f of GABARITS) {
    for (const m of lire(f).matchAll(/localize\s+['"]([\w.-]+)['"]/g)) {
      const cle = m[1];
      // Seules les clés du système nous incombent : DOCUMENT.*, EFFECT.* et
      // consorts sont fournies par le cœur de Foundry.
      if (!cle.startsWith('HOGWARTS.')) continue;
      if (!(cle in fr)) absentes.push(`${cle} (fr, ${f})`);
      if (!(cle in en)) absentes.push(`${cle} (en, ${f})`);
    }
  }
  assert.deepEqual(absentes, []);
});

test('traductions — fr et en déclarent exactement les mêmes clés', () => {
  const cles = (f) => {
    const out = [];
    const parcourir = (o, prefixe) => {
      for (const [k, v] of Object.entries(o)) {
        const chemin = prefixe ? `${prefixe}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) parcourir(v, chemin);
        else out.push(chemin);
      }
    };
    parcourir(JSON.parse(lire(f)), '');
    return out.sort();
  };
  const fr = cles('lang/fr.json');
  const en = cles('lang/en.json');
  assert.deepEqual(fr.filter((k) => !en.includes(k)), [], 'présentes en fr, absentes en en');
  assert.deepEqual(en.filter((k) => !fr.includes(k)), [], 'présentes en en, absentes en fr');
});

test('gabarits — tout chemin référencé dans le code existe sur le disque', () => {
  const absents = [];
  for (const f of MODULES) {
    for (const m of lire(f).matchAll(/['"]systems\/hogwarts-system\/(templates\/[\w/-]+\.hbs)['"]/g)) {
      if (!fs.existsSync(m[1])) absents.push(`${m[1]} (${f})`);
    }
  }
  assert.deepEqual(absents, []);
});

test('CSS — les classes racines des applications sont ciblées sans descendant', () => {
  // ApplicationV2 pose toutes les entrées de `classes` sur le MÊME élément.
  // `.hogwarts-system .x` (descendant) ne correspond donc jamais à rien ;
  // il faut `.hogwarts-system.x`, écrit `&.x` en SCSS.
  const css = lire('css/hogwarts-system.css');
  // Un délimiteur est indispensable : sans lui, `.item` correspondrait à
  // `.item-name` et le test crierait au loup sur des sélecteurs corrects.
  const present = (prefixe, classe) => new RegExp(`${prefixe}\\.${classe}(?![\\w-])`).test(css);

  const sansRegleRacine = [];
  for (const f of MODULES) {
    for (const m of lire(f).matchAll(/classes:\s*\[([^\]]+)\]/g)) {
      const liste = [...m[1].matchAll(/['"]([\w-]+)['"]/g)].map((x) => x[1]);
      if (!liste.includes('hogwarts-system')) continue;
      for (const classe of liste.filter((c) => c !== 'hogwarts-system')) {
        // Une classe peut légitimement servir aussi de classe d'élément
        // interne (`.item` pour les lignes de liste). Ce qui compte, c'est
        // qu'il existe au moins une règle posée sur la racine.
        const stylee = new RegExp(`\\.${classe}(?![\\w-])`).test(css);
        if (stylee && !present('\\.hogwarts-system', classe)) sansRegleRacine.push(`${classe} (${f})`);
      }
    }
  }
  assert.deepEqual(sansRegleRacine, [], 'classes stylées uniquement en descendant, donc jamais appliquées');
});

test('system.json — version alignée et fichiers déclarés présents', () => {
  const sys = JSON.parse(lire('system.json'));
  const pkg = JSON.parse(lire('package.json'));
  assert.equal(sys.version, pkg.version, 'system.json et package.json divergent');

  const absents = [];
  for (const chemin of [...sys.esmodules, ...sys.styles]) {
    if (!fs.existsSync(chemin)) absents.push(chemin);
  }
  for (const l of sys.languages) {
    if (!fs.existsSync(l.path.replace('systems/hogwarts-system/', ''))) absents.push(l.path);
  }
  for (const p of sys.packs) {
    if (!fs.existsSync(p.path)) absents.push(p.path);
  }
  assert.deepEqual(absents, []);
});
