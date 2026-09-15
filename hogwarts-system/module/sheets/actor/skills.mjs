/**
 * Character skills: adding, removing, automatic ceiling and category collapsing.
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
  const currentSkill = () => (this.actor.system.skills ?? [])[idx];
  if (!currentSkill()) return;

  // Switching back to automatic loses the player's setting, so confirmation is
  // always asked. Even when the manual figure equals the year's, manual mode is
  // itself a choice — it freezes a mastery the automation would raise next year.
  // The other direction loses nothing, so nothing to confirm.
  if (currentSkill().maxOverride) {
    const auto = CONFIG.Actor.dataModels.character.autoSchoolMax(this.actor.system?.profile?.year);
    // Clicking the padlock blurs the neighbouring field, whose save is still in
    // flight: the sheet therefore holds a fresher value than the actor.
    const shown = Number(target.closest('.skill-max')?.querySelector('input')?.value);
    const manual = Number.isFinite(shown) ? shown : (Number(currentSkill().max) || 0);
    const message = manual === auto
      ? game.i18n.format('HOGWARTS.Skills.MaxAuto.RestoreConfirmSame', { skill: currentSkill().name, auto })
      : game.i18n.format('HOGWARTS.Skills.MaxAuto.RestoreConfirm', { skill: currentSkill().name, manual: manual, auto });
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('HOGWARTS.Skills.MaxAuto.RestoreTitle') },
      content: `<p>${message}</p>`,
      yes: { label: game.i18n.localize('HOGWARTS.Skills.MaxAuto.RestoreYes') },
      // Foundry ships no French translation of its core, so a house key avoids
      // an English « Cancel » in the middle of everything else.
      no: { label: game.i18n.localize('HOGWARTS.Cancel'), default: true },
    }).catch(() => false);
    if (!ok) return;
  }

  // Read now rather than at the start: the save triggered by leaving the field
  // has had time to land. Starting from the initial clone would rewrite the
  // value as it stood before the edit.
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  if (!skills[idx]) return;
  // `max` already carries the value the player sees, which seeds the manual field.
  skills[idx].maxOverride = !skills[idx].maxOverride;
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
