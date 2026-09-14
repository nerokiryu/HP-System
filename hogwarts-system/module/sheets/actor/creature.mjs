/**
 * Fiches de créature et de PNJ : attaques maison, compétences libres et jets de
 * caractéristique.
 */
import { degreeOf, degreeBadge } from '../../helpers/degrees.mjs';
import { damageButtons } from './chat-cards.mjs';

export async function addAttack(event, target) {
  event.preventDefault();
  const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? []);
  attacks.push({ name: '', chance: 30, damage: '1d6' });
  await this.actor.update({ 'system.attacks': attacks });
}

export async function deleteAttack(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  if (!Number.isInteger(idx)) return;
  const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? []);
  attacks.splice(idx, 1);
  await this.actor.update({ 'system.attacks': attacks });
}

export async function rollAttack(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  const attack = this.actor.system.attacks?.[idx];
  if (!attack) return;

  const chance = Number(attack.chance) || 0;
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total);
  const degree = degreeOf(r, chance);

  // If success or critical, roll damage automatically
  let damageSection = '';
  if (degree === 'Success' || degree === 'Critical') {
    const dmgFormula = attack.damage || '1d6';
    const dmgRoll = new Roll(dmgFormula, this.actor.getRollData());
    await dmgRoll.evaluate();
    const total = Number(dmgRoll.total);
    damageSection = `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Damage')}:</strong> ${dmgFormula} = <span class="roll-value">${total}</span></div>${damageButtons(total)}`;
  }

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${attack.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Attack')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${chance}%</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> \u2192 ${degreeBadge(degree)}</div>
      ${damageSection}
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: degree === 'Success' || degree === 'Critical' ? [roll] : [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

export async function addCreatureSkill(event, target) {
  event.preventDefault();
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  skills.push({ name: '', value: 0 });
  await this.actor.update({ 'system.skills': skills });
}

export async function deleteCreatureSkill(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  if (!Number.isInteger(idx)) return;
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  skills.splice(idx, 1);
  await this.actor.update({ 'system.skills': skills });
}

export async function rollCreatureSkill(event, target) {
  event.preventDefault();
  const idx = Number(target.dataset.index);
  const skill = this.actor.system.skills?.[idx];
  if (!skill) return;

  const chance = Number(skill.value) || 0;
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total);
  const degree = degreeOf(r, chance);

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${skill.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SkillCheck')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${chance}%</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> \u2192 ${degreeBadge(degree)}</div>
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Roll a creature stat as a percentile check (stat × 5).
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function rollCreatureStat(event, target) {
  event.preventDefault();
  const statKey = target.dataset.stat;
  const stat = this.actor.system.stats?.[statKey];
  if (!stat) return;

  const value = Number(stat.total ?? stat.value) || 0;
  const chance = value * 5;
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total);
  const degree = degreeOf(r, chance);

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${stat.label || statKey}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SkillCheck')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${value} × 5 = ${chance}%</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> \u2192 ${degreeBadge(degree)}</div>
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Roll the creature's damage bonus.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function rollDamageBonus(event, target) {
  event.preventDefault();
  const formula = this.actor.system.damageBonus;
  if (!formula || formula === '0' || formula === '+0') {
    ui?.notifications?.info?.('No damage bonus');
    return;
  }
  // Strip leading + for Roll parsing
  const cleanFormula = formula.startsWith('+') ? formula.slice(1) : formula;
  const roll = new Roll(cleanFormula, this.actor.getRollData());
  await roll.evaluate();
  const total = Number(roll.total);

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Actor.Creature.DamageBonus')}</h3></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Result')}:</strong> ${formula} = <span class="roll-value">${total}</span></div>
      ${damageButtons(total)}
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
