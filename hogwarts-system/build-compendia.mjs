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
const CORE = 'Harry-Potter-JdR-v1.12.md';

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

/* ─── Features: §4.1, §4.2 and §5.2 of the core book ────────────────────── */

/**
 * The core book is not extracted as `kind`/`records` blocks like the Grimoire:
 * its tables arrive as `compact_rows`. Sections are located by heading rather
 * than by line number so a book revision cannot silently shift the ranges.
 */
function coreRows(fromHeading, toHeading) {
  const text = fs.readFileSync(path.join(RULES, CORE), 'utf-8');
  const from = text.indexOf(fromHeading);
  const to = text.indexOf(toHeading, from);
  if (from < 0 || to < 0) throw new Error(`Section introuvable : ${fromHeading} → ${toHeading}`);
  const rows = [];
  for (const m of text.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    if (m.index < from || m.index > to) continue;
    try { rows.push(...(JSON.parse(m[1]).compact_rows ?? [])); } catch { /* extraction noise */ }
  }
  return rows;
}

/** Column headers survive extraction as ordinary rows, and repeat on each page. */
const FEATURE_HEADER = /^(D1[02]|Avantages et|d.savantages|Description|Co.t|Coups de pouce|Croche-pattes)$/i;

/** "Remarque : Axiome des Serdaigles" is how §5.2 marks the twelve axioms. */
const AXIOM_NOTE = /Axiome\s+des?\s+\w+/i;

/**
 * §4.1 and §4.2 print "d12 | name | description"; §5.2 prints
 * "name | description | cost".
 */
function featureRows(fromHeading, toHeading, diced) {
  const out = [];
  for (const r of coreRows(fromHeading, toHeading)) {
    if (r.length < 2) continue;
    const name = clean(diced ? r[1] : r[0]);
    if (!name || FEATURE_HEADER.test(name)) continue;
    out.push({ name, description: clean(diced ? r[2] : r[1]), cost: diced ? '' : clean(r[2]) });
  }
  return out;
}

/**
 * The cost column reads from the player's side: "-1" for an advantage that eats
 * a point, "+1" for a disadvantage that hands one back. `pbpCost` is summed
 * *against* the budget (actor-sheet.mjs: `max - totalCost`), so the sign flips
 * here. Variable entries print every tier ("-2 -1.5 -1", "+0.5 ou +1"); the
 * first is kept and the description carries the full range.
 */
function pbpCost(raw) {
  const m = /[+-]?\d+(?:[.,]\d+)?/.exec(clean(raw));
  return m ? -Number(m[0].replace(',', '.')) : 0;
}

/**
 * Numeric effects, transcribed by hand from §5.2. A regex over the prose would
 * mis-read "1/3 du temps", "PERx5" or "VIRulence augmentée de 2", and half the
 * published figures name no skill at all.
 *
 * Only permanent bonuses on skills the system actually publishes ship enabled.
 * Two other cases ship *disabled*, ready to be switched on:
 *  - `conditional` — the book restricts the bonus to a situation (a magical
 *    duel, the round a spell is cast), so leaving it always-on would be wrong;
 *  - `pick` — the book leaves the target skill to the player ("Doué pour…"),
 *    so the figure is filled in but the skill name has to be completed.
 * Everything else stays descriptive: once-per-scenario "+30 % à toutes ses
 * actions" (Courageux, Fourberie, Justicier), virulence shifts, PERx4, and the
 * features that grant a whole new skill (Animagus, Legilimens, Occlumens,
 * Métamorphomage) which an Active Effect cannot add to an array.
 */
const PICK_PLACEHOLDER = 'COMPETENCE-A-CHOISIR';

const FEATURE_EFFECTS = {
  // Permanent, on skills the book names outright.
  'Communicatif': { skills: { 'Commandement': 10, 'Persuasion/Baratin': 10, 'Psychologie': 10 } },
  'Réservé': { skills: { 'Commandement': -10, 'Persuasion/Baratin': -10, 'Psychologie': -10 } },
  'Empathie': { skills: { 'Psychologie': 15 } },
  'Sportif': { skills: { 'Acrobatie/Quidditch': 10, 'Athlétisme': 10, 'Bagarre': 10 } },
  'Surpoids': { skills: { 'Acrobatie/Quidditch': -10, 'Athlétisme': -10, 'Bagarre': -10 } },
  'Sur le qui-vive': { skills: { 'Vigilance': 15, 'Discrétion': 15, 'Persuasion/Baratin': 15 } },
  'Apathique': { initiative: -2 },
  'Cérébral': { initiative: -1 },
  'Réactif': { initiative: 2 },
  // Tied to a situation, so shipped off.
  'Baguette bruyante': { skills: { 'Discrétion': -15 }, conditional: true },
  'Initié au duel': { initiative: 2, conditional: true },
  'Lent à la détente': { initiative: -3, conditional: true },
  // The player picks the skill; only the figure is known here.
  'Affinité avec…': { pick: 15 },
  'Doué pour…': { pick: 10 },
  'Érudition': { pick: 15 },
  'Excellent joueur de…': { pick: 20 },
  'Facilités en…': { pick: 10 },
  'Lacunes en …': { pick: -10 },
};

const ADD_MODE = 2; // CONST.ACTIVE_EFFECT_MODES.ADD

/** One transferable effect per feature, or none when nothing is automatable. */
function featureEffect(name, img, used) {
  const spec = FEATURE_EFFECTS[name];
  if (!spec) return [];

  const changes = [];
  for (const [skill, delta] of Object.entries(spec.skills ?? {})) {
    changes.push({ key: `system.skillBonus.${skill}`, mode: ADD_MODE, value: String(delta), priority: 20 });
  }
  if (spec.pick !== undefined) {
    changes.push({ key: `system.skillBonus.${PICK_PLACEHOLDER}`, mode: ADD_MODE, value: String(spec.pick), priority: 20 });
  }
  if (spec.initiative !== undefined) {
    changes.push({ key: 'system.initiativeBonus', mode: ADD_MODE, value: String(spec.initiative), priority: 20 });
  }

  return [{
    _id: makeId('fe', name, used),
    name,
    img,
    type: 'base',
    changes,
    disabled: Boolean(spec.conditional) || spec.pick !== undefined,
    transfer: true,
    description: spec.pick !== undefined
      ? `<p>Remplacez « ${PICK_PLACEHOLDER} » dans la clé de la modification par le nom exact de la compétence choisie, puis activez l'effet.</p>`
      : spec.conditional
        ? '<p>Le livre limite ce modificateur à une situation précise : activez l\'effet le temps qu\'elle dure.</p>'
        : '',
    duration: {},
    statuses: [],
    flags: {},
  }];
}

const FEATURE_ICON = {
  fateBoon: 'icons/svg/sun.svg',
  fateBane: 'icons/svg/terror.svg',
  houseAxiom: 'icons/svg/castle.svg',
  advantage: 'icons/svg/upgrade.svg',
  disadvantage: 'icons/svg/downgrade.svg',
};

function buildFeatures(used) {
  const sections = [
    { from: '## 4.1 COUPS DE POUCE', to: '## 4.2 CROCHE-PATTES', diced: true, kind: 'fateBoon' },
    { from: '## 4.2 CROCHE-PATTES', to: '# 5 AXIOMES DE MAISON', diced: true, kind: 'fateBane' },
    { from: '## 5.2 LES AVANTAGES', to: '## 5.3 POSSESSIONS', diced: false, kind: 'perk' },
  ];

  const out = [];
  for (const section of sections) {
    // Scoped to the section: "Hybride" is published twice, once as a §4.2
    // croche-patte (first generation, imposed) and once as a §5.2 advantage
    // (any generation, bought), and both are needed.
    const seen = new Set();
    for (const entry of featureRows(section.from, section.to, section.diced)) {
      if (seen.has(entry.name.toLowerCase())) continue;
      seen.add(entry.name.toLowerCase());

      const cost = pbpCost(entry.cost);
      let type = section.kind;
      if (type === 'perk') {
        type = AXIOM_NOTE.test(entry.description) ? 'houseAxiom' : cost > 0 ? 'advantage' : 'disadvantage';
      }

      // §5: "Ces axiomes de maison n'entrent pas dans le calcul total des points
      // attribués lors de la création du personnage" — so they cost nothing,
      // whatever figure §5.1 and §5.2 print for them.
      const free = type === 'houseAxiom' || type === 'fateBoon' || type === 'fateBane';
      const note = free && type === 'houseAxiom'
        ? '<p><em>Axiome de Maison : accordé d\'office, il n\'entre pas dans le calcul des points de création (§5).</em></p>'
        : '';

      out.push({
        _id: makeId('ft', entry.name, used),
        name: entry.name,
        type: 'feature',
        img: FEATURE_ICON[type],
        system: {
          description: html(entry.description) + note,
          perkType: type,
          pbpCost: free ? 0 : cost,
        },
        effects: featureEffect(entry.name, FEATURE_ICON[type], used),
      });
    }
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
write('hogwarts-features', buildFeatures(used));
console.log('\nCompiler ensuite avec : node build-packs.mjs');
