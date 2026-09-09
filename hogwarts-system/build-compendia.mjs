/**
 * Regenerate the compendium JSON sources from the rulebooks.
 *
 *   node build-compendia.mjs        writes packs/<pack>/json/*.json
 *   node build-packs.mjs            then compiles those into LevelDB
 *
 * The books in ../rules/md/ are machine-readable extractions: tables are
 * embedded as JSON blocks. Everything below reads those blocks, so the packs
 * are a pure function of the sources and can be rebuilt at each book revision.
 *
 * Conventions settled once, here, because the books are not self-consistent:
 *
 *  - Malus sign. The spell tables print a penalty as a positive "FC : 20%",
 *    the potion tables as a negative "-10%", and the core book sometimes as
 *    "FC : -20%". Everything is stored negative, matching the schema.
 *  - Level "5+". Stored as the sentinel 6; sheets display "5+".
 *  - Extreme formula "FE : A%/B%". B goes to `malusExtremeFormula`, A to
 *    `malusMastered` (the reduced cost of the plain spell once the extreme
 *    formula is mastered, l. 23341).
 *  - Creature movement. Most entries publish a single figure, but seven give a
 *    breakdown ("Sol 15 Vol 20"), so those are split across land/fly/swim. A
 *    handful carry extraction noise instead of a number and fall back to 8.
 *  - Creature hit points. Sixteen entries are missing or contaminated by prose
 *    from a neighbouring field; those fall back to the (SIZ+CON)/2 the rules
 *    prescribe rather than shipping a creature with 0 hit points.
 *  - Potion virulence and duration. Neither has a column: both are buried in
 *    the prose as "VIRulence : N" and "Durée : ...". Antidotes state a
 *    threshold with the same word ("jusqu'à une VIRulence 10"), which is not
 *    their own virulence, so only the colon form is read.
 *  - Potion preparation time. Deliberately left empty: the core book puts the
 *    brewing time "à la discrétion du MJ" (l. 12963) and publishes no value.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES = path.join(__dirname, '..', 'rules', 'md');

const GRIMOIRE = 'Grimoire-des-sortileges-potions-et-ingredients-V1.11.md';
const BESTIAIRE = 'Bestiaire-des-animaux-fantastiques.md';
const ENCYCLOPEDIE = 'Encyclopedie-des-Esprits-Etres-et-Non-etres.md';

/* ─── Reading the sources ───────────────────────────────────────────────── */

function jsonBlocks(file) {
  const text = fs.readFileSync(path.join(RULES, file), 'utf-8');
  const out = [];
  for (const [, body] of text.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    try { out.push(JSON.parse(body)); } catch { /* extraction noise */ }
  }
  return out;
}

function records(file, kind) {
  return jsonBlocks(file).filter((b) => b.kind === kind).flatMap((b) => b.records ?? []);
}

/* ─── Normalisation ─────────────────────────────────────────────────────── */

/** Extraction wraps long cells, so names arrive with newlines inside them. */
const clean = (s) => String(s ?? '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();

/** The bestiary sets creature names in full capitals; restore normal casing. */
function properName(raw) {
  const v = clean(raw);
  if (v !== v.toUpperCase()) return v;
  const small = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'à', 'au', 'aux', 'et', 'en', 'd', 'l']);
  return v.toLowerCase().replace(/[^\s'’-]+/g, (w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)));
}

/** Levels are "0".."5" or the open-ended "5+", which has no numeric value. */
function level(raw) {
  const v = clean(raw);
  return v === '5+' ? 6 : Number.parseInt(v, 10) || 0;
}

/** Always negative, whatever sign the table used. */
const penalty = (n) => -Math.abs(Number(n) || 0);

/**
 * "FC : 20%" and the optional "FE : 10%/30%".
 * @returns {{malus:number, extreme:boolean, malusExtremeFormula:number, malusMastered:number}}
 */
function parseMalus(raw) {
  const text = clean(raw);
  const fc = text.match(/FC\s*:?\s*(-?\d+)\s*%/i) ?? text.match(/^(-?\d+)\s*%?$/);
  const fe = text.match(/FE\s*:?\s*(-?\d+)\s*%\s*\/\s*(-?\d+)\s*%/i);
  return {
    malus: fc ? penalty(fc[1]) : 0,
    extremeFormula: Boolean(fe),
    malusExtremeFormula: fe ? penalty(fe[2]) : 0,
    malusMastered: fe ? penalty(fe[1]) : 0,
  };
}

/** Targets come as "A/P", "A, O, P, V" or the glued pair "A/OP/V". */
function targets(raw) {
  const letters = clean(raw).toUpperCase().match(/[AOPVSX]/g) ?? [];
  const kept = [...new Set(letters)];
  return kept.length ? kept : ['X'];
}

/** The spell tables use E/M/S, plus "Varie" for the two open-ended entries. */
const spellType = (raw) => (['E', 'M', 'S'].includes(clean(raw)) ? clean(raw) : 'X');

const RARITY = { commun: 'commun', rare: 'rare', rares: 'rare', rarissime: 'rarissime' };
const rarity = (raw) => RARITY[clean(raw).toLowerCase()] ?? 'commun';

/**
 * The Grimoire has no `virulence` column: poisons carry it inside the prose as
 * "VIRulence : N". Antidotes phrase a *threshold* the same way ("annule les
 * poisons jusqu'à une VIRulence 10"), which is not their own virulence, so only
 * the colon form counts.
 */
function virulence(raw) {
  const m = /VIRulence\s*:\s*(\d+)/i.exec(String(raw ?? ''));
  return m ? Number(m[1]) : null;
}

/** Likewise for "Durée : ...", which runs to the end of its line. */
function duration(raw) {
  const m = /Durée\s*:\s*([^\n]+)/i.exec(String(raw ?? ''));
  if (!m) return '';
  const value = clean(m[1]).replace(/[;,.]\s*$/, '');
  // The tables print a lone dash where a potion has no duration at all.
  return /^-+$/.test(value) ? '' : value;
}

/** Turn the source's line-broken prose into paragraphs. */
function html(raw) {
  const body = String(raw ?? '').trim();
  if (!body) return '';
  return body
    .split(/\n(?=[A-ZÀ-Ý•])|\n\n/)
    .map((p) => clean(p))
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`)
    .join('');
}

/** Foundry needs a 16-character alphanumeric id, stable across rebuilds. */
function makeId(prefix, name, used) {
  const slug = clean(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  let id = (prefix + slug).slice(0, 16).padEnd(16, '0');
  let n = 1;
  while (used.has(id)) id = (prefix + slug).slice(0, 14).padEnd(14, '0') + String(++n).padStart(2, '0');
  used.add(id);
  return id;
}

/* ─── Builders ──────────────────────────────────────────────────────────── */

// Icons verified present in Foundry v14: transform.svg, leaf.svg and potion.svg
// were all dropped from core and render as broken images.
const SPELL_ICON = { E: 'icons/svg/light.svg', M: 'icons/svg/upgrade.svg', S: 'icons/svg/explosion.svg', X: 'icons/svg/book.svg' };

function buildSpells(used) {
  return records(GRIMOIRE, 'sortileges').map((r) => {
    const type = spellType(r.type);
    const incantation = clean(r.incantation) === '-' ? '' : clean(r.incantation);
    const name = clean(r.nom);
    return {
      _id: makeId('sp', name, used),
      name,
      type: 'spell',
      img: SPELL_ICON[type],
      system: {
        description: html(r.effets),
        spellLevel: level(r.niveau),
        spellType: type,
        target: targets(r.cibles),
        incantation,
        ...parseMalus(r.malus),
      },
    };
  });
}

function buildPotions(used) {
  return records(GRIMOIRE, 'potions').map((r) => {
    const name = clean(r.nom);
    const ingredients = clean(r.ingredients)
      .split(/\s*;\s*/)
      .map((n) => clean(n))
      .filter(Boolean)
      .map((n) => ({ name: n, quantity: 1, rarity: rarity(r.rarete_ingredients), available: false }));
    return {
      _id: makeId('po', name, used),
      name,
      type: 'potion',
      img: 'icons/svg/chest.svg',
      system: {
        description: html(r.effets),
        potionLevel: level(r.niveau),
        malus: parseMalus(r.malus).malus,
        target: targets(r.cibles).join('/'),
        ingredientRarity: rarity(r.rarete_ingredients),
        ingredientList: ingredients,
        virulence: virulence(r.effets),
        duration: duration(r.effets),
        // `prepTime` stays empty on purpose: the rulebook leaves the brewing
        // time "à la discrétion du MJ" (l. 12963) and publishes no value.
      },
    };
  });
}

function buildComponents(used) {
  return records(GRIMOIRE, 'ingredients').map((r) => {
    const name = clean(r.nom);
    return {
      _id: makeId('cp', name, used),
      name,
      type: 'component',
      img: 'icons/svg/oak.svg',
      system: {
        description: html(r.description),
        rarity: rarity(r.rarete),
        quantity: 0,
        usedIn: clean(r.utilise_pour_les_potions).replace(/\s*•\s*/g, '\n').trim(),
        otherUses: clean(r.autres_utilisations),
      },
    };
  });
}

const STAT_KEYS = { FOR: 'str', CON: 'con', TAI: 'siz', DEX: 'dex', INT: 'int', POU: 'pow', APP: 'app', PER: 'per' };

/** "5-6" or "18" — take the midpoint of a range so the value stays plausible. */
function firstNumber(raw, fallback = 0) {
  const nums = String(raw ?? '').match(/\d+/g);
  if (!nums) return fallback;
  if (nums.length >= 2) return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
  return Number(nums[0]);
}

/** Only "12", "5-6" or "0" are usable; anything else is a neighbouring field bleeding in. */
function cleanHitPoints(raw) {
  const v = clean(raw);
  return /^\d+\s*(-\s*\d+)?$/.test(v) ? firstNumber(v, 0) : null;
}

/**
 * "14", "5 (10)", or a breakdown such as "Sol 15 Vol 20" / "Sol 3 Eau: 17".
 * @returns {{land:number, fly:number|null, swim:number|null}}
 */
function movement(raw) {
  const v = clean(raw);
  const grab = (words) => {
    const m = v.match(new RegExp(`(?:${words})\\s*:?\\s*(\\d+)`, 'i'));
    return m ? Number(m[1]) : null;
  };
  const land = grab('Sol|Terre');
  const fly = grab('Vol|Air');
  const swim = grab('Eau|Nage');
  if (land !== null || fly !== null || swim !== null) {
    return { land: land ?? 8, fly, swim };
  }
  // A bare figure, optionally followed by a parenthesised alternate speed.
  const plain = v.match(/^(\d+)/);
  return { land: plain ? Number(plain[1]) : 8, fly: null, swim: null };
}

function buildCreatures(used) {
  const blocks = [...jsonBlocks(BESTIAIRE), ...jsonBlocks(ENCYCLOPEDIE)]
    .filter((b) => b && b.characteristics && b.name);
  const seen = new Set();
  const out = [];
  for (const b of blocks) {
    const name = properName(b.name);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const stats = {};
    for (const [label, key] of Object.entries(STAT_KEYS)) {
      const entry = b.characteristics[label] ?? {};
      stats[key] = {
        value: firstNumber(entry.average, 10) || 10,
        formula: clean(entry.dice) === '-' ? '' : clean(entry.dice),
      };
    }
    const hp = cleanHitPoints(b.hit_points) ?? Math.ceil((stats.siz.value + stats.con.value) / 2);
    out.push({
      _id: makeId('cr', name, used),
      name,
      type: 'creature',
      img: 'icons/svg/mystery-man.svg',
      system: {
        biography: html(b.use ?? ''),
        health: { value: hp, max: hp },
        healthNonLethal: { value: 0, max: hp },
        initiativeBonus: 0,
        conditions: { seriousWound: false, agony: false },
        classification: clean(b.classification_mdlm) || '',
        stats,
        movement: movement(b.movement),
        armor: { value: firstNumber(b.armor, 0) },
        attacks: clean(b.combat),
        skills: clean(b.skills),
        powers: html(b.powers_and_capabilities ?? ''),
        notes: html(b.weaknesses ?? ''),
      },
    });
  }
  return out;
}

/* ─── Writing ───────────────────────────────────────────────────────────── */

function write(pack, docs) {
  const dir = path.join(__dirname, 'packs', pack, 'json');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(dir, f));
  }
  for (const doc of docs) {
    fs.writeFileSync(path.join(dir, `${doc._id}.json`), `${JSON.stringify(doc, null, 2)}\n`, 'utf-8');
  }
  console.log(`  ${pack.padEnd(22)} ${String(docs.length).padStart(4)} documents`);
}

const used = new Set();
console.log('Regeneration des compendiums depuis rules/md/ :');
write('hogwarts-spells', buildSpells(used));
write('hogwarts-potions', buildPotions(used));
write('hogwarts-components', buildComponents(used));
write('hogwarts-creatures', buildCreatures(used));
console.log('\nCompiler ensuite avec : node build-packs.mjs');
