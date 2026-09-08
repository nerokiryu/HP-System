/**
 * Single source of truth for reading a d100 result.
 *
 * The book only defines two special bands: a critical on 01-05 (l. 978) and a
 * fumble on 96-00, where "non seulement l'action est manquée" makes the miss
 * unconditional (l. 960) — so 96-00 is tested before the target, otherwise a
 * skill at 96 or more could never fumble.
 *
 * The Extreme and Hard tiers are an optional import from generic BRP, gated
 * behind the `useExtendedSuccessTiers` world setting.
 *
 * @param {number} roll   The d100 result.
 * @param {number} target The percentage to beat.
 * @returns {string} Critical, Extreme, Hard, Success, Fail or Fumble.
 */
export function degreeOf(roll, target) {
  const extended = game.settings.get('hogwarts-system', 'useExtendedSuccessTiers') ?? false;
  if (roll <= 5) return 'Critical';
  if (roll >= 96) return 'Fumble';
  if (extended && roll <= Math.ceil(target / 5)) return 'Extreme';
  if (extended && roll <= Math.ceil(target / 2)) return 'Hard';
  if (roll <= target) return 'Success';
  return 'Fail';
}

/**
 * Badge markup for a degree, used across every chat card.
 * @param {string} degree
 * @returns {string}
 */
export function degreeBadge(degree) {
  const label = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
  return `<span class="degree ${degree.toLowerCase()}">${label}</span>`;
}
