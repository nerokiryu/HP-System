/**
 * Combat rules from chapter 2 of the rulebook.
 *
 * A round runs in three fixed phases (Chap. 2.4). Every combatant declares an
 * intention, which places them in a phase; within a phase, the highest
 * initiative acts first. Initiative is `1d6 + DEX` and is re-rolled at the start
 * of every round (Chap. 2.2).
 */

export const COMBAT_PHASES = {
  1: 'HOGWARTS.Combat.Phase.First',
  2: 'HOGWARTS.Combat.Phase.Second',
  3: 'HOGWARTS.Combat.Phase.Third',
};

export const DEFAULT_PHASE = 2;

/**
 * Read a combatant's declared phase, forcing a surprised combatant into the
 * third phase for the opening round (Chap. 2.2.1).
 * @param {Combatant} c
 * @param {number} round
 * @returns {number}
 */
export function combatantPhase(c, round = 1) {
  if (c?.getFlag?.('hogwarts-system', 'surprised') && round <= 1) return 3;
  const p = Number(c?.getFlag?.('hogwarts-system', 'phase'));
  return [1, 2, 3].includes(p) ? p : DEFAULT_PHASE;
}

export class HogwartsCombat extends Combat {
  /**
   * @override
   * Order by phase, then by descending initiative. The rulebook resolves a tie
   * between a player and a Gamemaster-controlled combatant in the player's
   * favour (Chap. 2.2).
   *
   * Foundry hands this comparator straight to `Array#sort`, so it runs detached
   * from the Combat: read the round off the combatants rather than `this`.
   */
  _sortCombatants(a, b) {
    const round = a?.parent?.round || b?.parent?.round || 1;
    const pa = combatantPhase(a, round);
    const pb = combatantPhase(b, round);
    if (pa !== pb) return pa - pb;

    const ia = typeof a.initiative === 'number' ? a.initiative : -Infinity;
    const ib = typeof b.initiative === 'number' ? b.initiative : -Infinity;
    if (ia !== ib) return ib - ia;

    if (a.hasPlayerOwner !== b.hasPlayerOwner) return a.hasPlayerOwner ? -1 : 1;
    return (a.id ?? '').localeCompare(b.id ?? '');
  }

  /**
   * @override
   * Re-roll initiative for everyone at the start of each new round, and clear
   * the surprise flag once the opening round is over.
   */
  async nextRound() {
    const result = await super.nextRound();
    if (!game.user.isGM) return result;

    const stillSurprised = this.combatants.filter((c) => c.getFlag('hogwarts-system', 'surprised'));
    if (stillSurprised.length) {
      await this.updateEmbeddedDocuments('Combatant', stillSurprised.map((c) => ({
        _id: c.id,
        'flags.hogwarts-system.surprised': false,
      })));
    }

    if (game.settings.get('hogwarts-system', 'rerollInitiativeEachRound')) {
      await this.resetAll();
      await this.rollAll({ messageOptions: { flavor: game.i18n.localize('HOGWARTS.Combat.RerollFlavor') } });
    }
    return result;
  }
}
