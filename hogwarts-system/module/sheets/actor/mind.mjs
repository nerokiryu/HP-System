/**
 * Legilimency and Occlumency (ch. 15).
 *
 * The chapter is entirely descriptive: it prints no dice and no numbers. The
 * only mechanics the book supplies are the *Legilimens* spell — « Opposition :
 * POU/(POUx1) » (l. 22189) — and the two advantages that grant the skills at
 * 15 %, max 80 % (l. 4182, 4216).
 *
 * HOUSE EXTENSION: resolving an intrusion as an opposed **skill** roll, and the
 * reversal that follows a successful defence, are this system's reading of
 * §15.1 "Dangers": « Si celle-ci parvient à la bloquer lorsque le sortilège est
 * lancé, elle pourra alors pénétrer dans ses pensées sans que le lanceur puisse
 * se protéger » (l. 24365). The book attaches no numbers to that sentence.
 */
import { marginOf, resolveOpposed } from '../../helpers/opposition.mjs';
import { degreeOf, degreeBadge } from '../../helpers/degrees.mjs';

const ATTACK_SKILL = 'Legilimancie';
const DEFENCE_SKILL = 'Occlumancie';

/** A skill's current value, or null when the actor does not have it at all. */
function skillValue(actor, name) {
  const skill = actor?.system?.skills?.find((s) => s.name === name);
  return skill ? Number(skill.value) || 0 : null;
}

/**
 * Candidate defenders: every actor the user can see that owns Occlumancy, so
 * the list stays short instead of offering the whole directory.
 */
function defenders(exclude) {
  return game.actors
    .filter((a) => a.id !== exclude?.id && skillValue(a, DEFENCE_SKILL) !== null)
    .map((a) => ({ id: a.id, name: a.name }));
}

/**
 * Roll an intrusion against a defender's Occlumency.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onRollLegilimency(event, target) {
  event.preventDefault();
  const attacker = this.actor;
  const attack = skillValue(attacker, ATTACK_SKILL);
  if (attack === null) {
    return ui?.notifications?.warn?.(game.i18n.format('HOGWARTS.Mind.MissingSkill', { skill: ATTACK_SKILL }));
  }

  const choices = defenders(attacker);
  if (!choices.length) {
    return ui?.notifications?.warn?.(game.i18n.localize('HOGWARTS.Mind.NoDefender'));
  }

  const options = choices.map((c) => `<option value='${c.id}'>${c.name}</option>`).join('');
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('HOGWARTS.Mind.Title') },
    content: `
      <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Mind.Defender')}</label>
        <select name="defender">${options}</select></div>
      <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}</label>
        <input type="number" name="mod" value="0" step="1" /></div>
      <p class="hint">${game.i18n.localize('HOGWARTS.Mind.ProximityHint')}</p>`,
    ok: {
      label: game.i18n.localize('HOGWARTS.Mind.Intrude'),
      callback: (ev, btn) => ({
        defenderId: btn.form.elements.defender.value,
        mod: Number(btn.form.elements.mod.value) || 0,
      }),
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (!result) return;

  const defender = game.actors.get(result.defenderId);
  const defence = skillValue(defender, DEFENCE_SKILL) ?? 0;
  const attackTarget = attack + result.mod;

  const attackRoll = new Roll('1d100');
  await attackRoll.evaluate();
  const defenceRoll = new Roll('1d100');
  await defenceRoll.evaluate();

  const attackMargin = marginOf(attackTarget, attackRoll.total);
  const defenceMargin = marginOf(defence, defenceRoll.total);
  // The Legilimens strikes first, so a tie goes to them (l. 29822).
  const { total, actingWins, tie } = resolveOpposed(attackMargin, defenceMargin);

  const attackDegree = degreeOf(Number(attackRoll.total) || 0, attackTarget);
  const defenceDegree = degreeOf(Number(defenceRoll.total) || 0, defence);

  // Reversal: a defence that actually succeeded, not merely one that lost by
  // less, opens the intruder's own mind.
  const defenceSucceeded = Number(defenceRoll.total) <= defence;
  const reversed = !actingWins && defenceSucceeded;

  const verdict = actingWins ? 'Intruded' : (reversed ? 'Reversed' : 'Blocked');

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Mind.Title')}</h3>
      <span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Opposition')}</span></header>
      <div class="card-row"><strong>${attacker.name}</strong> — ${ATTACK_SKILL} ${attackTarget} ·
        ${attackRoll.total} → ${degreeBadge(attackDegree)} · ${game.i18n.localize('HOGWARTS.Opposition.Margin')} <strong>${attackMargin}</strong></div>
      <div class="card-row"><strong>${defender?.name ?? '?'}</strong> — ${DEFENCE_SKILL} ${defence} ·
        ${defenceRoll.total} → ${degreeBadge(defenceDegree)} · ${game.i18n.localize('HOGWARTS.Opposition.Margin')} <strong>${defenceMargin}</strong></div>
      <div class="card-row">${attackMargin} − ${defenceMargin} = <strong>${total}</strong>
        ${tie ? `<em>${game.i18n.localize('HOGWARTS.Opposition.TieRule')}</em>` : ''}</div>
      <div class="card-row mind-verdict"><strong>${game.i18n.localize(`HOGWARTS.Mind.${verdict}`)}</strong></div>
      ${reversed ? `<div class="card-row mind-reversal"><em>${game.i18n.format('HOGWARTS.Mind.ReversalNote', { defender: defender?.name ?? '?', attacker: attacker.name })}</em></div>` : ''}
    </div>`,
    rolls: [attackRoll, defenceRoll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
