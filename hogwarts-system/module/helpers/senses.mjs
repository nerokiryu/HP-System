/**
 * Derived senses (l. 3118-3122), shared by the character and the NPC models.
 *
 * The two models inherit from the base separately, so this lived in only one of
 * them and the NPC silently ignored every sense an advantage granted.
 *
 * Kept free of any Foundry reference so the rules maths stays unit-testable.
 */

/** Multipliers the book prints for the five senses and the two other derived values. */
export const DEFAULT_MULTIPLIERS = {
  taste: 3, smell: 3, hearing: 4, touch: 3, sight: 5, idea: 5, luck: 5,
};

/**
 * @param {object} opts
 * @param {number} opts.per
 * @param {number} opts.int
 * @param {number} opts.pow
 * @param {object} [opts.senseMult]    per-sense overrides written by advantages
 * @param {object} [opts.multipliers]  world configuration, falling back to the book
 * @returns {object} every derived value, extra senses included
 */
export function deriveSenses({ per = 0, int = 0, pow = 0, senseMult = {}, multipliers = {} } = {}) {
  const dm = { ...DEFAULT_MULTIPLIERS, ...multipliers };
  const sm = senseMult ?? {};
  // An advantage may replace a multiplier (Problèmes visuels) or add one the
  // book grants to nobody by default (Troisième œil).
  const mult = (sense) => {
    const override = Number(sm[sense]);
    return Number.isFinite(override) && override > 0 ? override : dm[sense];
  };

  const derived = {
    taste: per * mult('taste'),
    smell: per * mult('smell'),
    hearing: per * mult('hearing'),
    touch: per * mult('touch'),
    sight: per * mult('sight'),
    idea: int * dm.idea,
    luck: pow * dm.luck,
  };

  // Extra senses only show up once an advantage has opened them.
  for (const [sense, factor] of Object.entries(sm)) {
    if (sense in derived) continue;
    const f = Number(factor);
    if (Number.isFinite(f) && f > 0) derived[sense] = per * f;
  }
  return derived;
}
