import { prepareActiveEffectCategories, prepareEffectAttributes } from '../helpers/effects.mjs';

const { api, sheets } = foundry.applications;

/* ─── Chat Card Helpers ─────────────────────────────────────────────────── */

/**
 * Build a degree-of-success badge HTML span.
 * @param {string} degree - One of: Critical, Extreme, Hard, Success, Fail, Fumble
 * @returns {string} HTML string
 */
function _degreeBadge(degree) {
  const label = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
  const cls = degree.toLowerCase();
  return `<span class="degree ${cls}">${label}</span>`;
}

/**
 * Success degree for a d100 result (Chap. 1.3): critical on 01-05, fumble on
 * 96-00. The Extreme/Hard tiers are an optional BRP import, off by default.
 * @param {number} roll
 * @param {number} target
 * @returns {string}
 */
function _degreeOf(roll, target) {
  const extended = game.settings.get('hogwarts-system', 'useExtendedSuccessTiers') ?? false;
  if (roll <= 5) return 'Critical';
  if (extended && roll <= Math.ceil(target / 5)) return 'Extreme';
  if (extended && roll <= Math.ceil(target / 2)) return 'Hard';
  if (roll <= target) return 'Success';
  if (roll >= 96) return 'Fumble';
  return 'Fail';
}

/**
 * Build Apply Damage / Apply Healing button HTML.
 * @param {number} value - Numeric damage/healing value
 * @returns {string} HTML string for the card-buttons section
 */
function _damageButtons(value) {
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
 * @param {number} rollValue - The original d100 result
 * @param {number} targetValue - The target number to beat
 * @param {string} actorId - The actor's ID (to spend their fougue point)
 * @returns {string} HTML string
 */
function _fougueButton(rollValue, targetValue, actorId) {
  if (!rollValue || !actorId) return '';
  const label = game.i18n.localize('HOGWARTS.Chat.UseFougue');
  return `
    <div class="card-buttons">
      <button class="use-fougue" data-action="use-fougue" data-roll="${rollValue}" data-target="${targetValue}" data-actor-id="${actorId}"><i class="fas fa-dice"></i> ${label}</button>
    </div>`;
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class HogwartsActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['hogwarts-system', 'actor'],
    position: {
      width: 680,
      height: 800,
    },
    window: {
      resizable: true,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      createFamiliar: this._createFamiliar,
      viewLinkedFamiliar: this._viewLinkedFamiliar,
      unlinkFamiliar: this._unlinkFamiliar,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      copyEffectKey: this._copyEffectKey,
      roll: this._onRoll,
      rollInitiative: this._rollInitiative,
      rollDamage: this._onRollDamage,
      rollPotion: this._onRollPotion,
      rollSpell: this._onRollSpell,
      learnSpell: this._onLearnSpell,
      brewPotion: this._onBrewPotion,
      usePotion: this._onUsePotion,
      rollOpposition: this._onRollOpposition,
      resolveXP: this._onResolveXP,
      schoolTermXP: this._onSchoolTermXP,
      yearEndXP: this._onYearEndXP,
      holidayXP: this._onHolidayXP,
      spendPool: this._onSpendPool,
      addSkill: this._addSkill,
      deleteSkill: this._deleteSkill,
      toggleSkillMaxAuto: this._toggleSkillMaxAuto,
      restRecovery: this._onRestRecovery,
      rollDodge: this._onRollDodge,
      rollParry: this._onRollParry,
      addFamilyMember: this._addFamilyMember,
      deleteFamilyMember: this._deleteFamilyMember,
      toggleBioSection: this._toggleBioSection,
      toggleSkillCategory: this._toggleSkillCategory,
      toggleSettingsSection: this._toggleSettingsSection,
      toggleCreatureSection: this._toggleCreatureSection,
      addAttack: this._addAttack,
      deleteAttack: this._deleteAttack,
      rollAttack: this._rollAttack,
      addCreatureSkill: this._addCreatureSkill,
      deleteCreatureSkill: this._deleteCreatureSkill,
      rollCreatureSkill: this._rollCreatureSkill,
      rollCreatureStat: this._rollCreatureStat,
      rollDamageBonus: this._rollDamageBonus,
    },
    // Custom property that's merged into `this.options`
    // dragDrop: [{ dragSelector: '.draggable', dropSelector: null }],
    form: {
      submitOnChange: true,
      handler: HogwartsActorSheet.#onSubmitActorForm,
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/hogwarts-system/templates/actor/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    skills: {
      template: 'systems/hogwarts-system/templates/actor/skills.hbs',
      scrollable: [""],
    },
    features: {
      template: 'systems/hogwarts-system/templates/actor/features.hbs',
      scrollable: [""],
    },
    perks: {
      template: 'systems/hogwarts-system/templates/actor/perks.hbs',
      scrollable: [""],
    },
    biography: {
      template: 'systems/hogwarts-system/templates/actor/biography.hbs',
      scrollable: [""],
    },
    gear: {
      template: 'systems/hogwarts-system/templates/actor/gear.hbs',
      scrollable: [""],
    },
    spells: {
      template: 'systems/hogwarts-system/templates/actor/spells.hbs',
      scrollable: [""],
    },
    potions: {
      template: 'systems/hogwarts-system/templates/actor/potions.hbs',
      scrollable: [""],
    },
    familiar: {
      template: 'systems/hogwarts-system/templates/actor/familiar.hbs',
      scrollable: [""],
    },
    settings: {
      template: 'systems/hogwarts-system/templates/actor/settings.hbs',
      scrollable: [""],
    },
    creature: {
      template: 'systems/hogwarts-system/templates/actor/creature.hbs',
      scrollable: [""],
    },
  };
  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ['header', 'tabs'];
    // Creatures don't have a biography tab
    if (this.document.type !== 'creature') {
      options.parts.push('biography');
    }
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'character':
        options.parts.push('skills', 'features', 'perks', 'gear', 'spells', 'potions', 'familiar', 'settings');
        break;
      case 'npc':
        options.parts.push('gear', 'settings');
        break;
      case 'familiar':
        options.parts.push('features', 'perks', 'skills', 'settings');
        break;
      case 'creature':
        options.parts.push('creature', 'settings');
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.HOGWARTS
      config: CONFIG.HOGWARTS,
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      // Check if user is GM
      isGM: game.user.isGM,
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /**
   * Options for the ancestry pickers (Chap. 17). Generations a race cannot take
   * are dropped rather than disabled, so an invalid pair cannot be selected.
   */
  _prepareHybridContext() {
    const H = CONFIG.HOGWARTS;
    const { race, generation, pickBonus, pickMalus, pickCapability, yumboe } = this.actor.system.hybrid ?? {};
    const table = H.hybridStatAdjustments?.[race];

    const generations = Object.entries(H.hybridGenerations)
      .filter(([key]) => !race || table?.[key])
      .map(([key, g]) => ({
        key,
        label: `${game.i18n.localize(g.label)} (${g.symbol})`,
        cost: g.cost,
        selected: key === generation,
      }));

    const adjustments = table?.[generation] ?? null;
    const statLabel = (k) => game.i18n.localize(H.statAbbreviations?.[k] ?? H.stats[k] ?? k);
    const asOptions = (entries, chosen) => Object.entries(entries ?? {})
      .map(([stat, delta]) => ({ stat, label: `${statLabel(stat)} ${delta > 0 ? '+' : ''}${delta}`, selected: stat === chosen }));

    const capabilities = H.hybridCapabilities?.[race]?.[generation] ?? [];
    const choice = capabilities.find((c) => c.choose);

    return {
      races: Object.entries(H.hybridRaces).map(([key, label]) => ({ key, label: game.i18n.localize(label), selected: key === race })),
      generations,
      cost: H.hybridGenerations?.[generation]?.cost ?? 0,
      bonusChoices: asOptions(adjustments?.pick?.bonus, pickBonus),
      malusChoices: asOptions(adjustments?.pick?.malus, pickMalus),
      capabilityChoices: (choice?.options ?? []).map((option) => ({ option, selected: option === pickCapability })),
      offersYumboe: capabilities.some((c) => c.key === 'Yumboe'),
      yumboe,
      capabilities: capabilities.map((c) => ({
        label: game.i18n.localize(`HOGWARTS.Hybrid.Capability.${c.key}`),
        note: c.note,
      })),
    };
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'skills':
        context.tab = context.tabs[partId];
        // Group skills by category with their index for input names
        const grouped = { general: [], wizard: [], muggle: [], school: [], special: [] };
        (context.system.skills ?? []).forEach((s, idx) => {
          const cat = ['general','wizard','muggle','school','special'].includes(s.category) ? s.category : 'general';
          grouped[cat].push({ index: idx, entry: s });
        });
        context.skillsByCategory = grouped;
        if (this.actor.type === 'character') {
          const year = Number(this.actor.system.profile?.year) || 1;
          const p = this.actor.system.experience?.school ?? {};
          const done = p.year === year ? Number(p.periods) || 0 : 0;
          context.schoolProgress = year === 1 && !p.firstWeek ? '—' : `${done}/3`;
        }
        break;
      case 'features':
        context.tab = context.tabs[partId];
        if (this.actor.type === 'character') context.hybrid = this._prepareHybridContext();
        // Compute total PBP cost across all owned items for display in familiar sheets
        try {
          const total = (this.document.items || []).reduce((acc, it) => {
            const v = Number(it?.system?.pbpCost ?? 0) || 0;
            return acc + v;
          }, 0);
          context.totalPbpCost = total;
        } catch (e) {
          context.totalPbpCost = 0;
        }
        // If this is a character, compute the personal bonus current as max minus total costs
        try {
          if (this.document.type === 'character') {
            const ownItemsTotal = (this.document.items || []).reduce((acc, it) => acc + (Number(it?.system?.pbpCost ?? 0) || 0), 0);
            const wandCost = Number(this.actor.system?.wand?.pbpCost ?? 0) || 0;
            let linkedFamiliarCost = 0;
            try {
              const linkedId = this.actor.system?.familiar?.linkedActor;
              if (linkedId) {
                const fam = game.actors.get(linkedId);
                if (fam) {
                  linkedFamiliarCost = (fam.items || []).reduce((a, it) => a + (Number(it?.system?.pbpCost ?? 0) || 0), 0) + (Number(fam.system?.wand?.pbpCost ?? 0) || 0);
                }
              }
            } catch (e) {
              linkedFamiliarCost = 0;
            }
            const totalCost = ownItemsTotal + wandCost + linkedFamiliarCost;
            const maxPbp = Number(this.actor.system?.experience?.personalBonusPoints?.max ?? 0) || 0;
            const otherSchoolBonus = this.actor.system?.options?.otherSchool ? 1 : 0;
            // 'Other School' grants +1 to the currently available PBPs (not to max)
            const pbCurrent = (maxPbp - totalCost + otherSchoolBonus);
            context.personalBonusCurrent = pbCurrent;
            context.personalBonusCurrentDefined = true;
            context.personalBonusCurrentNegative = Number(pbCurrent) < 0;
            // Notify the user once per sheet session when values become negative
            try {
              if (!this._negativeNotified) this._negativeNotified = { creation: false, personal: false };
              const warnEnabled = !!(game?.settings?.get?.('hogwarts-system', 'warnOnNegativeExperience'));
              if (warnEnabled && context.personalBonusCurrentNegative && !this._negativeNotified.personal) {
                ui?.notifications?.warn?.(game.i18n?.localize?.('HOGWARTS.Notifications.PersonalBonusNegative') || 'Attention : Points de bonus personnel en négatif');
                this._negativeNotified.personal = true;
              } else if (!context.personalBonusCurrentNegative) {
                this._negativeNotified.personal = false;
              }
            } catch (e) { /* ignore notification errors */ }
            context.personalBonusTotalCost = totalCost;

            // Compute creation points current (max - spent) for display and negative alert
            const creationMax = Number(this.actor.system?.experience?.creationPoints?.max ?? 0) || 0;
            const creationSpent = Number(this.actor.system?.experience?.creationPoints?.spent ?? 0) || 0;
            const creationCurrent = creationMax - creationSpent;
            context.creationPointsCurrent = creationCurrent;
            context.creationPointsCurrentDefined = true;
            context.creationPointsCurrentNegative = Number(creationCurrent) < 0;
            try {
              if (!this._negativeNotified) this._negativeNotified = { creation: false, personal: false };
              const warnEnabled = !!(game?.settings?.get?.('hogwarts-system', 'warnOnNegativeExperience'));
              if (warnEnabled && context.creationPointsCurrentNegative && !this._negativeNotified.creation) {
                ui?.notifications?.warn?.(game.i18n?.localize?.('HOGWARTS.Notifications.CreationPointsNegative') || 'Attention : Points de création en négatif');
                this._negativeNotified.creation = true;
              } else if (!context.creationPointsCurrentNegative) {
                this._negativeNotified.creation = false;
              }
            } catch (e) { /* ignore notification errors */ }
          }
        } catch (e) {
          context.personalBonusCurrent = undefined;
          context.personalBonusTotalCost = 0;
        }
        break;
      case 'perks':
      case 'spells':
      case 'potions':
      case 'gear':
        context.tab = context.tabs[partId];
        break;
      case 'biography':
        context.tab = context.tabs[partId];
        // Enrich biography fields for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedMotivation = await foundry.applications.ux.TextEditor.enrichHTML(
          this.actor.system.bio?.motivation || '',
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );
        context.enrichedHistory = await foundry.applications.ux.TextEditor.enrichHTML(
          this.actor.system.bio?.history || '',
          {
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor,
          }
        );
        context.enrichedRpNotes = await foundry.applications.ux.TextEditor.enrichHTML(
          this.actor.system.notes?.rpNotes || '',
          {
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor,
          }
        );
        context.enrichedGmNotes = await foundry.applications.ux.TextEditor.enrichHTML(
          this.actor.system.notes?.gmNotes || '',
          {
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor,
          }
        );
        break;
      case 'familiar':
        context.tab = context.tabs[partId];
        // Expose any linked familiar Actor for the template
        try {
          const linked = game.actors.get(this.actor.system?.familiar?.linkedActor);
          context.linkedFamiliar = linked ?? null;
          if (linked) {
            // sum pbpCost across the linked actor's items
            try {
              const total = (linked.items || []).reduce((acc, it) => {
                const v = Number(it?.system?.pbpCost ?? 0) || 0;
                return acc + v;
              }, 0);
              context.linkedFamiliarTotalPbp = total;
            } catch (e) {
              context.linkedFamiliarTotalPbp = 0;
            }
          } else context.linkedFamiliarTotalPbp = 0;
        } catch (e) {
          context.linkedFamiliar = null;
          context.linkedFamiliarTotalPbp = 0;
        }
        break;
      case 'settings':
        context.tab = context.tabs[partId];
        // Prepare active effects
        context.effects = prepareActiveEffectCategories(
          // A generator that returns all effects stored on the actor
          // as well as any items
          this.actor.allApplicableEffects()
        );
        // Reference list of effect-targetable attribute keys + current values
        context.effectAttributes = prepareEffectAttributes(this.actor);
        break;
      case 'creature':
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) {
      this.tabGroups[tabGroup] = this.document.type === 'creature' ? 'creature' : 'biography';
    }
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'HOGWARTS.Actor.Tabs.',
      };
      // Check user preference for icons vs text labels (client setting)
      let useIcons = true;
      try { useIcons = Boolean(game?.settings?.get?.('hogwarts-system', 'tabsUseIcons')) ?? true; } catch (e) { useIcons = true; }
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'biography':
          tab.id = 'biography';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-book'; }
          else { tab.label += 'Biography'; tab.icon = ''; }
          break;
        case 'skills':
          tab.id = 'skills';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-star'; }
          else { tab.label += 'Skills'; tab.icon = ''; }
          break;
        case 'features':
          tab.id = 'features';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-user'; }
          else { tab.label += 'Features'; tab.icon = ''; }
          break;
        case 'perks':
          tab.id = 'perks';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-award'; }
          else { tab.label += 'Perks'; tab.icon = ''; }
          break;
        case 'gear':
          tab.id = 'gear';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-suitcase'; }
          else { tab.label += 'Gear'; tab.icon = ''; }
          break;
        case 'spells':
          tab.id = 'spells';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-book-open'; }
          else { tab.label += 'Spells'; tab.icon = ''; }
          break;
        case 'potions':
          tab.id = 'potions';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-flask'; }
          else { tab.label += 'Potions'; tab.icon = ''; }
          break;
        case 'familiar':
          tab.id = 'familiar';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-paw'; }
          else { tab.label += 'Familiar'; tab.icon = ''; }
          break;
        case 'creature':
          tab.id = 'creature';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-dragon'; }
          else { tab.label += 'Creature'; tab.icon = ''; }
          break;
        case 'settings':
          tab.id = 'settings';
          tab.label = ''; // Pas de label, uniquement l'icône
          tab.icon = 'fas fa-cog';
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    // You can just use `this.document.itemTypes` instead
    // if you don't need to subdivide a given type like
    // this sheet does with spells
    const gear = [];
    const brooms = [];
    const features = [];
    const perks = this.document.type === 'familiar'
      ? { naturalAbilities: [], specialAbilities: [] }
      : {
          fateBoon: [],
          fateBane: [],
          advantages: [],
          disadvantages: [],
          houseAxioms: []
        };
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    const potions = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      // Append to gear.
      if (i.type === 'gear' || i.type === 'weapon' || i.type === 'armor') {
        gear.push(i);
      }
      // Append to brooms.
      else if (i.type === 'broom') {
        brooms.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        const perkType = i.system.perkType || '';
        if (this.document.type === 'familiar') {
          // For familiars, separate Natural / Special abilities
          if (perkType === 'abilityNatural' || perkType === 'ability' || !perkType) {
            // formerly 'ability' -> consider natural by default
            perks.naturalAbilities.push(i);
          } else if (perkType === 'abilitySpecial') {
            perks.specialAbilities.push(i);
          } else {
            features.push(i);
          }
        } else {
          // For characters, standard categorization
          if (perkType === 'fateBoon') {
            perks.fateBoon.push(i);
          } else if (perkType === 'fateBane') {
            perks.fateBane.push(i);
          } else if (perkType === 'advantage') {
            perks.advantages.push(i);
          } else if (perkType === 'disadvantage') {
            perks.disadvantages.push(i);
          } else if (perkType === 'houseAxiom') {
            // House Axioms are a special category of advantages tied to the actor's house
            perks.houseAxioms.push(i);
          } else {
            features.push(i);
          }
        }
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
      // Append to potions.
      else if (i.type === 'potion') {
        if (i.system.potionLevel != undefined) {
          potions[i.system.potionLevel].push(i);
        }
      }
    }

    for (const s of Object.values(spells)) {
      s.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }
    for (const p of Object.values(potions)) {
      p.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    // Sort then assign
    context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.brooms = brooms.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.features = features.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    // Perks handling differs between familiar and character
    if (this.document.type === 'familiar') {
      context.perks = {
        naturalAbilities: (perks.naturalAbilities || []).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        specialAbilities: (perks.specialAbilities || []).sort((a, b) => (a.sort || 0) - (b.sort || 0))
      };
    } else {
      context.perks = {
        fateBoon: perks.fateBoon.sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        fateBane: perks.fateBane.sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        advantages: perks.advantages.sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        disadvantages: perks.disadvantages.sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        houseAxioms: (perks.houseAxioms || []).sort((a, b) => (a.sort || 0) - (b.sort || 0))
      };
    }
    
    context.spells = spells;
    context.potions = potions;
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#disableOverrides();
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.

    // Clamp spent inputs on-the-fly and warn when exceeding (max - base)
    const root = this.element;
    // Add a house-specific class to the sheet root so CSS variables for the house apply
    try {
      // Support per-actor override stored in flags.hogwarts-system.forceHouse.
      const flagHouse = this.actor?.flags?.['hogwarts-system']?.forceHouse;
      const resolved = flagHouse ? String(flagHouse) : (this.actor?.system?.profile?.house || this.actor?.profile?.house || '');
      const house = String(resolved).toLowerCase().replace(/\s+/g, '-');
      if (house) {
        // remove any previously applied house- classes
        Array.from(root.classList).forEach(c => { if (c.startsWith('house-')) root.classList.remove(c); });
        root.classList.add(`house-${house}`);
      }
    } catch (e) { /* ignore */ }
    const spentInputs = root.querySelectorAll("input[name^='system.skills.'][name$='.spent']");
    const clampHandler = (ev) => {
      const el = ev.currentTarget;
      const name = el.name || '';
      const m = name.match(/^system\.skills\.(\d+)\.spent$/);
      if (!m) return;
      const idx = m[1];
      const baseInput = root.querySelector(`input[name="system.skills.${idx}.base"]`);
      const maxInput = root.querySelector(`input[name="system.skills.${idx}.max"]`);
      const b = Number(baseInput?.value) || 0;
      // For school subjects, max is rendered as text (no input), so fall back to the spent input's own max attribute (already = max - base)
      let limit;
      if (maxInput) {
        const mx = Number(maxInput.value) || 0;
        limit = Math.max(0, mx - b);
      } else {
        limit = Number(el.getAttribute('max')) || 0;
      }
      let v = Number(el.value);
      if (!Number.isFinite(v)) v = 0;
      if (v > limit) {
        el.value = String(limit);
        ui?.notifications?.warn?.(game.i18n.localize('HOGWARTS.Skills.SpentExceeded'));
      }
      if (v < 0) el.value = '0';
    };
    spentInputs.forEach((el) => {
      el.addEventListener('input', clampHandler);
      el.addEventListener('change', clampHandler);
    });
    
    // Attach lightweight drag feedback to any configured drop target containers.
    try {
      const rootEl = this.element;
      if (rootEl) {
        const targets = rootEl.querySelectorAll('.item-drop-target');
        for (const t of Array.from(targets)) {
          if (t.dataset.hogwartsDropAttached) continue;
          const onEnter = (ev) => { ev.preventDefault(); t.classList.add('drag-over'); };
          const onOver = (ev) => { ev.preventDefault(); };
          const onLeave = (ev) => { t.classList.remove('drag-over'); };
          const onDropLocal = (ev) => { t.classList.remove('drag-over'); /* allow _onDrop to process */ };
          t.addEventListener('dragenter', onEnter);
          t.addEventListener('dragover', onOver);
          t.addEventListener('dragleave', onLeave);
          t.addEventListener('drop', onDropLocal);
          t.dataset.hogwartsDropAttached = '1';
        }
      }
    } catch (e) {
      console.warn('[hogwarts-system] attach drop listeners failed', e);
    }

    // Attach generic collapsible behavior to any h3.collapsible elements
    try {
      const rootEl = this.element;
      if (rootEl) {
        const headers = rootEl.querySelectorAll('h3.collapsible');
        for (const h of Array.from(headers)) {
          // Ensure the next sibling is marked as collapsible-content for CSS targeting
          const next = h.nextElementSibling;
          if (next && !next.classList.contains('collapsible-content')) next.classList.add('collapsible-content');
          // Initialize collapsed state if content is currently hidden
          if (next && (next.style.display === 'none' || next.classList.contains('collapsed') || next.hidden)) {
            h.classList.add('collapsed');
          }
          if (h.dataset.hogwartsCollapsibleAttached) continue;
          h.addEventListener('click', (ev) => {
            try {
              const header = ev.currentTarget;
              const content = header.nextElementSibling;
              if (!content) return;
              const collapsed = header.classList.toggle('collapsed');
              if (collapsed) {
                // collapse: set max-height 0 and hide
                content.style.maxHeight = '0px';
                content.style.opacity = '0';
                content.setAttribute('aria-hidden', 'true');
              } else {
                // expand: remove inline collapse styles
                content.style.maxHeight = '';
                content.style.opacity = '';
                content.removeAttribute('aria-hidden');
              }
            } catch (err) { console.warn('collapsible toggle failed', err); }
          });
          h.dataset.hogwartsCollapsibleAttached = '1';
        }
      }
    } catch (e) { console.warn('[hogwarts-system] attach collapsible handlers failed', e); }

    // Ensure the force-house select reflects current actor flag value (if present)
    try {
      const rootEl = this.element;
      const select = rootEl.querySelector && rootEl.querySelector('#force-house-select');
      if (select) {
        const v = this.actor?.flags?.['hogwarts-system']?.forceHouse ?? '';
        select.value = v;
      }
    } catch (e) { /* ignore */ }

  }

  /**
   * Handle dropping data onto an Actor sheet (supports linking a Familiar actor).
   * @param {DragEvent} event
   * @protected
   */
  async _onDrop(event) {
    event.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    // Allow other modules to veto
    const allowed = Hooks.call('dropActorSheetData', this.actor, this, data);
    if (allowed === false) return;

    // 1) Actor drops (familiar linking) - preserve previous behavior
    if (data?.type === 'Actor' || (data?.uuid && String(data.uuid).startsWith('Actor'))) {
      try {
        let dropped = null;
        if (data.uuid) dropped = await fromUuid(data.uuid);
        else if (data.actorId || data.id || data._id) dropped = game.actors.get(data.actorId || data.id || data._id);
        if (!dropped) return;

        if (dropped.id === this.actor.id) return ui.notifications?.warn?.(game.i18n.localize('HOGWARTS.Errors.LinkSelf'));
        if (dropped.type !== 'familiar') return ui.notifications?.warn?.(game.i18n.localize('HOGWARTS.Errors.LinkFamiliar'));

        await this.document.update({ 'system.familiar.linkedActor': dropped.id });
        await dropped.setFlag('hogwarts-system', 'ownerCharacter', this.actor.id);

        // Update the familiar card quickly without a full sheet re-render
        try {
          const template = this.constructor.PARTS.familiar.template;
          const context = await this._prepareContext({});
          await this._preparePartContext('familiar', context);
          const html = await renderTemplate(template, context);
          const tmp = document.createElement('div'); tmp.innerHTML = html;
          const newCard = tmp.querySelector('.linked-familiar-card');
          const root = this.element;
          if (root) {
            try { const old = root.querySelector('.linked-familiar-card'); if (old) old.remove(); } catch (e) {}
            const container = root.querySelector('.familiar-section .section-content');
            if (container && newCard) container.insertBefore(newCard, container.firstChild);
          }
        } catch (e) { console.warn('[hogwarts-system] failed to render familiar card dynamically', e); }

        ui.notifications?.info?.(game.i18n.localize('HOGWARTS.Actor.Familiar.ViewLinked') || 'Familiar linked');
      } catch (e) {
        console.error('[hogwarts-system] _onDrop error', e);
        ui.notifications?.error?.(game.i18n.localize('HOGWARTS.Errors.LinkFailed'));
      }
      return;
    }

    // 2) ActiveEffect drop
    if (data?.type === 'ActiveEffect' || (data?.uuid && String(data.uuid).includes('ActiveEffect'))) {
      return this._onDropActiveEffect(event, data);
    }

    // 3) Folder drop (of Items)
    if (data?.type === 'Folder' || (data?.uuid && String(data.uuid).startsWith('Folder'))) {
      return this._onDropFolder(event, data);
    }

    // 4) Item drop (compendium / actor / direct item)
    if (data?.type === 'Item' || (data?.uuid && (String(data.uuid).startsWith('Compendium') || String(data.uuid).startsWith('Item')))) {
      let itemData = null;
      if (data.uuid) {
        try {
          const doc = await fromUuid(data.uuid);
          if (doc) itemData = doc.toObject ? doc.toObject() : doc;
        } catch (e) { itemData = null; }
      } else {
        itemData = data;
      }
      if (itemData) return this._onDropItemCreate(itemData, event);
    }

    // 5) Fallback
    if (super._onDrop) return super._onDrop(event);
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    try {
      event.preventDefault?.();
    } catch (e) { /* ignore */ }
    // Retrieve the configured document class for Item or ActiveEffect
    let docCls = null;
    try {
      docCls = getDocumentClass(target.dataset.documentClass);
    } catch (err) {
      console.error('[hogwarts-system] _createDoc: getDocumentClass failed', err);
      return;
    }

    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };

    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      try {
        foundry.utils.setProperty(docData, dataKey, value);
      } catch (err) {
        console.warn('[hogwarts-system] _createDoc: setProperty failed for', dataKey, value, err);
      }
    }

    // Creation data prepared; proceed to create the embedded document
    try {
      await docCls.create(docData, { parent: this.actor });
    } catch (err) {
      console.error('[hogwarts-system] _createDoc: create failed', err);
    }
  }

  /**
   * Create a new Actor of type 'familiar' and link it to this character.
   * Stores the created familiar actor id under `system.familiar.linkedActor` on the parent.
   * @this HogwartsActorSheet
   */
  static async _createFamiliar(event, target) {
    event.preventDefault();
    // Build a sensible default name
    const ownerName = this.actor.name || 'Owner';
    const famName = `${ownerName} - Familiar`;
    try {
      const fam = await Actor.create({
        name: famName,
        type: 'familiar',
        img: 'icons/creatures/birds/raptor-owl-flying-moon.webp',
        system: { familiar: {} },
      });
      // Link from parent actor into system.familiar.linkedActor
      await this.actor.update({ 'system.familiar.linkedActor': fam.id });
      // Optionally set a flag on the familiar pointing back to parent
      await fam.setFlag('hogwarts-system', 'ownerCharacter', this.actor.id);
    } catch (err) {
      console.error('Failed to create familiar', err);
      // Best-effort notification
      try { ui.notifications.error(game.i18n.localize('HOGWARTS.Errors.CreateFamiliar')); } catch (e) { console.error(e); }
    }
  }

  static async _viewLinkedFamiliar(event, target) {
    event.preventDefault();
    const id = target.dataset.id || this.actor.system?.familiar?.linkedActor;
    if (!id) return ui?.notifications?.warn?.('No linked familiar');
    const fam = game.actors.get(id);
    if (!fam) return ui?.notifications?.warn?.('Linked familiar not found');
    fam.sheet.render(true);
  }

  static async _unlinkFamiliar(event, target) {
    event.preventDefault();
    // Prevent parent click handlers (e.g. the card view action) from firing
    try { event.stopPropagation?.(); event.stopImmediatePropagation?.(); } catch(e) {}

    // Unlink invoked. Minimal logging left for errors only.

    try {
      const linked = this.actor.system?.familiar?.linkedActor;
      if (!linked) {
        return;
      }

      // Remove link on parent (update the Document to persist). Use empty string rather than null
      // because StringField may ignore null values; empty string is valid for blankable fields.
      await this.document.update({ 'system.familiar.linkedActor': '' });


      // Remove back-reference flag on familiar if present
      try {
        const fam = game.actors.get(linked);
        if (fam) await fam.unsetFlag('hogwarts-system', 'ownerCharacter');
      } catch (e) {
        console.error('[hogwarts-system] _unlinkFamiliar: error unsetting flag on familiar', e);
      }

      // Immediately remove the linked familiar card / controls from the DOM so the UI
      // reflects the unlink action without forcing a full re-render (avoids ProseMirror races).
      try {
        const root = this.element;
        if (root) {
          const card = root.querySelector && root.querySelector('.linked-familiar-card');
          if (card) card.remove();
          // Remove any action buttons in the familiar-actions block
          const actions = root.querySelectorAll && root.querySelectorAll('.form-group.familiar-actions a[data-action="viewLinkedFamiliar"], .form-group.familiar-actions a[data-action="unlinkFamiliar"]');
          if (actions && actions.length) {
            actions.forEach(a => a.remove());
          }
        }
      } catch (e) {
        /* ignore DOM cleanup errors */
      }

      // Let Foundry propagate the actor update naturally; do not force render (avoids ProseMirror races)
    } catch (err) {
      console.error('[hogwarts-system] _unlinkFamiliar: failed to unlink familiar', err);
    }
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Copy an effect attribute key to the clipboard so it can be pasted into an
   * Active Effect's "Attribute Key" field.
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _copyEffectKey(event, target) {
    event.preventDefault();
    const key = target.dataset.key;
    if (!key) return;
    await game.clipboard.copyPlainText(key);
    ui?.notifications?.info?.(
      game.i18n.format('HOGWARTS.Effect.KeyCopied', { key })
    );
  }

  /**
   * Handle clickable rolls.
   *
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
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
      const { mod, useFougue } = await this._promptRollModifier.call(this, { showFougue: isPercentile });
      let formula = String(dataset.roll);
      const labelBase = dataset.label ? `${dataset.label}` : '';

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

        // Fougue dice-reversal: reverse the tens and units digits of the d100 result
        let fougueUsed = false;
        if (useFougue && r > 0) {
          const reversed = HogwartsActorSheet._reverseDice(r);
          if (reversed !== r) {
            r = reversed;
            fougueUsed = true;
          }
        }

        // Harry Potter JdR degrees: Critical (01-05), Success (<= target), Fail (> target), Fumble (96-00)
        // Optional BRP extended tiers (Extreme/Hard) enabled via game setting.
        const degree = _degreeOf(r, targetValue);

        const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
        const modText = mod ? ` (mod ${mod >= 0 ? '+' : ''}${mod})` : '';
        const fougueText = fougueUsed ? `<span class="fougue-tag">${game.i18n.localize('HOGWARTS.Roll.FougueReversed')}</span>` : '';
        const fougueBtn = (!fougueUsed && (Number(this.actor.system.fougue?.value) || 0) > 0) ? _fougueButton(r, targetValue, this.actor.id) : '';
        const content = `
          <div class="hogwarts-chat-card">
            <header class="card-header"><h3>${labelBase}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SkillCheck')}</span></header>
            <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue}${modText}</div>
            <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span>${fougueText} → ${_degreeBadge(degree)}</div>
            ${fougueBtn}
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
          ${_damageButtons(Number(roll.total))}
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
   * Reverse the digits of a d100 result (e.g. 73 → 37, 80 → 08, 05 → 50).
   * @param {number} value - The d100 result (1-100)
   * @returns {number} The reversed value
   */
  static _reverseDice(value) {
    if (value === 100) return 1; // 00 → 01
    const str = String(value).padStart(2, '0');
    const reversed = parseInt(str.split('').reverse().join(''), 10);
    return reversed || 1; // Minimum 1
  }

  /**
   * Handle clickable damage bonus rolls.
   * @this HogwartsActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _onRollDamage(event, target) {
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
        ${_damageButtons(total)}
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
  static async _rollInitiative(event, target) {
    event.preventDefault?.();
    try { event.stopPropagation?.(); } catch (e) {}

    const actor = this.actor;
    if (!actor) return;

    // Get dexterity value from actor data (fallback to 0)
    const dex = Number(actor.system?.stats?.dex?.value) || 0;

    // Prompt for an optional bonus/penalty to the initiative roll
    const { mod } = await this._promptRollModifier.call(this);

    // Build the roll formula (1d6 plus optional modifier)
    let rollFormula = '1d6';
    if (Number.isFinite(mod) && mod !== 0) {
      rollFormula += (mod >= 0) ? ` + ${mod}` : ` - ${Math.abs(mod)}`;
    }

    // Evaluate the roll
    const roll = new Roll(rollFormula, actor.getRollData());
    await roll.evaluate();

    const rollTotal = Number(roll.total) || 0;
    const total = rollTotal + dex;

    // Build a chat card with details
    const content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Chat.Initiative')}</h3><span class="card-type">1d6 + DEX</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> ${rollFormula} = ${rollTotal}</div>
        <div class="card-row"><strong>DEX:</strong> ${dex}</div>
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
   * Prompt a simple dialog to get a numeric roll modifier from the user.
   * Optionally includes a fougue checkbox if the actor has fougue points.
   * Returns { mod: number, useFougue: boolean }.
   */
  async _promptRollModifier({ showFougue = false, showDifficulty = false, showAssistance = false, showCasting = false, showExtreme = false } = {}) {
    const title = game.i18n.localize('HOGWARTS.Roll.ModifierTitle');
    const label = game.i18n.localize('HOGWARTS.Roll.ModifierLabel');
    const fougueAvailable = showFougue && Number(this.actor.system?.fougue?.value) > 0;
    const fougueHtml = fougueAvailable
      ? `<div class="form-group"><label>${game.i18n.localize('HOGWARTS.Roll.UseFougue')}</label><input type="checkbox" name="useFougue" /></div>`
      : '';
    // Wandless casting is -75%, less any hybrid reduction (l. 23189, §17.2).
    const wandlessPenalty = 75 - (Number(this.actor.system?.hybridEffects?.wandless) || 0);
    const castingHtml = showCasting ? `
      <div class="form-group">
        <label>${game.i18n.format('HOGWARTS.Roll.Wandless', { malus: wandlessPenalty })}</label>
        <input type="checkbox" name="wandless" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize('HOGWARTS.Roll.Silent')}</label>
        <input type="checkbox" name="silent" />
      </div>` : '';
    // Only offered when the spell actually has an extreme version (§12.3).
    const extremeHtml = showExtreme ? `
      <div class="form-group">
        <label>${game.i18n.localize('HOGWARTS.Roll.UseExtreme')}</label>
        <input type="checkbox" name="useExtreme" />
      </div>` : '';
    const difficultyHtml = showDifficulty ? `
      <div class="form-group">
        <label>${game.i18n.localize('HOGWARTS.Roll.Difficulty.Label')}</label>
        <select name="difficulty">
          <option value="25">${game.i18n.localize('HOGWARTS.Roll.Difficulty.Easy')}</option>
          <option value="0" selected>${game.i18n.localize('HOGWARTS.Roll.Difficulty.Normal')}</option>
          <option value="-10">${game.i18n.localize('HOGWARTS.Roll.Difficulty.Hard')}</option>
          <option value="-25">${game.i18n.localize('HOGWARTS.Roll.Difficulty.VeryHard')}</option>
          <option value="-50">${game.i18n.localize('HOGWARTS.Roll.Difficulty.Extreme')}</option>
        </select>
      </div>` : '';
    const assistanceHtml = showAssistance ? `
      <div class="form-group">
        <label>${game.i18n.localize('HOGWARTS.Roll.Assistance.Label')}</label>
        <select name="assistance">
          <option value="0" selected>${game.i18n.localize('HOGWARTS.Roll.Assistance.None')}</option>
          <option value="10">${game.i18n.localize('HOGWARTS.Roll.Assistance.Minor')}</option>
          <option value="25">${game.i18n.localize('HOGWARTS.Roll.Assistance.Major')}</option>
        </select>
      </div>` : '';
    const content = `
      <form>
        <div class="form-group">
          <label>${label}</label>
          <input type="number" name="modifier" value="0" step="1"/>
        </div>
        ${difficultyHtml}
        ${assistanceHtml}
        ${castingHtml}
        ${extremeHtml}
        ${fougueHtml}
      </form>`;
    
    return foundry.applications.api.DialogV2.prompt({
      window: { title },
      content,
      ok: {
        label: game.i18n.localize('OK'),
        callback: (event, button, dialog) => {
          const form = button.form;
          const val = Number(form.elements.modifier.value);
          const diffVal = showDifficulty ? Number(form.elements.difficulty?.value ?? 0) : 0;
          const assistVal = showAssistance ? Number(form.elements.assistance?.value ?? 0) : 0;
          const useFougue = fougueAvailable && form.elements.useFougue?.checked;
          const wandless = showCasting && form.elements.wandless?.checked;
          const silent = showCasting && form.elements.silent?.checked;
          const useExtreme = showExtreme && form.elements.useExtreme?.checked;
          return {
            mod: (Number.isFinite(val) ? val : 0) + diffVal + assistVal,
            useFougue: !!useFougue,
            wandless: !!wandless,
            wandlessPenalty,
            silent: !!silent,
            useExtreme: !!useExtreme,
          };
        },
      },
      rejectClose: false,
      modal: true,
    }).then(result => result ?? { mod: 0, useFougue: false }).catch(() => ({ mod: 0, useFougue: false }));
  }

  /**
   * Add a new custom skill to the actor under a given category
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _addSkill(event, target) {
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
   * Roll potion skill check with malus from potion
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRollPotion(event, target) {
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
    const { mod: additionalMod } = await this._promptRollModifier.call(this);
    
    // Roll 1d100
    const roll = new Roll('1d100', this.actor.getRollData());
    await roll.evaluate();
    const r = Number(roll.total) || 0;
    const stressMalus = Number(this.actor.system.stress?.value) || 0;
    // Hybrid magical weakness also hampers brewing (§17.2.1).
    const brewWeakness = Number(this.actor.system.hybridEffects?.potionMalus) || 0;
    const modifiedTarget = targetValue + malus - stressMalus - brewWeakness + additionalMod;

    // Harry Potter JdR degrees (same logic as _onRoll)
    const degree = _degreeOf(r, modifiedTarget);

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);

    // Build chat message with potion info
    const level = item.system.potionLevel || 1;
    const levelDisplay = level === 6 ? '5+' : level;
    
    let content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.PotionRoll')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.level.label')}:</strong> ${levelDisplay} | <strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.malus.label')}:</strong> ${malus}${stressMalus ? ` - ${game.i18n.localize('HOGWARTS.Actor.Character.Stress')}: ${stressMalus}` : ''}${additionalMod !== 0 ? ` + ${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}: ${additionalMod >= 0 ? '+' : ''}${additionalMod}` : ''}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue} → ${modifiedTarget}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${_degreeBadge(degree)}</div>
        ${item.system.description ? `<div class="card-description">${item.system.description}</div>` : ''}
        ${(Number(this.actor.system.fougue?.value) || 0) > 0 ? _fougueButton(r, modifiedTarget, this.actor.id) : ''}
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
  static async _onBrewPotion(event, target) {
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
    const { mod: additionalMod } = await this._promptRollModifier.call(this);

    // Roll 1d100
    const roll = new Roll('1d100', this.actor.getRollData());
    await roll.evaluate();
    const r = Number(roll.total) || 0;
    const stressMalus = Number(this.actor.system.stress?.value) || 0;
    // Hybrid magical weakness also hampers brewing (§17.2.1).
    const brewWeakness = Number(this.actor.system.hybridEffects?.potionMalus) || 0;
    const modifiedTarget = targetValue + malus - stressMalus - brewWeakness + additionalMod;

    // Determine degree of success
    const degree = _degreeOf(r, modifiedTarget);

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
    const success = ['Critical', 'Extreme', 'Hard', 'Success'].includes(degree);

    // On success: increase quantity and consume ingredients
    let brewResult = '';
    if (success) {
      const newQty = (item.system.quantity || 0) + (degree === 'Critical' ? 2 : 1);
      const updateData = { 'system.quantity': newQty, 'system.crafted': true };
      // Mark ingredients as consumed (unavailable)
      if (ingredientList.length > 0) {
        const consumed = ingredientList.map(i => ({ ...i, available: false }));
        updateData['system.ingredientList'] = consumed;
      }
      await item.update(updateData);
      brewResult = `<div class="brew-success"><i class="fas fa-check-circle"></i> ${game.i18n.localize('HOGWARTS.Item.Potion.BrewSuccess')}${degree === 'Critical' ? ` (×2!)` : ''}</div>`;
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

    let content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${game.i18n.localize('HOGWARTS.Item.Potion.Brewing')}: ${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Brewing')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.level.label')}:</strong> ${levelDisplay} | <strong>${game.i18n.localize('HOGWARTS.Item.Potion.FIELDS.malus.label')}:</strong> ${malus}${stressMalus ? ` - ${game.i18n.localize('HOGWARTS.Actor.Character.Stress')}: ${stressMalus}` : ''}${additionalMod !== 0 ? ` + ${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}: ${additionalMod >= 0 ? '+' : ''}${additionalMod}` : ''}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue} → ${modifiedTarget}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${_degreeBadge(degree)}</div>
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
  static async _onUsePotion(event, target) {
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
    let content = `
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
  static async _onRollSpell(event, target) {
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
    const skillMap = {
      'E': 'Enchantements',
      'M': 'Métamorphose',
      'S': 'Mauvais sorts',
      'X': null
    };

    const skillName = skillMap[spellType];
    
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
      await this._promptRollModifier.call(this, { showCasting: true, showExtreme: hasExtreme });
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
    const degree = _degreeOf(r, modifiedTarget);

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);

    // Build chat message with spell info
    const level = item.system.spellLevel || 0;
    const levelDisplay = level === 6 ? '5+' : level;
    
    let content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SpellRoll')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.level.label')}:</strong> ${levelDisplay} | <strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.spellType.label')}:</strong> ${game.i18n.localize(`HOGWARTS.Item.Spell.SpellType.${spellType}`) || spellType}${targetDisplay ? ` | <strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.target.label')}:</strong> ${targetDisplay}` : ''}${item.system.incantation ? ` | <em>${item.system.incantation}</em>` : ''}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.malus.label')}:</strong> ${appliedMalus}${isExtreme ? ` (${game.i18n.localize('HOGWARTS.Item.Spell.FIELDS.extremeFormula.label')})` : ''}${wandAffinityBonus ? ` + ${game.i18n.localize('HOGWARTS.Wand.Affinity')}: +${wandAffinityBonus}` : ''}${wandlessMalus ? ` − ${game.i18n.localize('HOGWARTS.Roll.WandlessShort')}: ${wandlessMalus}` : ''}${silentMalus ? ` − ${game.i18n.localize('HOGWARTS.Roll.SilentShort')}: ${silentMalus}` : ''}${weaknessMalus ? ` − ${game.i18n.localize('HOGWARTS.Hybrid.Capability.MagicalWeakness')}: ${weaknessMalus}` : ''}${additionalMod !== 0 ? ` + ${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}: ${additionalMod >= 0 ? '+' : ''}${additionalMod}` : ''}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${skillDisplayName} ${targetValue} → ${modifiedTarget}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${_degreeBadge(degree)}</div>
        ${item.system.description ? `<div class="card-description">${item.system.description}</div>` : ''}
        ${(Number(this.actor.system.fougue?.value) || 0) > 0 ? _fougueButton(r, modifiedTarget, this.actor.id) : ''}
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
  static async _onLearnSpell(event, target) {
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

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
    const resultText = game.i18n.localize(`HOGWARTS.Roll.Learn.${degree}`);

    const content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><img src="${item.img}" width="36" height="36" /><h3>${item.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.Learn.Title')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Roll.Learn.Roll')}:</strong> INT(${int})×5 + malus(${malus}) = <strong>${baseTarget}</strong></div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${_degreeBadge(degree)}</div>
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

  /**
   * Delete a custom skill by index. Preset (non-custom) skills are protected.
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _deleteSkill(event, target) {
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
  static async _toggleSkillMaxAuto(event, target) {
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
   * Weekly hit point recovery (Chap. 1.11): 1d3 alone, 1d6 resting in bed,
   * 2d3 in a hospital. Chocolate doubles the result and adds +1 to the die.
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRestRecovery(event, target) {
    event.preventDefault();
    const L = (k) => game.i18n.localize(`HOGWARTS.Recovery.${k}`);
    const choice = await foundry.applications.api.DialogV2.prompt({
      window: { title: L('Title') },
      content: `
        <div class="form-group">
          <label>${L('Mode')}</label>
          <select name="mode">
            <option value="1d3">${L('Alone')} (1d3)</option>
            <option value="1d6">${L('BedRest')} (1d6)</option>
            <option value="2d3">${L('Hospital')} (2d3)</option>
          </select>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="chocolate" /> ${L('Chocolate')}</label>
        </div>`,
      ok: {
        label: L('Roll'),
        callback: (ev, button) => ({
          mode: button.form.elements.mode.value,
          chocolate: button.form.elements.chocolate.checked,
        }),
      },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (!choice) return;

    const roll = new Roll(choice.mode);
    await roll.evaluate();
    const base = Number(roll.total) || 0;
    const healed = choice.chocolate ? (base + 1) * 2 : base;

    const hp = this.actor.system.health ?? {};
    const before = Number(hp.value) || 0;
    const max = Number(hp.max) || before;
    const after = Math.min(max, before + healed);

    await this.actor.update({
      'system.health.value': after,
      // A week of rest clears accumulated non-lethal damage (Chap. 1.10.1).
      'system.healthNonLethal.value': 0,
      'system.conditions.staggered': false,
    });

    let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${this.actor.name}</h3><span class="card-type">${L('Title')}</span></header>`;
    content += `<div class="card-row">${choice.mode} → <span class="roll-value">${base}</span>${choice.chocolate ? ` ${L('ChocolateApplied')} → <strong>${healed}</strong>` : ''}</div>`;
    content += `<div class="card-row"><strong>${L('Result')}:</strong> ${before} → ${after} / ${max}</div>`;
    if (after === max && before + healed > max) content += `<div class="card-row">${L('CappedAtMax')}</div>`;
    content += '</div>';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /**
   * Reaction state for the current combat round. Reactions are per-round, so
   * the stored round number is what makes a stale flag harmless out of combat.
   * @returns {{round: number, dodged: boolean, parried: boolean}}
   * @protected
   */
  get _reactions() {
    const round = game.combat?.round ?? 0;
    const f = this.actor.getFlag('hogwarts-system', 'reactions') ?? {};
    return f.round === round
      ? { round, dodged: !!f.dodged, parried: !!f.parried }
      : { round, dodged: false, parried: false };
  }

  /**
   * Dodge (Chap. 2.5.1). A dodging character cannot attack this round, but may
   * still parry. Dodging never works against spells.
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   */
  static async _onRollDodge(event) {
    event.preventDefault();
    const skill = (this.actor.system.skills ?? []).find((s) => s.name === 'Esquive');
    if (!skill) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Reaction.NoDodgeSkill'));
    const state = this._reactions;
    await this._rollReaction({
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
  static async _onRollParry(event) {
    event.preventDefault();
    const state = this._reactions;
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

    await this._rollReaction({
      kind: 'Parry',
      target: (Number(skill.value) || 0) + shield,
      skillName: skill.name,
      notes,
    });
    await this.actor.setFlag('hogwarts-system', 'reactions', { ...state, parried: true });
  }

  /**
   * Shared d100 resolution for a reaction, including the stress penalty.
   * @param {{kind: string, target: number, skillName: string, notes: string[]}} opts
   * @protected
   */
  async _rollReaction({ kind, target, skillName, notes }) {
    const stress = Number(this.actor.system.stress?.value) || 0;
    const finalTarget = Math.max(0, target - stress);
    const roll = new Roll('1d100');
    await roll.evaluate();
    const r = Number(roll.total) || 0;
    const degree = _degreeOf(r, finalTarget);

    const title = game.i18n.localize(`HOGWARTS.Reaction.${kind}`);
    const stressText = stress ? ` (stress −${stress})` : '';
    let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${this.actor.name}</h3>`
      + `<span class="card-type">${title}</span></header>`
      + `<div class="card-row"><strong>${skillName}:</strong> ${finalTarget}${stressText}</div>`
      + `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> `
      + `<span class="roll-value">${r}</span> → ${_degreeBadge(degree)}</div>`;
    for (const n of notes) content += `<div class="card-row reaction-note">${n}</div>`;
    content += '</div>';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
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
  static async _onRollOpposition(event, target) {
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
    const targetValue = Math.max(1, Math.min(99, 50 - (passive * 5) + (active * 5)));

    const roll = new Roll('1d100', this.actor.getRollData());
    await roll.evaluate();
    const r = Number(roll.total) || 0;

    const degree = _degreeOf(r, targetValue);

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
    const chatContent = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Roll.Opposition.Title')}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Opposition')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Roll.Opposition.Active')}:</strong> ${active} vs <strong>${game.i18n.localize('HOGWARTS.Roll.Opposition.Passive')}:</strong> ${passive}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${targetValue}%</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> → ${_degreeBadge(degree)}</div>
        ${(Number(this.actor.system.fougue?.value) || 0) > 0 ? _fougueButton(r, targetValue, this.actor.id) : ''}
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: chatContent,
      rolls: [roll],
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /**
   * XP Resolution: for each skill with xpCheck=true, roll d100 > current value.
   * If the roll exceeds the current skill value, the skill increases.
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onResolveXP(event, target) {
    event.preventDefault();
    const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
    const results = [];
    // Collect every Roll so they can be attached to the chat message. This
    // turns the card into a proper roll message (Dice So Nice animation) and
    // lets the dice breakdown be revealed on hover.
    const allRolls = [];
    let updated = false;

    // Collect XP modifiers from active (non-disabled) effects.
    // Supported key patterns (Foundry AE engine ignores unknown paths; we read them manually):
    //   xp.multiplier                       → multiplies XP gain for ALL skills
    //   xp.multiplier.{category}            → multiplies XP gain for a specific category
    //   xp.multiplier.skill.{name}          → multiplies XP gain for a specific skill (case-insensitive)
    //   xp.bonus                            → flat bonus added to XP gain for ALL skills
    //   xp.bonus.{category}                 → flat bonus for a specific category
    //   xp.bonus.skill.{name}               → flat bonus for a specific skill (case-insensitive)
    // Use `appliedEffects` (not `effects`) so that effects transferred from
    // owned items (features, gear, …) are included, and so that disabled or
    // suppressed effects are automatically excluded. Reading `actor.effects`
    // would only see effects placed directly on the actor and would silently
    // drop any XP modifier coming from an item.
    const xpEffects = [];
    for (const effect of (this.actor.appliedEffects ?? [])) {
      for (const change of (effect.changes ?? [])) {
        if (change.key?.startsWith('xp.')) {
          xpEffects.push({ key: change.key, value: Number(change.value) || 0, label: effect.name });
        }
      }
    }

    // Compute effective multiplier + bonus for a given skill entry.
    const getXPMods = (skill) => {
      let multiplier = 1;
      let bonus = 0;
      const lname = (skill.name ?? '').toLowerCase();
      for (const fx of xpEffects) {
        const parts = fx.key.split('.');
        const isMultiplier = parts[1] === 'multiplier';
        const isBonus = parts[1] === 'bonus';
        if (!isMultiplier && !isBonus) continue;
        let matches = false;
        if (parts.length === 2) {
          matches = true; // global
        } else if (parts[2] === 'skill') {
          matches = parts.slice(3).join('.').toLowerCase() === lname;
        } else {
          matches = skill.category === parts[2];
        }
        if (!matches) continue;
        if (isMultiplier) multiplier *= fx.value;
        else bonus += fx.value;
      }
      // Some ancestries make experience in a skill a third higher (§17.2).
      if (skill.hybridXp) multiplier *= 4 / 3;
      return { multiplier, bonus };
    };

    for (let i = 0; i < skills.length; i++) {
      const s = skills[i];
      if (!s.xpCheck) continue;

      const roll = new Roll('1d100');
      await roll.evaluate();
      allRolls.push(roll);
      const r = Number(roll.total) || 0;
      const currentValue = Number(s.value) || 0;

      // From 90% on, the chance to improve is INT itself and the gain is +1
      // whatever happens (l. 6836-6837).
      const mastered = currentValue >= 90;
      const intScore = Number(this.actor.system.stats?.int?.total ?? this.actor.system.stats?.int?.value) || 0;
      const improved = mastered ? r <= intScore : r > currentValue;

      if (improved) {
        let increase = 1;
        let rawIncrease = null;
        let multiplier = 1;
        let bonus = 0;

        if (!mastered) {
          const increaseRoll = new Roll('1d6');
          await increaseRoll.evaluate();
          allRolls.push(increaseRoll);
          rawIncrease = Number(increaseRoll.total) || 1;
          ({ multiplier, bonus } = getXPMods(s));
          // The canonical +1 (l. 6834) sits outside the homebrew multiplier.
          increase = Math.max(1, Math.ceil(rawIncrease * multiplier) + 1 + bonus);
        }

        s.spent = (Number(s.spent) || 0) + increase;
        s.xpCheck = false;
        updated = true;
        results.push({
          name: s.name,
          spec: s.spec,
          roll: r,
          d6: rawIncrease,
          current: currentValue,
          target: mastered ? intScore : currentValue,
          mastered,
          increase,
          rawIncrease: mastered ? null : rawIncrease,
          multiplier: multiplier !== 1 ? multiplier : null,
          bonus: bonus !== 0 ? bonus : null,
          success: true,
        });
      } else {
        s.xpCheck = false;
        updated = true;
        results.push({
          name: s.name,
          spec: s.spec,
          roll: r,
          d6: null,
          current: currentValue,
          target: mastered ? intScore : currentValue,
          mastered,
          increase: 0,
          success: false,
        });
      }
    }

    if (!updated) {
      ui?.notifications?.info?.(game.i18n.localize('HOGWARTS.Roll.XP.NoChecks'));
      return;
    }

    // Update the actor with cleared xpCheck flags and any increases
    await this.actor.update({ 'system.skills': skills });

    // Build a chat card with the results
    const rolledLabel = game.i18n.localize('HOGWARTS.Roll.XP.Rolled');
    let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Roll.XP.Title')}</h3><span class="card-type">XP</span></header>`;
    for (const res of results) {
      const nameDisplay = res.spec ? `${res.name} (${res.spec})` : res.name;
      // Hover tooltip exposing the exact dice that were rolled for this skill.
      const tip = res.success
        ? `1d100 → ${res.roll}<br>1d6 → ${res.d6}`
        : `1d100 → ${res.roll}`;
      const rollValue = `<span class="roll-value" data-tooltip="${tip}">${res.roll}</span>`;
      const rule = res.mastered ? ` <em class="xp-mod">(≥ 90 % → INT)</em>` : '';
      if (res.success) {
        let modDisplay = '';
        if (res.rawIncrease !== null) {
          const parts = [`1d6=${res.rawIncrease}`];
          if (res.multiplier !== null) parts.push(`×${res.multiplier}`);
          parts.push('+1');
          if (res.bonus !== null) parts.push(`${res.bonus >= 0 ? '+' : ''}${res.bonus}`);
          modDisplay = ` <em class="xp-mod">(${parts.join(' ')})</em>`;
        }
        const comparison = res.mastered ? `≤ ${res.target}` : `> ${res.current}`;
        content += `<div class="card-row xp-success">✓ ${nameDisplay}: ${rolledLabel} ${rollValue} ${comparison} → +${res.increase}${modDisplay}${rule}</div>`;
      } else {
        const comparison = res.mastered ? `> ${res.target}` : `≤ ${res.current}`;
        content += `<div class="card-row xp-fail">✗ ${nameDisplay}: ${rolledLabel} ${rollValue} ${comparison}${rule}</div>`;
      }
    }
    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: allRolls,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /**
   * Credit one school event: the very first week, then each of the three terms
   * (§7.3 l. 6841-6850, §25.1 l. 28185-28196). The counter resets on its own
   * when the pupil moves up a year, so a term can never be granted twice.
   * @this HogwartsActorSheet
   */
  static async _onSchoolTermXP(event, target) {
    event.preventDefault();
    const year = Number(this.actor.system.profile?.year) || 1;
    const progress = this.actor.system.experience?.school ?? {};
    const periods = progress.year === year ? Number(progress.periods) || 0 : 0;
    const mode = game.settings.get('hogwarts-system', 'schoolXpMode') ?? 'flat';

    const firstWeekPending = year === 1 && !progress.firstWeek;
    if (!firstWeekPending && periods >= 3) {
      return ui.notifications.warn(game.i18n.localize('HOGWARTS.Roll.XP.AllTermsDone'));
    }

    const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
    const cursus = skills.filter((s) => s.category === 'school' && !s.unavailable);
    if (!cursus.length) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Roll.XP.NoSchoolSkills'));

    // §7.3 makes the first week a flat +10%; §25.1 rolls for it like any term.
    const flatBonus = firstWeekPending && mode === 'tapered' ? CONFIG.HOGWARTS.schoolFirstWeek.tapered : null;
    const formula = mode === 'tapered'
      ? CONFIG.HOGWARTS.schoolXpTapered[Math.min(year, 7) - 1]
      : CONFIG.HOGWARTS.schoolXpFlat;

    const rolls = [];
    const lines = [];
    for (const skill of cursus) {
      let gain = flatBonus;
      if (gain === null) {
        const roll = new Roll(formula);
        await roll.evaluate();
        rolls.push(roll);
        gain = Number(roll.total) || 0;
      }
      const headroom = Math.max(0, (Number(skill.max) || 0) - (Number(skill.base) || 0) - (Number(skill.spent) || 0));
      const applied = Math.min(gain, headroom);
      skill.spent = (Number(skill.spent) || 0) + applied;
      lines.push(`<div class="card-row">${skill.name}: +${applied}${applied < gain ? ` <em class="xp-mod">(${gain}, plafonné)</em>` : ''}</div>`);
    }

    await this.actor.update({
      'system.skills': skills,
      'system.experience.school.year': year,
      'system.experience.school.periods': firstWeekPending ? periods : periods + 1,
      'system.experience.school.firstWeek': progress.firstWeek || firstWeekPending,
    });

    const heading = firstWeekPending
      ? game.i18n.localize('HOGWARTS.Roll.XP.FirstWeek')
      : game.i18n.format('HOGWARTS.Roll.XP.Term', { n: periods + 1 });
    const detail = flatBonus !== null ? `+${flatBonus}%` : formula;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${heading}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.XP.School')}</span></header>
        <div class="card-row"><em>${detail}</em></div>${lines.join('')}</div>`,
      rolls,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /**
   * Total the end-of-year rewards into the pool the player will spread later
   * (§25.2, l. 28293-28300).
   * @this HogwartsActorSheet
   */
  static async _onYearEndXP(event, target) {
    event.preventDefault();
    const year = Number(this.actor.system.profile?.year) || 1;
    const rows = CONFIG.HOGWARTS.yearEndRewards.map((r) => {
      const label = game.i18n.localize(`HOGWARTS.Roll.XP.Reward.${r.key}`);
      // A signed reward spans ±year, so it needs a field rather than a checkbox.
      const fixed = r.perYear !== undefined && r.min === undefined && !r.signed
        ? year * r.perYear + (r.flat ?? 0)
        : null;
      const min = r.signed ? -year : (r.min ?? 0);
      const max = r.signed ? year : (r.max ?? 0);
      return { key: r.key, label, fixed, min, max };
    });

    const html = rows.map((r) => r.fixed !== null
      ? `<div class="form-group"><label>${r.label}</label>
           <input type="checkbox" name="${r.key}" checked /> <span>+${r.fixed}%</span></div>`
      : `<div class="form-group"><label>${r.label}</label>
           <input type="number" name="${r.key}" value="0" min="${r.min}" max="${r.max}" step="1" />
           <span class="hint">${r.min}…${r.max}</span></div>`).join('');

    const total = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize('HOGWARTS.Roll.XP.YearEnd') },
      content: `<div class="year-end-form">${html}</div>`,
      ok: {
        label: game.i18n.localize('OK'),
        callback: (ev, button) => rows.reduce((sum, r) => {
          const field = button.form.elements[r.key];
          if (r.fixed !== null) return sum + (field?.checked ? r.fixed : 0);
          const v = Number(field?.value) || 0;
          return sum + Math.min(r.max, Math.max(r.min, v));
        }, 0),
      },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (total === null) return;

    await this._creditPool(Math.max(0, total), game.i18n.localize('HOGWARTS.Roll.XP.YearEnd'));
  }

  /**
   * Holiday gain for a pupil who goes home rather than playing (l. 28202).
   * @this HogwartsActorSheet
   */
  static async _onHolidayXP(event, target) {
    event.preventDefault();
    const roll = new Roll(CONFIG.HOGWARTS.holidayXpFormula);
    await roll.evaluate();
    await this._creditPool(Number(roll.total) || 0, game.i18n.localize('HOGWARTS.Roll.XP.Holiday'), [roll]);
  }

  /** Add percentages to the pool and announce it. */
  async _creditPool(amount, reason, rolls = []) {
    const pool = (Number(this.actor.system.experience?.pool) || 0) + amount;
    await this.actor.update({ 'system.experience.pool': pool });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${reason}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.XP.Pool')}</span></header>
        <div class="card-row"><strong>+${amount}%</strong> → ${game.i18n.localize('HOGWARTS.Roll.XP.Pool')}: ${pool}%</div></div>`,
      rolls,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /**
   * Spread the pool over non-school skills, or trade 5% for a brand new Lore or
   * Language (l. 28308-28316).
   * @this HogwartsActorSheet
   */
  static async _onSpendPool(event, target) {
    event.preventDefault();
    const pool = Number(this.actor.system.experience?.pool) || 0;
    if (pool <= 0) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Roll.XP.EmptyPool'));

    const year = Number(this.actor.system.profile?.year) || 1;
    const unlock = CONFIG.HOGWARTS.poolUnlock;
    const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
    const eligible = skills
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => CONFIG.HOGWARTS.poolSpendCategories.includes(s.category) && !s.unavailable)
      .map((e) => ({
        ...e,
        headroom: Math.max(0, (Number(e.s.max) || 0) - (Number(e.s.base) || 0) - (Number(e.s.spent) || 0)),
      }))
      .filter((e) => e.headroom > 0);

    const rowsHtml = eligible.map((e) => `
      <div class="form-group pool-row">
        <label>${e.s.name}${e.s.spec ? ` (${e.s.spec})` : ''}</label>
        <input type="number" name="skill-${e.index}" value="0" min="0" max="${e.headroom}" step="1" />
        <span class="hint">${e.s.value} / ${e.s.max}</span>
      </div>`).join('');

    const result = await foundry.applications.api.DialogV2.prompt({
      // The stylesheet is namespaced under .hogwarts-system, which a bare dialog lacks.
      classes: ['hogwarts-system'],
      window: { title: game.i18n.format('HOGWARTS.Roll.XP.SpendPool', { pool }) },
      content: `<div class="xp-pool-form">
          <p class="notes">${game.i18n.format('HOGWARTS.Roll.XP.SpendHint', { pool })}</p>
          <div class="form-group unlock-row">
            <label>${game.i18n.format('HOGWARTS.Roll.XP.Unlock', { cost: unlock.cost })}</label>
            <select name="unlockType">
              <option value="">—</option>
              <option value="lore">${game.i18n.localize('HOGWARTS.Roll.XP.UnlockLore')}</option>
              <option value="language">${game.i18n.localize('HOGWARTS.Roll.XP.UnlockLanguage')}</option>
            </select>
            <input type="text" name="unlockName" placeholder="${game.i18n.localize('HOGWARTS.Roll.XP.UnlockName')}" />
          </div>
          <hr />${rowsHtml}
        </div>`,
      ok: {
        label: game.i18n.localize('OK'),
        callback: (ev, button) => {
          const form = button.form;
          const allocations = eligible
            .map((e) => ({ ...e, amount: Math.min(e.headroom, Math.max(0, Number(form.elements[`skill-${e.index}`]?.value) || 0)) }))
            .filter((e) => e.amount > 0);
          return {
            allocations,
            unlockType: form.elements.unlockType?.value || '',
            unlockName: (form.elements.unlockName?.value || '').trim(),
          };
        },
      },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (!result) return;

    const { allocations, unlockType, unlockName } = result;
    const unlockCost = unlockType && unlockName ? unlock.cost : 0;
    const spent = allocations.reduce((sum, a) => sum + a.amount, 0) + unlockCost;
    if (spent > pool) {
      return ui.notifications.warn(game.i18n.format('HOGWARTS.Roll.XP.TooMuch', { spent, pool }));
    }
    if (!spent) return;

    const lines = [];
    for (const a of allocations) {
      skills[a.index].spent = (Number(skills[a.index].spent) || 0) + a.amount;
      lines.push(`<div class="card-row">${skills[a.index].name}: +${a.amount}%</div>`);
    }
    if (unlockCost) {
      const spec = unlockType === 'lore' ? unlock.lore : unlock.language;
      const max = unlockType === 'lore' ? spec.maxFlat + spec.maxPerYear * year : spec.max;
      skills.push({
        name: unlockName,
        base: spec.base,
        max,
        maxOverride: true,
        value: spec.value,
        spent: spec.value,
        category: spec.category,
        spec: '',
        custom: true,
        xpCheck: false,
      });
      lines.push(`<div class="card-row">${game.i18n.format('HOGWARTS.Roll.XP.Unlocked', { name: unlockName, value: spec.value, max })}</div>`);
    }

    await this.actor.update({ 'system.skills': skills, 'system.experience.pool': pool - spent });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Roll.XP.SpendTitle')}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.XP.Pool')}</span></header>
        ${lines.join('')}
        <div class="card-row"><em>${game.i18n.localize('HOGWARTS.Roll.XP.Pool')}: ${pool} → ${pool - spent}%</em></div></div>`,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /**
   * Add a new family member
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _addFamilyMember(event, target) {
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
  static async _deleteFamilyMember(event, target) {
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
  static _toggleBioSection(event, target) {
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
   * Toggle skill category collapsed state
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static _toggleSkillCategory(event, target) {
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

  /**
   * Toggle settings section collapsed state
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static _toggleSettingsSection(event, target) {
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

  /* ─── Creature-specific actions ─── */

  static _toggleCreatureSection(event, target) {
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

  static async _addAttack(event, target) {
    event.preventDefault();
    const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? []);
    attacks.push({ name: '', chance: 30, damage: '1d6' });
    await this.actor.update({ 'system.attacks': attacks });
  }

  static async _deleteAttack(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    if (!Number.isInteger(idx)) return;
    const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? []);
    attacks.splice(idx, 1);
    await this.actor.update({ 'system.attacks': attacks });
  }

  static async _rollAttack(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    const attack = this.actor.system.attacks?.[idx];
    if (!attack) return;

    const chance = Number(attack.chance) || 0;
    const roll = new Roll('1d100', this.actor.getRollData());
    await roll.evaluate();
    const r = Number(roll.total);
    const degree = _degreeOf(r, chance);

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
    
    // If success or critical, roll damage automatically
    let damageSection = '';
    if (degree === 'Success' || degree === 'Critical') {
      const dmgFormula = attack.damage || '1d6';
      const dmgRoll = new Roll(dmgFormula, this.actor.getRollData());
      await dmgRoll.evaluate();
      const total = Number(dmgRoll.total);
      damageSection = `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Damage')}:</strong> ${dmgFormula} = <span class="roll-value">${total}</span></div>${_damageButtons(total)}`;
    }

    const content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><h3>${attack.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.Attack')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${chance}%</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> \u2192 ${_degreeBadge(degree)}</div>
        ${damageSection}
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: degree === 'Success' || degree === 'Critical' ? [roll] : [roll],
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  static async _addCreatureSkill(event, target) {
    event.preventDefault();
    const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
    skills.push({ name: '', value: 0 });
    await this.actor.update({ 'system.skills': skills });
  }

  static async _deleteCreatureSkill(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    if (!Number.isInteger(idx)) return;
    const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
    skills.splice(idx, 1);
    await this.actor.update({ 'system.skills': skills });
  }

  static async _rollCreatureSkill(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    const skill = this.actor.system.skills?.[idx];
    if (!skill) return;

    const chance = Number(skill.value) || 0;
    const roll = new Roll('1d100', this.actor.getRollData());
    await roll.evaluate();
    const r = Number(roll.total);
    const degree = _degreeOf(r, chance);

    const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
    const content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><h3>${skill.name}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SkillCheck')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${chance}%</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> \u2192 ${_degreeBadge(degree)}</div>
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
  static async _rollCreatureStat(event, target) {
    event.preventDefault();
    const statKey = target.dataset.stat;
    const stat = this.actor.system.stats?.[statKey];
    if (!stat) return;

    const value = Number(stat.total ?? stat.value) || 0;
    const chance = value * 5;
    const roll = new Roll('1d100', this.actor.getRollData());
    await roll.evaluate();
    const r = Number(roll.total);
    const degree = _degreeOf(r, chance);

    const content = `
      <div class="hogwarts-chat-card">
        <header class="card-header"><h3>${stat.label || statKey}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Chat.SkillCheck')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${value} × 5 = ${chance}%</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${r}</span> \u2192 ${_degreeBadge(degree)}</div>
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
  static async _rollDamageBonus(event, target) {
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
        ${_damageButtons(total)}
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  /** Helper Functions */

  /**
   * Custom form submission handler to properly handle skills array updates
   * @param {SubmitEvent} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The processed form data
   * @returns {Promise<void>}
   */
  static async #onSubmitActorForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    
    // Handle skills array specially to avoid partial updates that cause data loss
    if (submitData.system?.skills) {
      // Get the current full skills array from the actor
      const currentSkills = foundry.utils.deepClone(this.document.system.skills ?? []);
      const skillUpdates = submitData.system.skills;
      
      // If skillUpdates is a sparse array or object with numeric keys
      if (typeof skillUpdates === 'object' && !Array.isArray(skillUpdates)) {
        // Apply only the changed fields to each skill
        Object.keys(skillUpdates).forEach(idx => {
          const index = Number(idx);
          if (!isNaN(index) && currentSkills[index]) {
            // Merge the partial update into the existing skill
            currentSkills[index] = foundry.utils.mergeObject(
              currentSkills[index],
              skillUpdates[idx],
              { inplace: false }
            );
          }
        });
        // Replace with the complete array
        submitData.system.skills = currentSkills;
      } else if (Array.isArray(skillUpdates)) {
        // If it's already a full array, merge each element
        submitData.system.skills = currentSkills.map((skill, idx) => {
          return skillUpdates[idx] 
            ? foundry.utils.mergeObject(skill, skillUpdates[idx], { inplace: false })
            : skill;
        });
      }
    }
    
    // Handle family array similarly
    if (submitData.system?.family) {
      const currentFamily = foundry.utils.deepClone(this.document.system.family ?? []);
      const familyUpdates = submitData.system.family;
      
      if (typeof familyUpdates === 'object' && !Array.isArray(familyUpdates)) {
        Object.keys(familyUpdates).forEach(idx => {
          const index = Number(idx);
          if (!isNaN(index) && currentFamily[index]) {
            currentFamily[index] = foundry.utils.mergeObject(
              currentFamily[index],
              familyUpdates[idx],
              { inplace: false }
            );
          }
        });
        submitData.system.family = currentFamily;
      } else if (Array.isArray(familyUpdates)) {
        submitData.system.family = currentFamily.map((member, idx) => {
          return familyUpdates[idx] 
            ? foundry.utils.mergeObject(member, familyUpdates[idx], { inplace: false })
            : member;
        });
      }
    }

    // Handle item quantity updates (items.{id}.system.quantity)
    if (submitData.items) {
      const itemUpdates = [];
      for (const [itemId, itemData] of Object.entries(submitData.items)) {
        if (itemData.system?.quantity !== undefined) {
          itemUpdates.push({
            _id: itemId,
            'system.quantity': itemData.system.quantity
          });
        }
      }
      
      // Update items on the actor
      if (itemUpdates.length > 0) {
        await this.document.updateEmbeddedDocuments('Item', itemUpdates);
      }
      
      // Remove items from submitData to avoid conflicts
      delete submitData.items;
    }
    
    // Update the actor with the corrected data
    return this.document.update(submitData);
  }

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest('li[data-document-class]');
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments('Item', itemData);
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (let k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }
}
