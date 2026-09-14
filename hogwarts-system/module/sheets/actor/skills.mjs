/**
 * Compétences du personnage : ajout, suppression, plafond automatique et repli
 * des catégories.
 */

/**
 * Add a new custom skill to the actor under a given category
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function addSkill(event, target) {
  event.preventDefault();
  const category = target.dataset.category ?? 'general';
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  const name = game.i18n.localize('HOGWARTS.Skills.NewSkill');
  skills.push({
    name,
    base: 0,
    max: 95,
    value: 0,
    spent: 0,
    category,
    spec: '',
    custom: true
  });
  await this.actor.update({ 'system.skills': skills });
}

/**
 * Delete a custom skill by index. Preset (non-custom) skills are protected.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function deleteSkill(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  if (!Number.isInteger(idx)) return;
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  const entry = skills[idx];
  if (!entry) return;
  if (!entry.custom) {
    ui?.notifications?.warn?.(game.i18n.localize('HOGWARTS.Skills.CannotDeletePreset'));
    return;
  }
  skills.splice(idx, 1);
  await this.actor.update({ 'system.skills': skills });
}

/**
 * Switch a school skill's maximum between the year-derived value and a manual one.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function toggleSkillMaxAuto(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  if (!Number.isInteger(idx)) return;
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  const entry = skills[idx];
  if (!entry) return;
  // Cloned from prepared data, so `max` already holds the derived value the
  // player sees; keeping it seeds the manual field with that number.
  entry.maxOverride = !entry.maxOverride;
  await this.actor.update({ 'system.skills': skills });
}

/**
 * Toggle skill category collapsed state
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export function toggleSkillCategory(event, target) {
  event.preventDefault();
  const category = target.dataset.category;
  const skillSection = target.closest('.skill-category');
  const content = skillSection.querySelector('.skill-category-content[data-category="' + category + '"]');
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
