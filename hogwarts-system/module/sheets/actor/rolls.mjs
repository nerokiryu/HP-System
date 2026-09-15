/**
 * Roll resolution: skills, initiative, damage, oppositions, reactions and
 * spending Fougue points.
 */
import { degreeOf, degreeBadge, fougueDegree, reverseDice } from '../../helpers/degrees.mjs';
import { resistanceChance } from '../../helpers/opposition.mjs';
import { marginRow, rollMargin } from '../../applications/opposition.mjs';
import { damageButtons, fougueButton, fougueGainButton } from './chat-cards.mjs';

/**
 * Reaction state for the current combat round. Reactions are per-round, so
 * the stored round number is what makes a stale flag harmless out of combat.
 * @returns {{round: number, dodged: boolean, parried: boolean}}
 * @param {HogwartsActorSheet} sheet
 */
function reactionState(sheet) {
  const round = game.combat?.round ?? 0;
  const f = sheet.actor.getFlag('hogwarts-system', 'reactions') ?? {};
  return f.round === round
    ? { round, dodged: !!f.dodged, parried: !!f.parried }
    : { round, dodged: false, parried: false };
}

/**
 * Shared d100 resolution for a reaction, including the stress penalty.
 * @param {{kind: string, target: number, skillName: string, notes: string[]}} opts
 * @param {HogwartsActorSheet} sheet
 */
async function rollReaction(sheet, { kind, target, skillName, notes }) {
  const stress = Number(sheet.actor.system.stress?.value) || 0;
  const finalTarget = Math.max(0, target - stress);
  const roll = new Roll('1d100');
  await roll.evaluate();
  const r = Number(roll.total) || 0;
  const degree = degreeOf(r, finalTarget);

  const title = game.i18n.localize(`HOGWARTS.Reaction.${kind}`);
  const stressText = stress ? ` (stress −${stress})` : '';
  let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${sheet.actor.name}</h3>`
    + `<span class="card-type">${title}</span></header>`
    + `<div class="card-row"><strong>${skillName}:</strong> ${finalTarget}${stressText}</div>`
    + `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> `
    + `<span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>`;
  for (const n of notes) content += `<div class="card-row reaction-note">${n}</div>`;
  content += '</div>';

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sheet.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Handle clickable rolls.
 *
 * @this HogwartsActorSheet
 * @param {PointerEvent} event   The originating click event
 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
 * @protected
 */
export async function onRoll(event, target) {
  event.preventDefault();
  const dataset = target.dataset;

  // Handle item rolls.
  switch (dataset.rollType) {
    case 'item':
      const item = this._getEmbeddedDocument(target);
      if (item) return item.roll();
  }

  // Handle rolls that supply the formula directly.
  if (dataset.roll) {
    // Prompt for a roll modifier (bonus/penalty) and optionally fougue.
    const isPercentile = !!dataset.target;
    const choice = await this._promptRollModifier.call(this, { showFougue: isPercentile });
    if (!choice) return;
    const { mod, useFougue } = choice;
    let formula = String(dataset.roll);
    const labelBase = dataset.label ? String(dataset.label) : '';

    // Percentile check support: if a target is provided, evaluate success levels
    if (dataset.target) {
      // Evaluate roll and resolve numeric target
      const roll = new Roll(formula, this.actor.getRollData());
      await roll.evaluate();

      // Apply stress malus (subtracts from target for characters)
      const stressMalus = Number(this.actor.system.stress?.value) || 0;
      const targetExpr = mod
        ? `(${dataset.target}) + (${mod}) - ${stressMalus}`
        : stressMalus ? `(${dataset.target}) - ${stressMalus}` : String(dataset.target);
      const targetRoll = new Roll(targetExpr, this.actor.getRollData());
      await targetRoll.evaluate();
      const targetValue = Number(targetRoll.total) || 0;
      let r = Number(roll.total) || 0;

      // Fougue (§8.2): the point is declared before the roll, reversing the
      // tens and units is then a *choice*, and the point is spent either way
      // — including on a palindrome, which the book calls out (l. 10220).
      let fougueUsed = false;
      let fougueReversed = false;
      if (useFougue) {
        fougueUsed = true;
        const reversed = reverseDice(r);
        if (reversed !== r && await promptFougueChoice(r, reversed)) {
          r = reversed;
          fougueReversed = true;
        }
      }

      // Harry Potter JdR degrees: Critical (01-05), Fumble (96-00), else
      // success or failure against the target.
      let degree = degreeOf(r, targetValue);
      // Missing an action after spending a point is treated as a fumble (l. 2995).
      if (fougueUsed) degree = fougueDegree(degree);

      const modText = mod ? ` (mod ${mod >= 0 ? '+' : ''}${mod})` : '';
      const fougueKey = fougueReversed ? 'HOGWARTS.Roll.FougueReversed' : 'HOGWARTS.Roll.FougueKept';
      const fougueText = fougueUsed ? `<span class="fougue-tag">${game.i18n.localize(fougueKey)}</span>` : '';
      const fougueBtn = (!fougueUsed && (Number(this.actor.system.fougue?.value) || 0) > 0) ? fougueButton(r, targetValue, this.actor.id) : '';
      const content = `
        <div class="hogwarts-chat-card">
          <header class="card-header"><h3>${labelBase}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SkillCheck')}</span></header>
          <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue}${modText}</div>
          <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span>${fougueText} → ${degreeBadge(degree)}</div>
          ${fougueBtn}
          ${fougueGainButton(degree, this.actor)}
        </div>`;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        rolls: [roll],
        rollMode: game.settings.get('core', 'rollMode'),
      });

      // Spend fougue point after message creation to avoid data-preparation conflict
      if (fougueUsed) {
        const currentFougue = Number(this.actor.system.fougue?.value) || 0;
        if (currentFougue > 0) {
          await this.actor.update({ 'system.fougue.value': currentFougue - 1 });
        }
      }
      return roll;
    }

    // Default behavior: plain roll to chat
    if (mod) formula = `${formula} ${mod >= 0 ? '+' : '-'} ${Math.abs(mod)}`;
    const roll = new Roll(formula, this.actor.getRollData());
    await roll.evaluate();
    const modText = mod ? ` (mod ${mod >= 0 ? '+' : ''}${mod})` : '';
    const content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><h3>${labelBase || game.i18n.localize('HOGWARTS.Chat.Roll')}</h3></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Result')}:</strong> <span class="roll-value">${roll.total}</span>${modText}</div>
        ${damageButtons(Number(roll.total))}
      </div>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      rollMode: game.settings.get('core', 'rollMode'),
    });
    return roll;
  }
}

/**
 * Spend a fougue point for a chase burst (§1.7.7): movement goes up by half,
 * but the sprint lasts only half CON rounds and costs as many rounds of rest.
 * @this HogwartsActorSheet
 */
export async function onFougueSprint(event) {
  event.preventDefault();
  const current = Number(this.actor.system.fougue?.value) || 0;
  if (current <= 0) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Chat.NoFougue'));

  const base = Number(this.actor.system.movement) || 8;
  const con = Number(this.actor.system.stats?.con?.total ?? this.actor.system.stats?.con?.value) || 0;
  const boosted = base + Math.floor(base / 2);
  const rounds = Math.floor(con / 2);

  await this.actor.update({ 'system.fougue.value': current - 1 });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Fougue.Sprint')}</h3></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Actor.Character.Movement')}:</strong> ${base} → ${boosted}</div>
      <div class="card-row">${game.i18n.format('HOGWARTS.Fougue.SprintResult', { rounds })}</div>
    </div>`,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Ask whether to reverse the roll. The point is already spent by the time
 * this runs, so cancelling keeps the original result rather than refunding
 * (l. 10203: "Dans un cas comme dans l'autre, le point de fougue est consommé").
 * @param {number} original
 * @param {number} reversed
 * @returns {Promise<boolean>} true to take the reversed result
 */
export async function promptFougueChoice(original, reversed) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize('HOGWARTS.Roll.UseFougue') },
    content: `<p>${game.i18n.format('HOGWARTS.Roll.FougueChoice', { original, reversed })}</p>`,
    yes: { label: game.i18n.format('HOGWARTS.Roll.FougueTake', { value: reversed }) },
    no: { label: game.i18n.format('HOGWARTS.Roll.FougueKeep', { value: original }) },
  }).catch(() => false);
}

/**
 * Handle clickable damage bonus rolls.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event   The originating click event
 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
 * @private
 */
export async function onRollDamage(event, target) {
  event.preventDefault();
  try { event.stopPropagation?.(); event.stopImmediatePropagation?.(); } catch (e) {}
  // Support rolling damage for a linked familiar: if the button provides
  // a `data-actor-id`, use that actor's roll data and speaker.
  let formula = '1d3';
  let rollActor = this.actor;
  try {
    // If the control is bound to a different actor (linked familiar), prefer it
    const actorId = target.dataset.actorId || target.dataset.id || null;
    if (actorId) {
      const a = game.actors.get(actorId);
      if (a) rollActor = a;
    }

    // Prefer an inline editable input inside the clicked element (for familiars)
    const input = target.querySelector && target.querySelector('input[name="system.familiar.dmg"]');
    if (input && String(input.value).trim()) formula = String(input.value).trim();
    else if (target.dataset.roll) formula = target.dataset.roll;
    else if (rollActor?.system?.familiar?.dmg) formula = rollActor.system.familiar.dmg;
    else formula = rollActor.system?.damageBonus || '1d3';
  } catch (err) {
    formula = target.dataset.roll || this.actor.system.damageBonus || '1d3';
  }

  const label = game.i18n.localize('HOGWARTS.Chat.Damage');
  const roll = new Roll(formula, rollActor.getRollData());
  await roll.evaluate();
  const total = Number(roll.total) || 0;

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${label}</h3><span class="card-type">${formula}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Result')}:</strong> <span class="roll-value">${total}</span></div>
      ${damageButtons(total)}
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: rollActor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Roll initiative: 1d6 + DEX and post to chat (and set combat initiative if applicable)
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function rollInitiative(event, target) {
  event.preventDefault?.();
  try { event.stopPropagation?.(); } catch (e) {}

  const actor = this.actor;
  if (!actor) return;

  // Same terms as CONFIG.Combat.initiative: `total` carries the ancestry
  // modifier (§17.2) and `initiativeBonus` is what features such as Apathique
  // or Réactif (§5.2) drive through an Active Effect.
  const dex = Number(actor.system?.stats?.dex?.total ?? actor.system?.stats?.dex?.value) || 0;
  const initiativeBonus = Number(actor.system?.initiativeBonus) || 0;

  // Prompt for an optional bonus/penalty to the initiative roll
  const choice = await this._promptRollModifier.call(this);
  if (!choice) return;
  const { mod } = choice;

  // Build the roll formula (1d6 plus optional modifier)
  let rollFormula = '1d6';
  if (Number.isFinite(mod) && mod !== 0) {
    rollFormula += (mod >= 0) ? ` + ${mod}` : ` - ${Math.abs(mod)}`;
  }

  // Evaluate the roll
  const roll = new Roll(rollFormula, actor.getRollData());
  await roll.evaluate();

  const rollTotal = Number(roll.total) || 0;
  const total = rollTotal + dex + initiativeBonus;

  // Build a chat card with details
  const bonusRow = initiativeBonus
    ? `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.InitiativeBonus')}:</strong> ${initiativeBonus > 0 ? '+' : ''}${initiativeBonus}</div>`
    : '';
  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Chat.Initiative')}</h3><span class="card-type">1d6 + DEX</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> ${rollFormula} = ${rollTotal}</div>
      <div class="card-row"><strong>DEX:</strong> ${dex}</div>
      ${bonusRow}
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Total')}:</strong> <span class="roll-value">${total}</span></div>
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });

  // If the actor has an active token in combat, set its initiative
  try {
    const tokens = actor.getActiveTokens ? actor.getActiveTokens() : [];
    const token = (tokens && tokens.length) ? tokens[0] : null;
    if (token && token.combatant) {
      await token.combatant.update({ initiative: total });
      ui?.notifications?.info?.(`Initiative définie à ${total} pour ${actor.name}`);
    }
  } catch (e) {
    // ignore errors setting combat initiative
  }
  return roll;
}

/**
 * Dodge (Chap. 2.5.1). A dodging character cannot attack this round, but may
 * still parry. Dodging never works against spells.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 */
export async function onRollDodge(event) {
  event.preventDefault();
  const skill = (this.actor.system.skills ?? []).find((s) => s.name === 'Esquive');
  if (!skill) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Reaction.NoDodgeSkill'));
  const state = reactionState(this);
  await rollReaction(this, {
    kind: 'Dodge',
    target: Number(skill.value) || 0,
    skillName: 'Esquive',
    notes: [
      game.i18n.localize('HOGWARTS.Reaction.DodgeNoAttack'),
      game.i18n.localize('HOGWARTS.Reaction.NotVsSpells'),
    ],
  });
  await this.actor.setFlag('hogwarts-system', 'reactions', { ...state, dodged: true });
}

/**
 * Parry (Chap. 2.5.2). Parrying is a roll on the attacking skill, limited to
 * once per round, melee only, and never against spells. An equipped shield
 * adds its bonus here; the same figure penalises the character's attacks.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 */
export async function onRollParry(event) {
  event.preventDefault();
  const state = reactionState(this);
  if (state.parried && game.combat) {
    return ui.notifications.warn(game.i18n.localize('HOGWARTS.Reaction.AlreadyParried'));
  }

  const candidates = (this.actor.system.skills ?? [])
    .map((s, i) => ({ ...s, i }))
    .filter((s) => /bagarre|arme|duel|acrobatie|athl/i.test(s.name));
  if (!candidates.length) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Reaction.NoParrySkill'));

  const shield = Number(this.actor.system.shieldBonus) || 0;
  const options = candidates.map((s) => `<option value="${s.i}">${s.name} (${s.value})</option>`).join('');
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('HOGWARTS.Reaction.Parry') },
    content: `<div class="form-group"><label>${game.i18n.localize('HOGWARTS.Reaction.ParrySkill')}</label>
              <select name="skill">${options}</select></div>`
      + (shield ? `<p class="notes">${game.i18n.format('HOGWARTS.Reaction.ShieldNote', { bonus: shield })}</p>` : ''),
    ok: {
      label: game.i18n.localize('HOGWARTS.Recovery.Roll'),
      callback: (ev, b) => Number(b.form.elements.skill.value),
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (choice === null || choice === undefined || Number.isNaN(choice)) return;

  const skill = this.actor.system.skills[choice];
  const notes = [
    game.i18n.localize('HOGWARTS.Reaction.MeleeOnly'),
    game.i18n.localize('HOGWARTS.Reaction.NotVsSpells'),
  ];
  if (shield) notes.push(game.i18n.format('HOGWARTS.Reaction.ShieldNote', { bonus: shield }));

  await rollReaction(this, {
    kind: 'Parry',
    target: (Number(skill.value) || 0) + shield,
    skillName: skill.name,
    notes,
  });
  await this.actor.setFlag('hogwarts-system', 'reactions', { ...state, parried: true });
}

/**
 * Opposed **skill** roll (§28.3.4, l. 29823), the rule the book also uses for
 * dodges and brawls in chapter 2 (l. 3067, l. 3081). Only the margin is
 * published here; the Gamemaster compares two of them with the resolver.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onRollOpposedSkill(event, target) {
  event.preventDefault();
  const base = Number(target.dataset.target) || 0;
  const label = target.dataset.label ?? '';

  const choice = await this._promptRollModifier.call(this, { showFougue: false });
  if (!choice) return;

  const stress = Number(this.actor.system.stress?.value) || 0;
  const finalTarget = base + (Number(choice.mod) || 0) - stress;
  const { roll, margin, success } = await rollMargin(finalTarget);

  const stressText = stress ? ` −${stress}` : '';
  const modText = choice.mod ? ` ${choice.mod >= 0 ? '+' : ''}${choice.mod}` : '';

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${label}</h3>
      <span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Opposition')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${base}${modText}${stressText} = ${finalTarget}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> ${roll.total} →
        ${game.i18n.localize(success ? 'HOGWARTS.Roll.Degree.Success' : 'HOGWARTS.Roll.Degree.Fail')}</div>
      ${marginRow(margin, { label: `${game.i18n.localize('HOGWARTS.Opposition.Margin')} (${finalTarget} − ${roll.total})` })}
    </div>`,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Opposition roll helper (Resistance Table): 50% - (passive×5) + (active×5)
 * Prompts for active and passive characteristic values, then rolls d100.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onRollOpposition(event, target) {
  event.preventDefault();

  const content = `
    <form>
      <div class="form-group">
        <label>${game.i18n.localize('HOGWARTS.Roll.Opposition.Active')}</label>
        <input type="number" name="active" value="10" step="1" min="1"/>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize('HOGWARTS.Roll.Opposition.Passive')}</label>
        <input type="number" name="passive" value="10" step="1" min="1"/>
      </div>
    </form>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('HOGWARTS.Roll.Opposition.Title') },
    content,
    ok: {
      label: game.i18n.localize('OK'),
      callback: (event, button, dialog) => {
        const form = button.form;
        return {
          active: Number(form.elements.active.value) || 10,
          passive: Number(form.elements.passive.value) || 10,
        };
      },
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);

  if (!result) return;

  const { active, passive } = result;
  const targetValue = resistanceChance(active, passive);

  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total) || 0;

  const degree = degreeOf(r, targetValue);

  const chatContent = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Roll.Opposition.Title')}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Opposition')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Roll.Opposition.Active')}:</strong> ${active} vs <strong>${game.i18n.localize('HOGWARTS.Roll.Opposition.Passive')}:</strong> ${passive}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue}%</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>
      ${(Number(this.actor.system.fougue?.value) || 0) > 0 ? fougueButton(r, targetValue, this.actor.id) : ''}
      ${fougueGainButton(degree, this.actor)}
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content: chatContent,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
