import { prepareActiveEffectCategories, prepareEffectAttributes } from '../helpers/effects.mjs';
import { QUIDDITCH_ROLES } from '../helpers/quidditch.mjs';
import { CharacterCreationApp } from '../applications/character-creation.mjs';
import * as biography from './actor/biography.mjs';
import * as creature from './actor/creature.mjs';
import * as experience from './actor/experience.mjs';
import * as magic from './actor/magic.mjs';
import * as rolls from './actor/rolls.mjs';
import * as skills from './actor/skills.mjs';

const { api, sheets } = foundry.applications;

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
      roll: rolls.onRoll,
      rollInitiative: rolls.rollInitiative,
      openCreation: this._onOpenCreation,
      rollDamage: rolls.onRollDamage,
      rollPotion: magic.onRollPotion,
      rollSpell: magic.onRollSpell,
      learnSpell: magic.onLearnSpell,
      brewPotion: magic.onBrewPotion,
      usePotion: magic.onUsePotion,
      rollOpposition: rolls.onRollOpposition,
      resolveXP: experience.onResolveXP,
      schoolTermXP: experience.onSchoolTermXP,
      yearEndXP: experience.onYearEndXP,
      holidayXP: experience.onHolidayXP,
      spendPool: experience.onSpendPool,
      addSkill: skills.addSkill,
      deleteSkill: skills.deleteSkill,
      toggleSkillMaxAuto: skills.toggleSkillMaxAuto,
      openQuidditchTeam: this._onOpenQuidditchTeam,
      animagusTransform: biography.onAnimagusTransform,
      fougueSprint: rolls.onFougueSprint,
      restRecovery: experience.onRestRecovery,
      rollDodge: rolls.onRollDodge,
      rollParry: rolls.onRollParry,
      addFamilyMember: biography.addFamilyMember,
      deleteFamilyMember: biography.deleteFamilyMember,
      toggleBioSection: biography.toggleBioSection,
      toggleSkillCategory: skills.toggleSkillCategory,
      toggleSettingsSection: biography.toggleSettingsSection,
      toggleCreatureSection: biography.toggleCreatureSection,
      addAttack: creature.addAttack,
      deleteAttack: creature.deleteAttack,
      rollAttack: creature.rollAttack,
      addCreatureSkill: creature.addCreatureSkill,
      deleteCreatureSkill: creature.deleteCreatureSkill,
      rollCreatureSkill: creature.rollCreatureSkill,
      rollCreatureStat: creature.rollCreatureStat,
      rollDamageBonus: creature.rollDamageBonus,
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
    npc: {
      template: 'systems/hogwarts-system/templates/actor/npc.hbs',
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
    // Creature and NPC carry their own identity tab instead of the biography one.
    if (!['creature', 'npc'].includes(this.document.type)) {
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
        // §21.1 : le PNJ suit les mêmes étapes qu'un PJ, il lui faut donc les
        // mêmes onglets — sauf le familier, réservé aux héros.
        options.parts.push('npc', 'skills', 'features', 'perks', 'gear', 'spells', 'potions', 'settings');
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
      quidditchTeam: this._prepareQuidditchTeam(),
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /**
   * The squad this character belongs to, read from the `quidditchTeam` actors.
   * Derived rather than stored: the team sheet is the single place a roster is
   * edited, so the two can never disagree.
   * @returns {{id: string, name: string, img: string, role: string, roleLabel: string, isCaptain: boolean}|null}
   */
  _prepareQuidditchTeam() {
    if (this.actor.type !== 'character') return null;
    for (const team of game.actors) {
      if (team.type !== 'quidditchTeam') continue;
      const member = team.system.players.find((p) => p.actorId === this.actor.id);
      if (!member) continue;
      return {
        id: team.id,
        name: team.name,
        img: team.img,
        role: member.role,
        roleLabel: game.i18n.localize(QUIDDITCH_ROLES[member.role]?.label ?? member.role),
        icon: QUIDDITCH_ROLES[member.role]?.icon ?? '',
        isCaptain: team.system.captain === this.actor.id,
      };
    }
    return null;
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
        // Le livre ne tire pas les caractéristiques de la même façon selon le type
        // d'acteur : le bouton doit annoncer la formule qu'il appliquera.
        context.creationFormula = (CharacterCreationApp.FORMULES[this.actor.type]
          ?? CharacterCreationApp.FORMULES.character).libelle;
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
          if (['character', 'npc'].includes(this.document.type)) {
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
      case 'npc':
        context.tab = context.tabs[partId];
        // Budget d'avantages du §21.1 : le coût des objets et de la baguette se
        // retranche du maximum, sans les cas particuliers du personnage joueur
        // (familier lié, autre école) que le PNJ n'a pas.
        {
          const coutObjets = (this.document.items ?? [])
            .reduce((s, it) => s + (Number(it.system?.pbpCost) || 0), 0);
          const coutBaguette = Number(this.actor.system?.wand?.pbpCost) || 0;
          const restant = (Number(this.actor.system?.experience?.personalBonusPoints?.max) || 0)
            - coutObjets - coutBaguette;
          context.personalBonusCurrent = restant;
          context.personalBonusCurrentDefined = true;
          context.personalBonusCurrentNegative = restant < 0;
        }
        context.enrichedGMNotes = await foundry.applications.ux.TextEditor.enrichHTML(
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
      this.tabGroups[tabGroup] = { creature: 'creature', npc: 'npc' }[this.document.type] ?? 'biography';
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
        case 'npc':
          tab.id = 'npc';
          if (useIcons) { tab.label = ''; tab.icon = 'fas fa-id-card'; }
          else { tab.label += 'NPC'; tab.icon = ''; }
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
    for (const i of this.document.items) {
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
        if (i.system.spellLevel != null) {
          spells[i.system.spellLevel].push(i);
        }
      }
      // Append to potions.
      else if (i.type === 'potion') {
        if (i.system.potionLevel != null) {
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

  /** @this HogwartsActorSheet */
  static async _onOpenQuidditchTeam(event, target) {
    event.preventDefault();
    game.actors.get(target.dataset.teamId)?.sheet.render(true);
  }

  /**
   * Open the creation assistant (§Étape 2).
   * @this HogwartsActorSheet
   * @param {PointerEvent} event
   */
  static async _onOpenCreation(event) {
    event.preventDefault?.();
    new CharacterCreationApp(this.actor).render(true);
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

  /* ─── Creature-specific actions ─── */

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

    // Champs de formulaire visant un objet embarqué : `items.<id>.<chemin>`.
    if (submitData.items) {
      const itemUpdates = Object.entries(submitData.items)
        .map(([_id, data]) => ({ _id, ...foundry.utils.flattenObject(data) }))
        .filter((u) => Object.keys(u).length > 1);

      if (itemUpdates.length > 0) {
        await this.document.updateEmbeddedDocuments('Item', itemUpdates);
      }

      // Retiré de la charge utile : `items` n'est pas un champ de l'acteur.
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
    const sortUpdates = foundry.utils.performIntegerSort(effect, {
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
    for (const k of Object.keys(overrides)) delete submitData[k];
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
