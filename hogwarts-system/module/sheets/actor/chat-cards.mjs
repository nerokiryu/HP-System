/**
 * Chat card buttons, shared by every roll on the sheet.
 *
 * They emit raw HTML rather than a template: the cards are assembled by string
 * concatenation in the handlers, and the listeners are wired once
 * pour toutes par le hook `renderChatMessageHTML`.
 */

/**
 * Build Apply Damage / Apply Healing button HTML.
 * @param {number} value - Numeric damage/healing value
 * @returns {string} HTML string for the card-buttons section
 */
export function damageButtons(value) {
  if (!value || value <= 0) return '';
  const dmgLabel = game.i18n.localize('HOGWARTS.Chat.ApplyDamage');
  const healLabel = game.i18n.localize('HOGWARTS.Chat.ApplyHealing');
  const nlLabel = game.i18n.localize('HOGWARTS.Chat.ApplyNonLethal');
  const koLabel = game.i18n.localize('HOGWARTS.Chat.ApplyKnockout');
  return `
    <div class="card-buttons">
      <button class="apply-damage" data-action="apply-damage" data-value="${value}"><i class="fas fa-heart-broken"></i> ${dmgLabel} (${value})</button>
      <button class="apply-nonlethal" data-action="apply-nonlethal" data-value="${value}"><i class="fas fa-hand-fist"></i> ${nlLabel} (${value})</button>
      <button class="apply-knockout" data-action="apply-knockout" data-value="${value}"><i class="fas fa-face-dizzy"></i> ${koLabel}</button>
      <button class="apply-healing" data-action="apply-healing" data-value="${value}"><i class="fas fa-heart"></i> ${healLabel} (${value})</button>
    </div>`;
}

/**
 * Build a "Use Fougue" button for percentile roll chat cards.
 * Embeds the original roll, target value, and actor ID so the hook can process it.
 * The book spends the point before the roll (l. 10199), so the button is gated
 * behind a setting for tables that prefer deciding afterwards.
 * @param {number} rollValue - The original d100 result
 * @param {number} targetValue - The target number to beat
 * @param {string} actorId - The actor's ID (to spend their fougue point)
 * @returns {string} HTML string
 */
export function fougueButton(rollValue, targetValue, actorId) {
  if (!rollValue || !actorId) return '';
  if (!game.settings.get('hogwarts-system', 'fougueAfterRoll')) return '';
  const label = game.i18n.localize('HOGWARTS.Chat.UseFougue');
  return `
    <div class="card-buttons">
      <button class="use-fougue" data-action="use-fougue" data-roll="${rollValue}" data-target="${targetValue}" data-actor-id="${actorId}"><i class="fas fa-dice"></i> ${label}</button>
    </div>`;
}

/**
 * GM-only offer to award the fougue point a critical earns (l. 10190). The book
 * requires the action to be "accomplie passionnément" and excludes combat
 * (§8.4), neither of which the system can judge, so it only proposes.
 * @param {string} degree
 * @param {Actor} actor
 * @returns {string} HTML string
 */
export function fougueGainButton(degree, actor) {
  if (degree !== 'Critical' || !game.user.isGM || actor?.type !== 'character') return '';
  const current = Number(actor.system.fougue?.value) || 0;
  const max = Number(actor.system.fougue?.max) || 5;
  if (current >= max) return '';
  // §8.4: no fougue is earned while fighting, whatever the criticals. Taking
  // part in a running encounter is the closest the system gets to "combative".
  if (game.combat?.started && game.combat.combatants.some((c) => c.actorId === actor.id)) return '';
  const label = game.i18n.localize('HOGWARTS.Chat.GrantFougue');
  return `
    <div class="card-buttons">
      <button class="grant-fougue" data-action="grant-fougue" data-actor-id="${actor.id}"><i class="fas fa-bolt"></i> ${label}</button>
    </div>`;
}
