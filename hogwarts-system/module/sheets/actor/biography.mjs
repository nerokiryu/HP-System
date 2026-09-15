/**
 * Onglet Biographie : famille, transformation en animagus (§16) et repli des
 * sections de la fiche.
 */
import { degreeOf, degreeBadge } from '../../helpers/degrees.mjs';

/**
 * Change between human and animal form. Chapter 16 describes the ten-step
 * process (§16.1) and the animal-category test (§16.2) but never puts a number
 * on the transformation itself, so the roll below is a house extension: 1d100
 * under the Animagus skill the advantage grants. Reverting always succeeds —
 * the book only calls the first transformation difficult.
 * @this HogwartsActorSheet
 */
export async function onAnimagusTransform(event) {
  event.preventDefault();
  const animagus = this.actor.system.animagus;
  if (animagus?.transformed) {
    await this.actor.update({ 'system.animagus.transformed': false });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Actor.Animagus.Title')}</h3>
        <span class="card-type">${game.i18n.localize('HOGWARTS.Actor.Animagus.Revert')}</span></header>
        <div class="card-row">${game.i18n.localize('HOGWARTS.Actor.Animagus.Reverted')}</div>
      </div>`,
    });
  }

  const skill = this.actor.system.skills?.find((s) => s.name === 'Animagus');
  if (!skill) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Actor.Animagus.NoSkill'));

  const choice = await this._promptRollModifier.call(this, { showFougue: false });
  if (!choice) return;
  const { mod } = choice;
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total) || 0;
  const stressMalus = Number(this.actor.system.stress?.value) || 0;
  const target = (Number(skill.value) || 0) + mod - stressMalus;
  const degree = degreeOf(r, target);
  const success = ['Critical', 'Extreme', 'Hard', 'Success'].includes(degree);

  if (success) await this.actor.update({ 'system.animagus.transformed': true });

  const forme = animagus?.form
    ? ` — ${animagus.form}`
    : '';
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Actor.Animagus.Title')}${forme}</h3>
      <span class="card-type">${game.i18n.localize('HOGWARTS.Actor.Animagus.Transform')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${skill.value}${mod ? ` → ${target}` : ''}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong>
        <span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>
      <div class="card-row">${game.i18n.localize(success
        ? 'HOGWARTS.Actor.Animagus.TransformSuccess'
        : 'HOGWARTS.Actor.Animagus.TransformFailure')}</div>
    </div>`,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Add a new family member
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function addFamilyMember(event, target) {
  event.preventDefault();
  const family = foundry.utils.deepClone(this.actor.system.family ?? []);
  family.push({ role: '', name: '', age: null, details: '' });
  await this.actor.update({ 'system.family': family });
}

/**
 * Delete a family member
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function deleteFamilyMember(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  if (!Number.isInteger(idx)) return;
  const family = foundry.utils.deepClone(this.actor.system.family ?? []);
  family.splice(idx, 1);
  await this.actor.update({ 'system.family': family });
}

/**
 * Toggle biography section collapsed state
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export function toggleBioSection(event, target) {
  event.preventDefault();
  const section = target.dataset.section;
  const bioSection = target.closest('.bio-section');
  const content = bioSection.querySelector('.bio-content[data-section="' + section + '"]');
  const icon = target.querySelector('i');
  
  if (!content || !icon) return;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.classList.remove('fa-chevron-right');
    icon.classList.add('fa-chevron-down');
  } else {
    content.style.display = 'none';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-right');
  }
}

/**
 * Toggle settings section collapsed state
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export function toggleSettingsSection(event, target) {
  event.preventDefault();
  const section = target.dataset.section;
  const settingsSection = target.closest('.settings-section');
  const content = settingsSection.querySelector('.settings-content[data-section="' + section + '"]');
  const icon = target.querySelector('i');
  
  if (!content || !icon) return;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.classList.remove('fa-chevron-right');
    icon.classList.add('fa-chevron-down');
  } else {
    content.style.display = 'none';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-right');
  }
}

export function toggleCreatureSection(event, target) {
  event.preventDefault();
  const section = target.dataset.section;
  const content = target.closest('.creature-section').querySelector('.creature-section-content[data-section="' + section + '"]');
  const icon = target.querySelector('i');
  if (!content || !icon) return;
  if (content.style.display === 'none') {
    content.style.display = '';
    icon.classList.remove('fa-chevron-right');
    icon.classList.add('fa-chevron-down');
  } else {
    content.style.display = 'none';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-right');
  }
}
