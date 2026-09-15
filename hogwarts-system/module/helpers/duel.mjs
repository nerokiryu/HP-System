/**
 * Wizard duel tables (ch. 27).
 *
 * Kept free of any Foundry reference so the rules maths stays unit-testable.
 */

/** The four duel types and what disqualifies a duellist (§27.4, l. 28616). */
export const DUEL_TYPES = {
  a: { label: 'HOGWARTS.Duel.Type.a', lethal: false, damageDisqualifies: true },
  b: { label: 'HOGWARTS.Duel.Type.b', lethal: false, damageDisqualifies: true },
  c: { label: 'HOGWARTS.Duel.Type.c', lethal: false, damageDisqualifies: false },
  d: { label: 'HOGWARTS.Duel.Type.d', lethal: true, damageDisqualifies: false },
};

/**
 * Casting modes and the initiative order they buy (§27.3, l. 28610):
 * innate spells always go first, protection spells next, unspoken and classic
 * spells share the third rank with a +3 for going unspoken, and extreme
 * formulas go last at −3.
 */
export const DUEL_MODES = {
  innate: { label: 'HOGWARTS.Duel.Mode.innate', priority: 1, initiative: 0 },
  unspoken: { label: 'HOGWARTS.Duel.Mode.unspoken', priority: 3, initiative: 3 },
  classic: { label: 'HOGWARTS.Duel.Mode.classic', priority: 3, initiative: 0 },
  extreme: { label: 'HOGWARTS.Duel.Mode.extreme', priority: 4, initiative: -3 },
};

/** The nine steps the chapter runs a duel through (§27.3, l. 28581). */
export const DUEL_STEPS = [
  'challenge', 'referee', 'seconds', 'type', 'modalities',
  'stance', 'declaration', 'countdown', 'initiative',
];

/** The modalities the participants agree on beforehand (§27.6, l. 29405). */
export const DUEL_MODALITIES = [
  'unspoken', 'innate', 'wounding', 'extreme',
];

/** A club year is worth +1 initiative, up to +5 (§27.2, l. 28569). */
export const MAX_CLUB_YEARS = 5;

/**
 * Allowed-spell table (§27.5, l. 28628). `types` lists the duel types the spell
 * is legal in, `warn` those where the book stars it as « peut blesser/tuer dans
 * certains cas particuliers ». Three rows name a spell that exists neither in
 * the rulebook's own tables nor in the Grimoire, and are flagged `unlinked`.
 */
export const DUEL_SPELLS = [
  { level: 1, name: 'Combustion', priority: 3, types: 'abcd', warn: 'ab' },
  { level: 1, name: 'Crâne chauve', priority: 3, types: 'abcd' },
  { level: 1, name: 'Crâne chauve fluo', priority: 3, types: 'abcd' },
  { level: 1, name: 'Croche-pied', priority: 3, types: 'abcd' },
  { level: 1, name: 'Folleoreille', priority: 3, types: 'abcd' },
  { level: 1, name: 'Maléfice de Jambencoton', priority: 3, types: 'abcd' },
  { level: 1, name: 'Lacer', priority: 3, types: 'abcd' },
  { level: 1, name: 'Larmes', priority: 3, types: 'abcd' },
  { level: 1, name: 'Lévitation de corps', priority: 3, types: 'abcd', unspokenOnly: true },
  { level: 1, name: 'Maléfice de Doigtencoton', priority: 3, types: 'abcd' },
  { level: 1, name: 'Sortilège d’eau', priority: 3, types: 'abcd' },
  { level: 2, name: 'Ascension', priority: 2, types: 'abcd' },
  { level: 2, name: 'Anti-Sort général', priority: 2, types: 'abcd' },
  { level: 2, name: 'Bloque-Jambe', priority: 3, types: 'abcd' },
  { level: 2, name: 'Cheveux drus', priority: 3, types: 'abcd' },
  { level: 2, name: 'Colle', priority: 3, types: 'abcd' },
  { level: 2, name: 'Confusion', priority: 3, types: 'abcd' },
  { level: 2, name: 'Conjonctivite', priority: 3, types: 'abcd' },
  { level: 2, name: 'Cuisant', priority: 3, types: 'abcd' },
  { level: 2, name: 'Danse endiablée', priority: 3, types: 'abcd' },
  { level: 2, name: 'Désarmement', priority: 3, types: 'abcd' },
  { level: 2, name: 'Entrave', priority: 3, types: 'abcd' },
  { level: 2, name: 'Ficelage', priority: 3, types: 'abcd' },
  { level: 2, name: 'Grande-Tête', priority: 3, types: 'abcd' },
  { level: 2, name: 'Huile glissante', priority: 3, types: 'abcd' },
  { level: 2, name: 'Langue de Plomb', priority: 3, types: 'abcd' },
  { level: 2, name: 'Ligotage', priority: 3, types: 'abcd' },
  { level: 2, name: 'Renversement', priority: 3, types: 'abcd', warn: 'ab' },
  { level: 2, name: 'Repoustout', priority: 3, types: 'abcd' },
  { level: 2, name: 'Spirale de vent', priority: 3, types: 'abcd' },
  { level: 2, name: 'Surdité', priority: 3, types: 'abcd' },
  { level: 3, name: 'Bouche soudée', priority: 3, types: 'abcd' },
  { level: 3, name: 'Chatouillis', priority: 3, types: 'abcd' },
  { level: 3, name: 'Chauve-Furie', priority: 3, types: 'cd' },
  { level: 3, name: 'Crache-Limace', priority: 3, types: 'abcd' },
  { level: 3, name: 'Crottes de nez', priority: 3, types: 'abcd' },
  { level: 3, name: 'Découpe', priority: 3, types: 'abcd' },
  { level: 3, name: 'Déflexion', priority: 2, types: 'abcd' },
  { level: 3, name: 'Diminution', priority: 3, types: 'abcd' },
  { level: 3, name: 'Soins', priority: 2, types: 'abcd' },
  { level: 3, name: 'Furoncles', priority: 3, types: 'cd' },
  { level: 3, name: 'Glacius', priority: 3, types: 'abcd' },
  { level: 3, name: 'Grandes-Dents', priority: 3, types: 'abcd' },
  { level: 3, name: 'Maléfice du saucisson', priority: 3, types: 'abcd' },
  { level: 3, name: 'Maléfice des Jambespongieuses', priority: 3, types: 'abcd' },
  { level: 3, name: 'Mouche-Sardine', priority: 3, types: 'abcd' },
  { level: 3, name: 'Stupéfixion', priority: 3, types: 'abcd' },
  { level: 4, name: 'Annulation de sort', priority: 2, types: 'abcd', unlinked: true },
  { level: 4, name: 'Gèle-Flamme', priority: 3, types: 'abcd' },
  { level: 4, name: 'Immobilisation totale', priority: 3, types: 'abcd', unlinked: true },
  { level: 4, name: 'Lévitation de corps', priority: 3, types: 'abcd' },
  { level: 4, name: 'Maléfice du Cerveau-en-gelée', priority: 3, types: 'abcd' },
  { level: 4, name: 'Maléfice du rire', priority: 3, types: 'abcd' },
  { level: 4, name: 'Mutisme', priority: 3, types: 'abcd' },
  { level: 4, name: 'Patronus', priority: 2, types: 'abcd' },
  { level: 4, name: 'Protection', priority: 2, types: 'abcd' },
  { level: 5, name: 'Aveuglement', priority: 3, types: 'abcd' },
  { level: 5, name: 'Explosion', priority: 3, types: 'cd', warn: 'c', unlinked: true },
  { level: 5, name: 'Expulsion', priority: 3, types: 'cd', warn: 'c' },
  { level: 5, name: 'Sectumsempra', priority: 3, types: 'cd', warn: 'c', unspokenOnly: true },
  { level: 5, name: 'Soin des blessures', priority: 2, types: 'abcd' },
  { level: 6, name: 'Bouclier diabolique', priority: 3, types: 'cd', warn: 'c' },
  { level: 6, name: 'Brèche', priority: 3, types: 'abcd' },
  { level: 6, name: 'Doloris', priority: 3, types: 'd', unforgivable: true },
  { level: 6, name: 'Guérisons magiques', priority: 2, types: 'abcd' },
  { level: 6, name: 'Imperium', priority: 3, types: 'd', unforgivable: true },
  { level: 6, name: 'Mort', priority: 3, types: 'd', unforgivable: true },
];

/**
 * Spells legal in a given duel type.
 * @param {string} type  one of a, b, c, d
 * @returns {object[]}
 */
export function allowedSpells(type) {
  return DUEL_SPELLS.filter((s) => s.types.includes(type));
}

/**
 * Whether a spell may be cast in this duel type at all.
 * @param {string} name
 * @param {string} type
 * @returns {boolean}
 */
export function isSpellAllowed(name, type) {
  return DUEL_SPELLS.some((s) => s.name === name && s.types.includes(type));
}

/**
 * Where a declared spell lands in the initiative order. The printed priority
 * column stays authoritative; only the two modes the chapter singles out —
 * innate first, extreme formulas last — override it.
 * @param {object} spell  a DUEL_SPELLS row, or undefined for an off-table spell
 * @param {string} mode   a DUEL_MODES key
 * @returns {{priority: number, initiative: number}}
 */
export function duelPriority(spell, mode) {
  const spec = DUEL_MODES[mode] ?? DUEL_MODES.classic;
  const priority = mode === 'innate' || mode === 'extreme'
    ? spec.priority
    : (spell?.priority ?? spec.priority);
  return { priority, initiative: spec.initiative };
}

/**
 * Initiative bonus from duel practice: +2 for the *Initié au duel* advantage,
 * plus +1 per year of duelling club, the two being explicitly cumulative
 * (l. 28577).
 * @param {{clubYears?: number, initiate?: boolean}} opts
 * @returns {number}
 */
export function duelTrainingBonus({ clubYears = 0, initiate = false } = {}) {
  const years = Math.max(0, Math.min(MAX_CLUB_YEARS, Math.floor(Number(clubYears) || 0)));
  return years + (initiate ? 2 : 0);
}

/**
 * Whether the *Initié au duel* +2 still has to be added on top. The advantage
 * ships as a conditional active effect on `initiativeBonus`: once the player
 * switches it on, the +2 is already counted there and adding it again would
 * double it.
 * @param {{owns?: boolean, effectApplied?: boolean}} opts
 * @returns {boolean}
 */
export function initiateBonusPending({ owns = false, effectApplied = false } = {}) {
  return owns && !effectApplied;
}

/**
 * The malus a spell carries in a given casting mode.
 *
 * Most spells print « Formule extrême : - » and so store a zero extreme malus.
 * Reading that zero as the cost of an extreme casting made them *easier* than a
 * plain one, so the mode only applies to spells that actually have a formula.
 * @param {object} spell  the spell item's system data
 * @param {string} mode   a DUEL_MODES key
 * @returns {{malus: number, noExtreme: boolean}}
 */
export function spellMalus(spell = {}, mode = 'classic') {
  const hasExtreme = !!spell.extremeFormula;
  if (mode === 'extreme' && hasExtreme) {
    return { malus: Number(spell.malusExtremeFormula) || 0, noExtreme: false };
  }
  // Mastering the extreme formula lowers the plain spell's malus (l. 23346).
  const plain = spell.extremeMastered
    ? Number(spell.malusMastered) || 0
    : Number(spell.malus) || 0;
  return { malus: plain, noExtreme: mode === 'extreme' && !hasExtreme };
}
