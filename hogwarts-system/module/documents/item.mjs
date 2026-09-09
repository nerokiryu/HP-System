/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class HogwartsItem extends Item {
  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(event) {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');

    // Build detailed content based on item type
    let content = `<div class="hogwarts-chat-card">`;
    content += `<header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize(`TYPES.Item.${item.type}`)}</span></header>`;
    
    // Add type-specific information
    switch (item.type) {
      case 'gear':
        const gearInfos = [];
        if (item.system.cost) {
          const costs = [];
          if (item.system.cost.galleons > 0) costs.push(`${item.system.cost.galleons} ${game.i18n.localize('HOGWARTS.Currency.Galleons')}`);
          if (item.system.cost.sickles > 0) costs.push(`${item.system.cost.sickles} ${game.i18n.localize('HOGWARTS.Currency.Sickles')}`);
          if (item.system.cost.knuts > 0) costs.push(`${item.system.cost.knuts} ${game.i18n.localize('HOGWARTS.Currency.Knuts')}`);
          if (costs.length > 0) {
            gearInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Cost')}:</strong> ${costs.join(', ')}`);
          }
        }
        if (item.system.weight > 0) {
          gearInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Weight')}:</strong> ${item.system.weight}`);
        }
        if (item.system.quantity > 0) {
          gearInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Quantity')}:</strong> ${item.system.quantity}`);
        }
        if (item.system.pbpCost !== undefined && item.system.pbpCost !== 0) {
          gearInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.PBPCost')}:</strong> ${item.system.pbpCost}`);
        }
        if (gearInfos.length > 0) {
          content += `<div class="card-row">${gearInfos.join(' | ')}</div>`;
        }
        break;
        
      case 'feature':
        const infos = [];
        if (item.system.perkType) {
          const typeLabel = game.i18n.localize(`HOGWARTS.Item.Feature.PerkType.${item.system.perkType}`);
          infos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Type')}:</strong> ${typeLabel}`);
        }
        if (item.system.pbpCost !== undefined && item.system.pbpCost !== 0) {
          infos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.PBPCost')}:</strong> ${item.system.pbpCost}`);
        }
        if (infos.length > 0) {
          content += `<div class="card-row">${infos.join(' | ')}</div>`;
        }
        break;
        
      case 'spell':
        const spellInfos = [];
        if (item.system.spellLevel !== undefined) {
          spellInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Level')}:</strong> ${item.system.spellLevel}`);
        }
        if (item.system.malus !== undefined) {
          spellInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Malus')}:</strong> ${item.system.malus}`);
        }
        if (spellInfos.length > 0) {
          content += `<div class="card-row">${spellInfos.join(' | ')}</div>`;
        }
        break;
        
      case 'potion':
        if (item.system.malus !== undefined) {
          content += `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Malus')}:</strong> ${item.system.malus}</div>`;
        }
        break;
        
      case 'broom':
        const broomInfos = [];
        if (item.system.brand) {
          broomInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.Brand')}:</strong> ${item.system.brand}`);
        }
        if (item.system.pbpCost !== undefined && item.system.pbpCost !== 0) {
          broomInfos.push(`<strong>${game.i18n.localize('HOGWARTS.Chat.PBPCost')}:</strong> ${item.system.pbpCost}`);
        }
        if (broomInfos.length > 0) {
          content += `<div class="card-row">${broomInfos.join(' | ')}</div>`;
        }
        if (item.system.characteristics) {
          content += `<div class="card-row"><em>${item.system.characteristics}</em></div>`;
        }
        break;
    }
    
    // Add description if present
    if (item.system.description) {
      content += `<div class="card-description">${item.system.description}</div>`;
    }
    
    // Add active effects if any
    if (item.effects.size > 0) {
      content += `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Effects')}:</strong><ul>`;
      for (const effect of item.effects) {
        const icon = effect.disabled ? '⊘' : '✓';
        content += `<li>${icon} ${effect.name}</li>`;
      }
      content += `</ul></div>`;
    }
    
    content += `</div>`;

    // Send to chat
    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      content: content,
    });
  }
}
