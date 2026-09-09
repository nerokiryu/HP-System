/**
 * Quidditch tables and arithmetic (ch. 28).
 *
 * Kept free of any Foundry reference so the rules maths stays unit-testable.
 */

/** The four roles, with the actions each one may declare (l. 29636). */
export const QUIDDITCH_ROLES = {
  chaser: {
    label: 'HOGWARTS.Quidditch.Role.chaser',
    icon: 'fas fa-hand-fist',
    actions: ['move', 'pass', 'recover', 'intercept', 'dodgeBludger', 'shoot', 'special'],
  },
  beater: {
    label: 'HOGWARTS.Quidditch.Role.beater',
    icon: 'fas fa-gavel',
    actions: ['move', 'hitChasers', 'hitKeeper', 'hitSeeker', 'dodgeBludger', 'special'],
  },
  keeper: {
    label: 'HOGWARTS.Quidditch.Role.keeper',
    icon: 'fas fa-shield-halved',
    actions: ['move', 'pass', 'recover', 'intercept', 'dodgeBludger', 'save', 'special'],
  },
  seeker: {
    label: 'HOGWARTS.Quidditch.Role.seeker',
    icon: 'fas fa-magnifying-glass',
    actions: ['move', 'spotSnitch', 'readSeeker', 'chaseSnitch', 'catchSnitch', 'dodgeBludger', 'special'],
  },
};

/**
 * Which roll each action uses. `quidditch` and `broom` are the two skills the
 * chapter names (l. 29594): plain flying uses "Vol en balai", everything
 * acrobatic uses "Acrobatie/Quidditch".
 */
export const QUIDDITCH_ACTIONS = {
  move: { label: 'HOGWARTS.Quidditch.Action.move', roll: 'broom', opposed: false },
  pass: { label: 'HOGWARTS.Quidditch.Action.pass', roll: 'quidditch', opposed: true },
  recover: { label: 'HOGWARTS.Quidditch.Action.recover', roll: 'quidditch', opposed: true },
  intercept: { label: 'HOGWARTS.Quidditch.Action.intercept', roll: 'quidditch', opposed: true },
  shoot: { label: 'HOGWARTS.Quidditch.Action.shoot', roll: 'quidditch', opposed: true },
  save: { label: 'HOGWARTS.Quidditch.Action.save', roll: 'quidditch', opposed: true },
  hitChasers: { label: 'HOGWARTS.Quidditch.Action.hitChasers', roll: 'quidditch', opposed: true },
  hitKeeper: { label: 'HOGWARTS.Quidditch.Action.hitKeeper', roll: 'quidditch', opposed: true },
  hitSeeker: { label: 'HOGWARTS.Quidditch.Action.hitSeeker', roll: 'quidditch', opposed: true },
  dodgeBludger: { label: 'HOGWARTS.Quidditch.Action.dodgeBludger', roll: 'quidditch', opposed: true },
  spotSnitch: { label: 'HOGWARTS.Quidditch.Action.spotSnitch', roll: 'per', multiplier: 3, opposed: false },
  readSeeker: { label: 'HOGWARTS.Quidditch.Action.readSeeker', roll: 'per', multiplier: 5, opposed: false },
  chaseSnitch: { label: 'HOGWARTS.Quidditch.Action.chaseSnitch', roll: 'broom', opposed: false },
  catchSnitch: { label: 'HOGWARTS.Quidditch.Action.catchSnitch', roll: 'dex', multiplier: 1, opposed: false },
  special: { label: 'HOGWARTS.Quidditch.Action.special', roll: 'quidditch', opposed: true },
};

/** The eleven named fouls (l. 29556-29580). The book chiffres no penalty but the penalty shot. */
export const QUIDDITCH_FOULS = [
  'bumphing', 'blatching', 'blagging', 'cobbing', 'flacking',
  'haversacking', 'quafflePocking', 'snitchnip', 'stooging', 'bumpingCrowd', 'broomJump',
];

/** Points scored (l. 29524). */
export const QUIDDITCH_POINTS = { goal: 10, snitch: 150 };

/** The seven-player line-up the book fixes (l. 29488). */
export const LINEUP = { chaser: 3, beater: 2, keeper: 1, seeker: 1 };

/**
 * Chance that the snitch is on the pitch: 10 % on round 2, +5 % per round,
 * reaching 100 % on round 20 (l. 29706).
 * @param {number} round
 * @returns {number} percentage, 0 before round 2
 */
export function snitchChance(round) {
  if (round < 2) return 0;
  return Math.min(100, 10 + (round - 2) * 5);
}
