/**
 * The two ways the rulebook opposes two parties.
 *
 * Kept free of any Foundry reference so the rules maths stays unit-testable.
 */

/**
 * Resistance table (§1.5): an "active" characteristic pushes against a
 * "passive" one. The book prints the table up to 21 and gives the formula for
 * everything else: « le pourcentage de chance de base est de 50 % -
 * (caractéristique passive x5) + (caractéristique active x5) » (l. 1031).
 * The printed table never goes below 05 nor above 95.
 * @param {number} active
 * @param {number} passive
 * @returns {number} percentage chance for the active side
 */
export function resistanceChance(active, passive) {
  const raw = 50 + ((Number(active) || 0) - (Number(passive) || 0)) * 5;
  return Math.max(5, Math.min(95, raw));
}

/**
 * Margin of a percentile roll: « il lance les dés et obtient 046 soit une
 * différence de 58-46 = 12 » (l. 3066). A failed roll yields a negative margin,
 * which is what makes two failures comparable.
 * @param {number} target  the effective skill value, modifiers included
 * @param {number} roll    the d100 result
 * @returns {number}
 */
export function marginOf(target, roll) {
  return (Number(target) || 0) - (Number(roll) || 0);
}

/**
 * Opposed skill rolls (§28.3.4, l. 29823): « chaque joueur effectue un jet dans
 * sa compétence. On compare les deux différences et c'est la plus élevée qui
 * emporte l'action. En cas d'égalité, c'est toujours le premier personnage qui
 * agit (dans l'ordre de l'initiative) qui remporte l'action. »
 *
 * `hindrance` is subtracted from the acting side, following the worked example
 * « 40-10-28 = 2 » (l. 29857).
 *
 * @param {number} actingMargin    margin of whoever acts first
 * @param {number} opposingMargin  margin of the reacting side
 * @param {number} [hindrance]     penalty applied to the acting side
 * @returns {{total: number, actingWins: boolean, tie: boolean}}
 */
export function resolveOpposed(actingMargin, opposingMargin, hindrance = 0) {
  const total = (Number(actingMargin) || 0)
    - (Number(hindrance) || 0)
    - (Number(opposingMargin) || 0);
  return { total, actingWins: total >= 0, tie: total === 0 };
}
