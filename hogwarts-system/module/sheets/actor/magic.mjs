/**
 * Spells and potions: casting rolls, learning, brewing and drinking a dose.
 */
import { degreeOf, degreeBadge } from '../../helpers/degrees.mjs';
import { HOGWARTS } from '../../helpers/config.mjs';
import { fougueButton, fougueGainButton } from './chat-cards.mjs';

/**
 * Roll potion skill check with malus from potion
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onRollPotion(event, target) {
  event.preventDefault();
  const itemId = target.dataset.itemId;
  const item = this.actor.items.get(itemId);
  if (!item) return;

  // Find Potions skill
  const potionsSkill = this.actor.system.skills?.find(s => s.name === 'Potions');
  if (!potionsSkill) {
    ui?.notifications?.warn?.('Compétence Potions non trouvée');
    return;
  }

  const malus = Number(item.system.malus) || 0;
  const targetValue = potionsSkill.value;
  
  // Prompt for additional modifier
  const choice = await this._promptRollModifier.call(this);
  if (!choice) return;
  const additionalMod = choice.mod;
  
  // Roll 1d100
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total) || 0;
  const stressMalus = Number(this.actor.system.stress?.value) || 0;
  // Hybrid magical weakness also hampers brewing (§17.2.1).
  const brewWeakness = Number(this.actor.system.hybridEffects?.potionMalus) || 0;
  const modifiedTarget = targetValue + malus - stressMalus - brewWeakness + additionalMod;

  // Harry Potter JdR degrees (same logic as _onRoll)
  const degree = degreeOf(r, modifiedTarget);

  // Build chat message with potion info
  const level = item.system.potionLevel || 1;
  const levelDisplay = level === 6 ? '5+' : level;
  
  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.PotionRoll')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.level.label')}:</strong> ${levelDisplay} | <strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.malus.label')}:</strong> ${malus}${stressMalus ? ` - ${game.i18n.localize('HOGWARTS.Actor.Character.Stress')}: ${stressMalus}` : ''}${additionalMod !== 0 ? ` + ${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}: ${additionalMod >= 0 ? '+' : ''}${additionalMod}` : ''}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue} → ${modifiedTarget}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>
      ${item.system.description ? `<div class="card-description">${item.system.description}</div>` : ''}
      ${(Number(this.actor.system.fougue?.value) || 0) > 0 ? fougueButton(r, modifiedTarget, this.actor.id) : ''}
      ${fougueGainButton(degree, this.actor)}
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Brew a potion: roll Potions skill with malus, on success increase quantity
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onBrewPotion(event, target) {
  event.preventDefault();
  const itemId = target.dataset.itemId;
  const item = this.actor.items.get(itemId);
  if (!item) return;

  // Check if all ingredients are available
  const ingredientList = item.system.ingredientList || [];
  if (ingredientList.length > 0 && !ingredientList.every(i => i.available)) {
    ui?.notifications?.warn?.(game.i18n.localize('HOGWARTS.Item.Potion.MissingIngredients'));
    return;
  }

  // Find Potions skill
  const potionsSkill = this.actor.system.skills?.find(s => s.name === 'Potions');
  if (!potionsSkill) {
    ui?.notifications?.warn?.('Compétence Potions non trouvée');
    return;
  }

  const malus = Number(item.system.malus) || 0;
  const targetValue = potionsSkill.value;

  // Prompt for additional modifier
  const choice = await this._promptRollModifier.call(this);
  if (!choice) return;
  const additionalMod = choice.mod;

  // Roll 1d100
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total) || 0;
  const stressMalus = Number(this.actor.system.stress?.value) || 0;
  // Hybrid magical weakness also hampers brewing (§17.2.1).
  const brewWeakness = Number(this.actor.system.hybridEffects?.potionMalus) || 0;
  const modifiedTarget = targetValue + malus - stressMalus - brewWeakness + additionalMod;

  // Determine degree of success
  const degree = degreeOf(r, modifiedTarget);

  const success = ['Critical', 'Extreme', 'Hard', 'Success'].includes(degree);

  // On success: increase quantity and consume ingredients
  let brewResult = '';
  if (success) {
    // A critical yields a « potion parfaite » (l. 12922): the book maximises the
    // potion's variable effects, it does not double the yield. Those effects are
    // published as prose, so the card states the outcome for the Gamemaster.
    const newQty = (item.system.quantity || 0) + 1;
    const updateData = { 'system.quantity': newQty, 'system.crafted': true };
    // Mark ingredients as consumed (unavailable)
    if (ingredientList.length > 0) {
      const consumed = ingredientList.map(i => ({ ...i, available: false }));
      updateData['system.ingredientList'] = consumed;
    }
    await item.update(updateData);
    const perfect = degree === 'Critical'
      ? `<div class="brew-perfect"><i class="fas fa-star"></i> ${game.i18n.localize('HOGWARTS.Item.Potion.BrewPerfect')}</div>`
      : '';
    brewResult = `<div class="brew-success"><i class="fas fa-check-circle"></i> ${game.i18n.localize('HOGWARTS.Item.Potion.BrewSuccess')}</div>${perfect}`;
  } else {
    // On failure: ingredients consumed, no potion
    if (ingredientList.length > 0) {
      const consumed = ingredientList.map(i => ({ ...i, available: false }));
      await item.update({ 'system.ingredientList': consumed });
    }
    brewResult = `<div class="brew-failure"><i class="fas fa-times-circle"></i> ${game.i18n.localize('HOGWARTS.Item.Potion.BrewFailure')}${degree === 'Fumble' ? ` — ${game.i18n.localize('HOGWARTS.Item.Potion.BrewFumble')}` : ''}</div>`;
  }

  const level = item.system.potionLevel || 1;
  const levelDisplay = level === 6 ? '5+' : level;

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${game.i18n.localize('HOGWARTS.Item.Potion.Brewing')}: ${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Brewing')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.level.label')}:</strong> ${levelDisplay} | <strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.malus.label')}:</strong> ${malus}${stressMalus ? ` - ${game.i18n.localize('HOGWARTS.Actor.Character.Stress')}: ${stressMalus}` : ''}${additionalMod !== 0 ? ` + ${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}: ${additionalMod >= 0 ? '+' : ''}${additionalMod}` : ''}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue} → ${modifiedTarget}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>
      ${brewResult}
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Use (consume) a dose of potion, decreasing quantity
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onUsePotion(event, target) {
  event.preventDefault();
  const itemId = target.dataset.itemId;
  const item = this.actor.items.get(itemId);
  if (!item) return;

  const qty = item.system.quantity || 0;
  if (qty <= 0) {
    ui?.notifications?.warn?.(game.i18n.localize('HOGWARTS.Item.Potion.NoDoses'));
    return;
  }

  await item.update({ 'system.quantity': qty - 1 });

  // Post usage to chat
  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Used')}</span></header>
      <div class="card-row"><em>${game.i18n.localize('HOGWARTS.Item.Potion.Used')}</em> (${qty - 1} ${game.i18n.localize('HOGWARTS.Item.Potion.Remaining')})</div>
      ${item.system.description ? `<div class="card-description">${item.system.description}</div>` : ''}
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Roll spell skill check based on spell type with malus
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onRollSpell(event, target) {
  event.preventDefault();
  const itemId = target.dataset.itemId;
  const item = this.actor.items.get(itemId);
  if (!item) return;

  const spellType = item.system.spellType || 'X';
  const malus = Number(item.system.malus) || 0;
  const malusExtreme = Number(item.system.malusExtremeFormula) || 0;
  const hasExtreme = item.system.extremeFormula || false;
  // Mastering the extreme formula lowers the plain spell's malus (l. 23346).
  const malusMastered = item.system.extremeMastered
    ? Number(item.system.malusMastered) || malus
    : malus;
  const isPreSchool = item.system.preSchool === true;
  // Localized, slash-joined list of target codes (supports multiple targets)
  const targetDisplay = Array.from(item.system.target ?? [])
    .map((code) => game.i18n.localize(`HOGWARTS.Item.Spell.Target.${code}`) || code)
    .join(' / ');

  // Map spell type to skill name
  const skillName = HOGWARTS.spellSkills[spellType] ?? null;

  let targetValue = 0;
  let skillDisplayName = 'Aucune compétence';
  
  // Pre-school / instinctive spells use POUvoir×3 instead of the school skill
  if (isPreSchool) {
    const pow = Number(this.actor.system.stats?.pow?.value) || 0;
    targetValue = pow * 3;
    skillDisplayName = game.i18n.localize('HOGWARTS.Stat.Pow.long') + '×3';
  } else if (!skillName) {
    // If type is X (Autres), roll against 0
    targetValue = 0;
  } else {
    // Find the skill
    const spellSkill = this.actor.system.skills?.find(s => s.name === skillName);
    if (!spellSkill) {
      ui?.notifications?.warn?.(`Compétence ${skillName} non trouvée`);
      return;
    }
    targetValue = spellSkill.value;
    skillDisplayName = skillName;
  }

  // Wand affinity bonus: +10% if wand affinity matches spell type category
  let wandAffinityBonus = 0;
  const wandAffinity = (this.actor.system.wand?.affinity || '').toLowerCase();
  if (wandAffinity && skillName) {
    const affinityMap = {
      'E': ['enchantement', 'enchantements', 'charme', 'charmes'],
      'M': ['métamorphose', 'metamorphose', 'transformation'],
      'S': ['mauvais sort', 'mauvais sorts', 'maléfice', 'malefice', 'maléfices', 'malefices', 'sortilège', 'sortilege'],
    };
    const keywords = affinityMap[spellType] || [];
    if (keywords.some(k => wandAffinity.includes(k))) {
      wandAffinityBonus = 10;
    }
  }

  // Prompt for additional modifier
  const { mod: additionalMod, wandless, wandlessPenalty, silent, useExtreme } =
    (await this._promptRollModifier.call(this, { showCasting: true, showExtreme: hasExtreme })) ?? {};
  if (additionalMod === undefined) return;
  const isExtreme = hasExtreme && useExtreme;
  const appliedMalus = isExtreme ? malusExtreme : malusMastered;
  
  // Roll 1d100
  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total) || 0;
  const stressMalus = Number(this.actor.system.stress?.value) || 0;
  // Casting without a wand or without speaking, and the hybrid magical
  // weakness, all stack with the spell's own malus (l. 23189, 23224).
  const wandlessMalus = wandless ? Number(wandlessPenalty) || 75 : 0;
  const silentMalus = silent ? 30 : 0;
  const weaknessMalus = Number(this.actor.system.hybridEffects?.spellMalus) || 0;
  const modifiedTarget = targetValue + appliedMalus + wandAffinityBonus - stressMalus
    - wandlessMalus - silentMalus - weaknessMalus + additionalMod;

  // Harry Potter JdR degrees (same logic as _onRoll)
  const degree = degreeOf(r, modifiedTarget);

  // Build chat message with spell info
  const level = item.system.spellLevel || 0;
  const levelDisplay = level === 6 ? '5+' : level;
  
  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SpellRoll')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.level.label')}:</strong> ${levelDisplay} | <strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.spellType.label')}:</strong> ${game.i18n.localize(`HOGWARTS.Item.Spell.SpellType.${spellType}`) || spellType}${targetDisplay ? ` | <strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.target.label')}:</strong> ${targetDisplay}` : ''}${item.system.incantation ? ` | <em>${item.system.incantation}</em>` : ''}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.malus.label')}:</strong> ${appliedMalus}${isExtreme ? ` (${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.extremeFormula.label')})` : ''}${wandAffinityBonus ? ` + ${game.i18n.localize('HOGWARTS.Wand.Affinity')}: +${wandAffinityBonus}` : ''}${wandlessMalus ? ` − ${game.i18n.localize('HOGWARTS.Roll.WandlessShort')}: ${wandlessMalus}` : ''}${silentMalus ? ` − ${game.i18n.localize('HOGWARTS.Roll.SilentShort')}: ${silentMalus}` : ''}${weaknessMalus ? ` − ${game.i18n.localize('HOGWARTS.Hybrid.Capability.MagicalWeakness')}: ${weaknessMalus}` : ''}${additionalMod !== 0 ? ` + ${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}: ${additionalMod >= 0 ? '+' : ''}${additionalMod}` : ''}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${skillDisplayName} ${targetValue} → ${modifiedTarget}</div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>
      ${item.system.description ? `<div class="card-description">${item.system.description}</div>` : ''}
      ${(Number(this.actor.system.fougue?.value) || 0) > 0 ? fougueButton(r, modifiedTarget, this.actor.id) : ''}
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Spell learning roll: INT×5 − spell malus.
 * Four outcomes: Critical (mastered), Success (learned w/ malus), Fail (known
 * but unpredictable effects), Fumble (psychological block — teacher required).
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onLearnSpell(event, target) {
  event.preventDefault();
  const itemId = target.dataset.itemId;
  const item = this.actor.items.get(itemId);
  if (!item) return;

  const int = Number(this.actor.system.stats?.int?.value) || 0;
  const malus = Number(item.system.malus) || 0;
  const baseTarget = int * 5 + malus; // malus is negative, so addition reduces target

  const roll = new Roll('1d100', this.actor.getRollData());
  await roll.evaluate();
  const r = Number(roll.total) || 0;

  // Learning a spell has exactly four printed outcomes (l. 23115), so the
  // optional Extreme/Hard tiers must not apply here. 96-00 still misses
  // unconditionally, hence the order (l. 960).
  let degree;
  if (r <= 5) degree = 'Critical';
  else if (r >= 96) degree = 'Fumble';
  else if (r <= baseTarget) degree = 'Success';
  else degree = 'Fail';

  const resultText = game.i18n.localize(`HOGWARTS.Roll.Learn.${degree}`);

  const content = `
    <div class="hogwarts-chat-card">
      <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.Learn.Title')}</span></header>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Roll.Learn.Roll')}:</strong> INT(${int})×5 + malus(${malus}) = <strong>${baseTarget}</strong></div>
      <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${degreeBadge(degree)}</div>
      <div class="card-row">${resultText}</div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
