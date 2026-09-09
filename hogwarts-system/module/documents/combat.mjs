/**
 * Combat rules from chapter 2 of the rulebook.
 *
 * A round runs in three fixed phases (Chap. 2.4). Every combatant declares an
 * intention, which places them in a phase; within a phase, the highest
 * initiative acts first. Initiative is `1d6 + DEX` and is re-rolled at the start
 * of every round (Chap. 2.2).
 */

import { snitchChance } from '../helpers/quidditch.mjs';

export const COMBAT_PHASES = {
  1: 'HOGWARTS.Combat.Phase.First',
  2: 'HOGWARTS.Combat.Phase.Second',
  3: 'HOGWARTS.Combat.Phase.Third',
};

export const DEFAULT_PHASE = 2;

/** True when this encounter is being run as a Quidditch match (ch. 28). */
export function isQuidditch(combat) {
  return combat?.getFlag?.('hogwarts-system', 'quidditch.active') === true;
}

/**
 * Quidditch orders chasers and beaters by initiative, then lets keepers and
 * seekers act last (l. 29691) — the combat phases of chapter 2 do not apply.
 * @param {Combatant} c
 * @returns {number} 0 for chasers and beaters, 1 for keepers and seekers
 */
export function quidditchTier(c) {
  const role = c?.getFlag?.('hogwarts-system', 'quidditchRole');
  return role === 'keeper' || role === 'seeker' ? 1 : 0;
}

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
    const combat = a?.parent ?? b?.parent;
    const round = combat?.round || 1;

    if (isQuidditch(combat)) {
      const ta = quidditchTier(a);
      const tb = quidditchTier(b);
      if (ta !== tb) return ta - tb;
    } else {
      const pa = combatantPhase(a, round);
      const pb = combatantPhase(b, round);
      if (pa !== pb) return pa - pb;
    }

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

    if (isQuidditch(this)) {
      await this.rollSnitchAppearance();
    } else {
      const stillSurprised = this.combatants.filter((c) => c.getFlag('hogwarts-system', 'surprised'));
      if (stillSurprised.length) {
        await this.updateEmbeddedDocuments('Combatant', stillSurprised.map((c) => ({
          _id: c.id,
          'flags.hogwarts-system.surprised': false,
        })));
      }
    }

    if (game.settings.get('hogwarts-system', 'rerollInitiativeEachRound')) {
      await this.resetAll();
      await this.rollAll({ messageOptions: { flavor: game.i18n.localize('HOGWARTS.Combat.RerollFlavor') } });
    }
    return result;
  }

  /**
   * Roll whether the snitch is on the pitch this round (l. 29706). Once it has
   * appeared it stays, so the roll stops after the first success.
   */
  async rollSnitchAppearance() {
    if (this.getFlag('hogwarts-system', 'quidditch.snitchOnPitch')) return;
    const chance = snitchChance(this.round);
    if (chance <= 0) return;

    const roll = new Roll('1d100');
    await roll.evaluate();
    const appeared = roll.total <= chance;
    if (appeared) await this.setFlag('hogwarts-system', 'quidditch.snitchOnPitch', true);

    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.Snitch.Title')}</h3>
        <span class="card-type">${game.i18n.format('HOGWARTS.Quidditch.Round', { round: this.round })}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Quidditch.Snitch.Chance')}:</strong> ${chance}%</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> ${roll.total} →
          ${game.i18n.localize(appeared ? 'HOGWARTS.Quidditch.Snitch.OnPitch' : 'HOGWARTS.Quidditch.Snitch.Absent')}</div>
      </div>`,
      rolls: [roll],
    });
  }
}
