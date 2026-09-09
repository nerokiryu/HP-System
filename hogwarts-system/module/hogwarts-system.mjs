// Import document classes.
import { HogwartsActor } from './documents/actor.mjs';
import { HogwartsItem } from './documents/item.mjs';
import { HogwartsCombat, COMBAT_PHASES, combatantPhase, DEFAULT_PHASE, isQuidditch } from './documents/combat.mjs';
// Import sheet classes.
import { HogwartsActorSheet } from './sheets/actor-sheet.mjs';
import { HogwartsQuidditchTeamSheet } from './sheets/quidditch-team-sheet.mjs';
import { HogwartsItemSheet } from './sheets/item-sheet.mjs';
import { HousePointsApp } from './applications/house-points.mjs';
import { QuidditchApp } from './applications/quidditch.mjs';
// Import helper/utility classes and constants.
import { HOGWARTS } from './helpers/config.mjs';
import { degreeOf, fougueDegree, reverseDice } from './helpers/degrees.mjs';
import HousePointsData from './data/house-points.mjs';
import { QUIDDITCH_ROLES } from './helpers/quidditch.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';

const collections = foundry.documents.collections;
const sheets = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.hogwartssystem = {
  documents: {
    HogwartsActor,
    HogwartsItem,
  },
  applications: {
    HogwartsActorSheet,
    HogwartsItemSheet,
  },
  utils: {
    rollItemMacro,
  },
  models,
};

Hooks.once('init', function () {
  // Add custom constants for configuration.
  CONFIG.HOGWARTS = HOGWARTS;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    // Simple BRP-inspired initiative: DEX influences order with a small randomizer.
    // Include a system-local `initiativeBonus` so Active Effects can add a dedicated
    // initiative modifier without altering the DEX stat itself. Use a simple token
    // reference (no JS operators) so the Roll parser can parse the formula.
    formula: '1d6 + @stats.dex.total + @system.initiativeBonus',
    decimals: 2,
  };

  // Bars offered in token configuration. `fougue` only exists on characters, so
  // it is declared per type rather than through `secondaryTokenAttribute`.
  const commonBars = ['health.value', 'healthNonLethal.value'];
  CONFIG.Actor.trackableAttributes = {
    character: { bar: [...commonBars, 'fougue.value'], value: ['stress.value', 'experience.pool'] },
    npc: { bar: commonBars, value: [] },
    familiar: { bar: commonBars, value: [] },
    creature: { bar: commonBars, value: [] },
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = HogwartsActor;
  CONFIG.Combat.documentClass = HogwartsCombat;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.HogwartsCharacter,
    npc: models.HogwartsNPC,
    familiar: models.HogwartsFamiliar,
    creature: models.HogwartsCreature,
    quidditchTeam: models.HogwartsQuidditchTeam,
  };
  CONFIG.Item.documentClass = HogwartsItem;
  CONFIG.Item.dataModels = {
    gear: models.HogwartsGear,
    weapon: models.HogwartsWeapon,
    armor: models.HogwartsArmor,
    feature: models.HogwartsFeature,
    spell: models.HogwartsSpell,
    potion: models.HogwartsPotion,
    component: models.HogwartsComponent,
    broom: models.HogwartsBroom,
  };

  // Register sheet application classes
  collections.Actors.unregisterSheet('core', sheets.ActorSheet);
  collections.Actors.registerSheet('hogwarts-system', HogwartsActorSheet, {
    types: ['character', 'npc', 'familiar', 'creature'],
    makeDefault: true,
    label: 'HOGWARTS.SheetLabels.Actor',
  });
  collections.Actors.registerSheet('hogwarts-system', HogwartsQuidditchTeamSheet, {
    types: ['quidditchTeam'],
    makeDefault: true,
    label: 'HOGWARTS.SheetLabels.QuidditchTeam',
  });
  collections.Items.unregisterSheet('core', sheets.ItemSheet);
  collections.Items.registerSheet('hogwarts-system', HogwartsItemSheet, {
    makeDefault: true,
    label: 'HOGWARTS.SheetLabels.Item',
  });

  // Register a world-scoped setting to track applied migrations
  game.settings.register('hogwarts-system', 'migrationVersion', {
    name: 'Hogwarts System - Migration Version',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Client setting: warn the user when experience values go negative
  game.settings.register('hogwarts-system', 'warnOnNegativeExperience', {
    name: 'HOGWARTS.Settings.WarnOnNegativeExperience',
    hint: 'HOGWARTS.Settings.WarnOnNegativeExperienceHint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });

  // Client setting: display tabs as icons (true) or text labels (false)
  game.settings.register('hogwarts-system', 'tabsUseIcons', {
    name: 'HOGWARTS.Settings.TabsUseIcons',
    hint: 'HOGWARTS.Settings.TabsUseIconsHint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });

  // World setting: use BRP extended success tiers (Extreme/Hard) in addition to
  // the harry-potter-jdr base rules (Critical 01-05, Success, Fail, Fumble 96-00).
  game.settings.register('hogwarts-system', 'useExtendedSuccessTiers', {
    name: 'HOGWARTS.Settings.UseExtendedTiers',
    hint: 'HOGWARTS.Settings.UseExtendedTiersHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // World setting: house points tracker
  game.settings.register('hogwarts-system', 'housePoints', {
    name: 'HOGWARTS.HousePoints.Title',
    scope: 'world',
    config: false,
    type: HousePointsData,
    default: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 }
  });

  // World setting: exclude school subject skill spending from creation points total
  game.settings.register('hogwarts-system', 'excludeSchoolSkillsFromCP', {
    name: 'HOGWARTS.Settings.ExcludeSchoolSkillsFromCP',
    hint: 'HOGWARTS.Settings.ExcludeSchoolSkillsFromCPHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // The rulebook offers two knockout procedures (Chap. 2.7.1 and 2.7.2).
  game.settings.register('hogwarts-system', 'knockoutMethod', {
    name: 'HOGWARTS.Settings.KnockoutMethod',
    hint: 'HOGWARTS.Settings.KnockoutMethodHint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      classic: 'HOGWARTS.Settings.KnockoutClassic',
      alternative: 'HOGWARTS.Settings.KnockoutAlternative'
    },
    default: 'alternative'
  });

  game.settings.register('hogwarts-system', 'applyArmorOnDamage', {
    name: 'HOGWARTS.Settings.ApplyArmorOnDamage',
    hint: 'HOGWARTS.Settings.ApplyArmorOnDamageHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Chap. 2.2 re-rolls initiative at the start of every round.
  game.settings.register('hogwarts-system', 'rerollInitiativeEachRound', {
    name: 'HOGWARTS.Settings.RerollInitiative',
    hint: 'HOGWARTS.Settings.RerollInitiativeHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // The book states the school term gain twice and the two versions disagree:
  // §25.1 (l. 28186) gives a flat 1d6+1, §7.3 (l. 6848) a table that tapers off.
  game.settings.register('hogwarts-system', 'schoolXpMode', {
    name: 'HOGWARTS.Settings.SchoolXpMode',
    hint: 'HOGWARTS.Settings.SchoolXpModeHint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      flat: 'HOGWARTS.Settings.SchoolXpFlat',
      tapered: 'HOGWARTS.Settings.SchoolXpTapered'
    },
    default: 'flat'
  });

  // §8.3 softens what the worked example at l. 2995 states flatly, so both
  // readings are offered.
  game.settings.register('hogwarts-system', 'fougueFailureIsFumble', {
    name: 'HOGWARTS.Settings.FougueFailureIsFumble',
    hint: 'HOGWARTS.Settings.FougueFailureIsFumbleHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // The book spends the point *before* the roll (l. 10199); the chat button
  // lets a table decide afterwards instead.
  game.settings.register('hogwarts-system', 'fougueAfterRoll', {
    name: 'HOGWARTS.Settings.FougueAfterRoll',
    hint: 'HOGWARTS.Settings.FougueAfterRollHint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.registerMenu('hogwarts-system', 'housePointsMenu', {
    name: 'HOGWARTS.HousePoints.Title',
    label: 'HOGWARTS.HousePoints.Open',
    hint: 'HOGWARTS.HousePoints.Hint',
    icon: 'fas fa-hourglass-half',
    type: HousePointsApp,
    restricted: false
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

// Helper: includes(str, substr) -> boolean
Handlebars.registerHelper('includes', function (str, substr) {
  if (typeof str !== 'string' || typeof substr !== 'string') return false;
  return str.includes(substr);
});

// Helper: has(collection, value) -> boolean (Set/Array membership)
Handlebars.registerHelper('has', function (collection, value) {
  if (!collection) return false;
  if (collection instanceof Set) return collection.has(value);
  if (Array.isArray(collection)) return collection.includes(value);
  return false;
});

// Helper: subtract(a, b) -> a - b
Handlebars.registerHelper('subtract', function (a, b) {
  const na = Number(a) || 0;
  const nb = Number(b) || 0;
  return na - nb;
});

// Helper: multiply(a, b) -> a * b
Handlebars.registerHelper('multiply', function (a, b) {
  const na = Number(a) || 0;
  const nb = Number(b) || 0;
  return na * nb;
});

// Helper: gt(a, b) -> boolean (numeric)
Handlebars.registerHelper('gt', function (a, b) {
  return Number(a) > Number(b);
});

// Helper: eq(a, b) -> boolean (string/value equality)
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// Helper: skillName(name) -> localized name for non-custom skills
Handlebars.registerHelper('skillName', function (name) {
  const key = CONFIG?.HOGWARTS?.skillNameKeys?.[name];
  if (key) return game.i18n.localize(key);
  return String(name ?? '');
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));



  // Migration framework: register versioned migrations and run those
  try {
    const manifestPath = 'systems/hogwarts-system/system.json';
    let currentVersion = null;
    try {
      const res = await fetch(manifestPath);
      if (res.ok) {
        const manifest = await res.json();
        currentVersion = manifest.version;
      }
    } catch (e) {
      console.warn('HOGWARTS MIGRATE | Could not fetch manifest at', manifestPath, e);
    }

    if (!currentVersion) {
      console.warn('HOGWARTS MIGRATE | Current version unknown, skipping migrations');
      return;
    }

    // Simple semver comparator (assumes numeric dot-separated parts)
    const compareSemver = (a, b) => {
      if (!a) return -1;
      const pa = String(a).split('.').map(n => Number(n) || 0);
      const pb = String(b).split('.').map(n => Number(n) || 0);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na < nb) return -1;
        if (na > nb) return 1;
      }
      return 0;
    };

    // Register migrations here. Each migration has a target version; it will be
    // executed when appliedVersion < migration.version <= currentVersion.
    const MIGRATIONS = [];

    const appliedVersion = game.settings.get('hogwarts-system', 'migrationVersion') || '';
    if (compareSemver(appliedVersion, currentVersion) === 0) {
      console.log('HOGWARTS MIGRATE | No migration required (version unchanged)', currentVersion);
    } else {
      console.log('HOGWARTS MIGRATE | Detected version change', appliedVersion, '→', currentVersion);
      // Determine applicable migrations
      const applicable = MIGRATIONS
        .filter(m => compareSemver(appliedVersion, m.version) < 0 && compareSemver(m.version, currentVersion) <= 0)
        .sort((a, b) => compareSemver(a.version, b.version));

      for (const mig of applicable) {
        console.log('HOGWARTS MIGRATE | Running migration', mig.version, '-', mig.description);
        try {
          await mig.migrate();
          // Persist progress after each migration so a crash doesn't re-run earlier steps
          await game.settings.set('hogwarts-system', 'migrationVersion', mig.version);
          console.log('HOGWARTS MIGRATE | Applied migration', mig.version);
        } catch (e) {
          console.error('HOGWARTS MIGRATE | Migration failed for', mig.version, e);
          // Stop further migrations on failure to avoid partial state
          break;
        }
      }

      // Finally, ensure the recorded applied version is at least the current
      try {
        await game.settings.set('hogwarts-system', 'migrationVersion', currentVersion);
      } catch (e) {
        console.error('HOGWARTS MIGRATE | Could not persist final migration version', e);
      }
    }
  } catch (err) {
    console.error('HOGWARTS MIGRATE | Unexpected error during migration runner', err);
  }
});

/* -------------------------------------------- */
/*  Chat Message Hooks                          */
/* -------------------------------------------- */

/**
 * Attach click listeners to Apply Damage / Apply Healing buttons rendered
 * inside hogwarts-chat-card chat messages.
 */
Hooks.on('renderChatMessageHTML', (message, html) => {
  for (const btn of html.querySelectorAll('.card-buttons button[data-action]')) {
    btn.addEventListener('click', (ev) => _onChatCardAction(ev, message));
  }
});

/** Open the house points tracker from the token scene controls (Chap. 24.2). */
/**
 * Keep the granted hybrid capability items in step with the declared ancestry
 * (Chap. 17). Only the user who made the change performs the sync, so several
 * connected clients cannot duplicate the items.
 */
Hooks.on('updateActor', async (actor, changed, options, userId) => {
  if (userId !== game.user.id) return;
  if (!foundry.utils.hasProperty(changed, 'system.hybrid')) return;
  await syncHybridCapabilities(actor);
});

/**
 * Replace every capability item this system granted with the ones the current
 * race and generation call for.
 * @param {Actor} actor
 */
export async function syncHybridCapabilities(actor) {
  if (actor.type !== 'character') return;
  const FLAG = 'hybridCapability';
  const stale = actor.items.filter((i) => i.getFlag('hogwarts-system', FLAG)).map((i) => i.id);
  if (stale.length) await actor.deleteEmbeddedDocuments('Item', stale);

  const { race, generation, yumboe, pickCapability } = actor.system.hybrid ?? {};
  const catalogue = CONFIG.HOGWARTS.hybridCapabilities?.[race]?.[generation];
  if (!catalogue) return;

  const raceLabel = game.i18n.localize(CONFIG.HOGWARTS.hybridRaces[race] ?? race);
  const created = [];
  for (const capability of catalogue) {
    if (capability.key === 'Yumboe' && !yumboe) continue;
    const name = game.i18n.localize(`HOGWARTS.Hybrid.Capability.${capability.key}`);
    const detail = capability.choose && pickCapability
      ? game.i18n.format('HOGWARTS.Hybrid.Chosen', { option: pickCapability })
      : '';
    const note = capability.note !== undefined
      ? `<p class="hybrid-note">${game.i18n.localize('HOGWARTS.Hybrid.BookValue')}: ${capability.note}</p>`
      : '';
    created.push({
      name,
      type: 'feature',
      system: {
        perkType: 'abilityNatural',
        description: `<p><em>${raceLabel}</em></p>${note}${detail ? `<p>${detail}</p>` : ''}`,
      },
      flags: { 'hogwarts-system': { [FLAG]: true } },
    });
  }
  if (created.length) await actor.createEmbeddedDocuments('Item', created);
}

Hooks.on('getSceneControlButtons', (controls) => {
  const group = controls?.tokens;
  if (!group?.tools) return;
  group.tools.housePoints = {
    name: 'housePoints',
    order: Object.keys(group.tools).length + 1,
    title: 'HOGWARTS.HousePoints.Title',
    icon: 'fas fa-hourglass-half',
    button: true,
    visible: true,
    onChange: () => new HousePointsApp().render(true),
  };
  group.tools.endScenario = {
    name: 'endScenario',
    order: Object.keys(group.tools).length + 1,
    title: 'HOGWARTS.Fougue.EndScenario',
    icon: 'fas fa-flag-checkered',
    button: true,
    visible: game.user.isGM,
    onChange: () => endScenario(),
  };
  group.tools.quidditch = {
    name: 'quidditch',
    order: Object.keys(group.tools).length + 1,
    title: 'HOGWARTS.Quidditch.Title',
    icon: 'fas fa-broom',
    button: true,
    visible: true,
    onChange: () => new QuidditchApp().render(true),
  };
});

/**
 * Show each player's Quidditch role in the tracker. Roles otherwise live only
 * on combatant flags, so without this the line-up is invisible outside the
 * match dashboard — and the chapter 2 phase badge would be shown instead,
 * which means nothing during a match.
 * @param {HTMLElement} el
 * @param {Combat} combat
 */
function _renderQuidditchRoles(el, combat) {
  for (const row of el.querySelectorAll('.combatant[data-combatant-id]')) {
    const combatant = combat.combatants.get(row.dataset.combatantId);
    const controls = row.querySelector('.combatant-controls');
    if (!combatant || !controls || controls.querySelector('.hogwarts-quidditch-role')) continue;

    const role = combatant.getFlag('hogwarts-system', 'quidditchRole') ?? 'chaser';
    const spec = QUIDDITCH_ROLES[role];
    const badge = document.createElement('span');
    badge.className = `inline-control combatant-control hogwarts-quidditch-role role-${role}`;
    badge.innerHTML = `<i class="${spec?.icon ?? ''}"></i>`;
    badge.dataset.tooltip = game.i18n.localize(spec?.label ?? role);
    controls.prepend(badge);
  }
}

/**
 * Add a phase badge to every combatant row (Chap. 2.4). Clicking cycles the
 * declared phase; Alt-clicking marks the combatant as surprised, which forces
 * them into the third phase for the opening round.
 */
Hooks.on('renderCombatTracker', (app, html) => {
  const el = html instanceof HTMLElement ? html : html[0] ?? html;
  const combat = game.combat;
  if (!combat) return;

  // A Quidditch match has no combat phases: show each player's role instead,
  // which is otherwise invisible outside the match dashboard.
  if (isQuidditch(combat)) return _renderQuidditchRoles(el, combat);

  for (const row of el.querySelectorAll('.combatant[data-combatant-id]')) {
    const combatant = combat.combatants.get(row.dataset.combatantId);
    const controls = row.querySelector('.combatant-controls');
    if (!combatant || !controls || controls.querySelector('.hogwarts-phase')) continue;

    const round = combat.round || 1;
    const phase = combatantPhase(combatant, round);
    const surprised = !!combatant.getFlag('hogwarts-system', 'surprised');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `inline-control combatant-control hogwarts-phase phase-${phase}${surprised ? ' surprised' : ''}`;
    btn.textContent = String(phase);
    btn.dataset.tooltip = `${game.i18n.localize(COMBAT_PHASES[phase])}`
      + (surprised ? ` — ${game.i18n.localize('HOGWARTS.Combat.Surprised')}` : '')
      + `<br>${game.i18n.localize('HOGWARTS.Combat.PhaseHint')}`;

    if (combatant.isOwner) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.altKey) {
          return combatant.setFlag('hogwarts-system', 'surprised', !surprised);
        }
        const current = Number(combatant.getFlag('hogwarts-system', 'phase')) || DEFAULT_PHASE;
        await combatant.setFlag('hogwarts-system', 'phase', (current % 3) + 1);
      });
    } else {
      btn.disabled = true;
    }
    controls.prepend(btn);
  }
});

/**
 * Handle Apply Damage / Apply Healing button clicks on chat cards.
 * Applies the damage value to all targeted or selected tokens.
 * @param {MouseEvent} event
 * @param {ChatMessage} message
 */
async function _onChatCardAction(event, message) {
  event.preventDefault();
  const btn = event.currentTarget;
  const action = btn.dataset.action;

  // ── Use Fougue: reverse dice on a percentile roll ─────────────────────
  if (action === 'use-fougue') {
    return _onUseFougue(btn, message);
  }
  // ── Award the point a critical earns outside combat (l. 10190) ─────────
  if (action === 'grant-fougue') {
    return _onGrantFougue(btn, message);
  }

  // ── The snitch is caught: 150 points and the match ends (l. 29525) ─────
  if (action === 'quidditch-snitch-caught') {
    if (!game.user.isGM) return;
    return QuidditchApp._onScore(null, btn);
  }
  // ── Constitution save prompted by a wound threshold ───────────────────
  if (action === 'roll-con') {
    return _onRollConstitution(btn);
  }

  // ── Apply Damage / Healing / Non-lethal / Knockout ────────────────────
  const value = Number(btn.dataset.value) || 0;
  if (!value) return;

  // Determine targets: user's targets first, then selected tokens
  let tokens = [];
  if (game.user.targets.size > 0) {
    tokens = Array.from(game.user.targets);
  } else if (canvas.tokens?.controlled?.length > 0) {
    tokens = canvas.tokens.controlled;
  }

  if (!tokens.length) {
    ui.notifications.warn(game.i18n.localize('HOGWARTS.Chat.NoTarget'));
    return;
  }

  for (const token of tokens) {
    const actor = token.actor;
    if (!actor) continue;
    if (action === 'apply-damage') await _applyLethalDamage(actor, value);
    else if (action === 'apply-nonlethal') await _applyNonLethalDamage(actor, value);
    else if (action === 'apply-knockout') await _applyKnockout(actor, value);
    else if (action === 'apply-healing') {
      const current = Number(actor.system.health?.value) ?? 0;
      const max = Number(actor.system.health?.max) ?? current;
      await actor.update({ 'system.health.value': Math.min(max, current + value) });
    }
  }

  const labels = {
    'apply-damage': 'HOGWARTS.Chat.ApplyDamage',
    'apply-healing': 'HOGWARTS.Chat.ApplyHealing',
    'apply-nonlethal': 'HOGWARTS.Chat.ApplyNonLethal',
    'apply-knockout': 'HOGWARTS.Chat.ApplyKnockout',
  };
  ui.notifications.info(`${game.i18n.localize(labels[action] ?? labels['apply-damage'])}: ${value} → ${tokens.length} cible(s)`);
}

/**
 * Armour damage reduction for an actor, by actor type (Chap. 2.8.1).
 * Characters sum their worn armour items; NPCs and creatures carry a flat value.
 * @param {Actor} actor
 * @returns {number}
 */
function _actorArmor(actor) {
  if (!game.settings.get('hogwarts-system', 'applyArmorOnDamage')) return 0;
  const sys = actor.system ?? {};
  if (typeof sys.armor === 'number') return sys.armor;          // character (derived), npc
  if (typeof sys.armor?.value === 'number') return sys.armor.value; // creature
  return 0;
}

/**
 * Apply lethal damage and report every wound threshold the rules define.
 * Thresholds are only reported — the Constitution saves are rolled from the card.
 * @param {Actor} actor
 * @param {number} raw - Damage before armour
 */
async function _applyLethalDamage(actor, raw) {
  const armor = _actorArmor(actor);
  const dealt = Math.max(0, raw - armor);
  const before = Number(actor.system.health?.value) || 0;
  const after = Math.max(0, before - dealt);

  const updates = { 'system.health.value': after };
  const notes = [];
  if (armor > 0) notes.push(game.i18n.format('HOGWARTS.Wound.ArmorAbsorbed', { armor, dealt }));

  // An unconscious target taking any further damage dies outright (Chap. 1.10.2).
  const wasUnconscious = actor.system.conditions?.unconscious === true;

  if (after <= 0 || (wasUnconscious && dealt > 0)) {
    updates['system.conditions.agony'] = false;
    await actor.update(updates);
    await _setDeadStatus(actor);
    return _postWoundCard(actor, dealt, notes, [], wasUnconscious && after > 0
      ? 'HOGWARTS.Wound.DeathWhileUnconscious'
      : 'HOGWARTS.Wound.Death');
  }

  const saves = [];
  // Losing half of CURRENT hit points in a single blow (Chap. 1.8.1)
  if (dealt > 0 && dealt >= Math.ceil(before / 2)) {
    updates['system.conditions.seriousWound'] = true;
    saves.push({ mult: 5, key: 'HOGWARTS.Wound.SeriousWound', unit: 'minutes' });
  }
  // At 1 hit point, a Constitution save is required every round (Chap. 1.8.2)
  if (after === 1) {
    updates['system.conditions.agony'] = true;
    saves.push({ mult: 3, key: 'HOGWARTS.Wound.Agony', unit: 'hours' });
  }

  await actor.update(updates);
  return _postWoundCard(actor, dealt, notes, saves);
}

/**
 * Apply non-lethal damage to its separate pool (Chap. 1.10.2).
 * @param {Actor} actor
 * @param {number} raw
 * @param {object} [options]
 * @param {boolean} [options.silent] - Skip the chat card and return the outcome instead,
 *                                    so a knockout attempt can post a single card.
 */
async function _applyNonLethalDamage(actor, raw, { silent = false } = {}) {
  const armor = _actorArmor(actor);
  const dealt = Math.max(0, raw - armor);
  const hp = Number(actor.system.health?.value) || 0;
  const before = Number(actor.system.healthNonLethal?.value) || 0;
  const total = before + dealt;

  const notes = [];
  if (armor > 0) notes.push(game.i18n.format('HOGWARTS.Wound.ArmorAbsorbed', { armor, dealt }));

  const updates = {
    'system.healthNonLethal.value': total,
    'system.conditions.staggered': total === hp,
    'system.conditions.unconscious': total > hp,
  };
  await actor.update(updates);

  let outcome = null;
  if (total > hp) outcome = 'HOGWARTS.Wound.Unconscious';
  else if (total === hp) outcome = 'HOGWARTS.Wound.Staggered';
  if (silent) return { dealt, notes, outcome };
  return _postWoundCard(actor, dealt, notes, [], outcome, 'HOGWARTS.Chat.ApplyNonLethal');
}

/**
 * Deliberate knockout attempt (Chap. 2.7). Non-lethal damage is applied, then
 * the configured procedure decides whether the target goes down.
 * @param {Actor} actor
 * @param {number} raw
 */
async function _applyKnockout(actor, raw) {
  const method = game.settings.get('hogwarts-system', 'knockoutMethod');
  const armor = _actorArmor(actor);
  const dealt = Math.max(0, raw - armor);
  const hp = Number(actor.system.health?.value) || 0;

  const nl = await _applyNonLethalDamage(actor, raw, { silent: true });
  const notes = [...nl.notes];
  if (nl.outcome) notes.push(game.i18n.localize(nl.outcome));
  const TITLE = 'HOGWARTS.Chat.ApplyKnockout';

  if (method === 'classic') {
    // Resistance table: active = damage dealt, passive = hit points remaining
    const target = Math.clamp(50 - hp * 5 + dealt * 5, 1, 99);
    const roll = new Roll('1d100');
    await roll.evaluate();
    const success = roll.total <= target;
    notes.push(game.i18n.format('HOGWARTS.Wound.KnockoutClassic', { dealt, hp, target, roll: roll.total }));
    if (success) await actor.update({ 'system.conditions.unconscious': true });
    return _postWoundCard(actor, dealt, notes, [],
      success ? 'HOGWARTS.Wound.KnockedOut' : 'HOGWARTS.Wound.KnockoutResisted', TITLE, [roll]);
  }

  // Alternative: thresholds at 25 / 50 / 75 % of hit points lost, rounded up
  let mult = 0;
  if (dealt >= Math.ceil(hp * 0.75)) mult = 1;
  else if (dealt >= Math.ceil(hp * 0.5)) mult = 2;
  else if (dealt >= Math.ceil(hp * 0.25)) mult = 3;

  if (!mult) return _postWoundCard(actor, dealt, notes, [], 'HOGWARTS.Wound.KnockoutNoThreshold', TITLE);
  const pct = mult === 1 ? 75 : mult === 2 ? 50 : 25;
  notes.push(game.i18n.format('HOGWARTS.Wound.KnockoutThreshold', { pct, dealt }));
  return _postWoundCard(actor, dealt, notes,
    [{ mult, key: 'HOGWARTS.Wound.KnockoutSave', unit: 'hours', knockout: true }], null, TITLE);
}

/**
 * Mark an actor as dead using the core status effect.
 * @param {Actor} actor
 */
async function _setDeadStatus(actor) {
  try {
    const id = CONFIG.specialStatusEffects?.DEFEATED ?? 'dead';
    const already = actor.effects.some(e => e.statuses?.has?.(id));
    if (!already) await actor.toggleStatusEffect(id, { active: true, overlay: true });
  } catch (e) {
    console.warn('HOGWARTS | Could not apply the dead status', e);
  }
}

/**
 * Post the wound summary card, with a button for each Constitution save owed.
 * @param {Actor} actor
 * @param {number} dealt
 * @param {string[]} notes
 * @param {{mult: number, key: string, unit: string, knockout?: boolean}[]} saves
 * @param {string|null} outcome - i18n key of a terminal outcome, if any
 * @param {string} titleKey - i18n key used as the card type label
 * @param {Roll[]} rolls
 */
async function _postWoundCard(actor, dealt, notes, saves, outcome = null, titleKey = 'HOGWARTS.Chat.ApplyDamage', rolls = []) {
  const title = game.i18n.localize(titleKey);
  let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${actor.name}</h3><span class="card-type">${title}</span></header>`;
  content += `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Wound.Dealt')}:</strong> ${dealt}</div>`;
  for (const n of notes) content += `<div class="card-row">${n}</div>`;
  if (outcome) content += `<div class="card-row wound-outcome">${game.i18n.localize(outcome)}</div>`;
  if (saves.length) {
    content += '<div class="card-buttons">';
    for (const s of saves) {
      const label = game.i18n.format('HOGWARTS.Wound.RollCon', { mult: s.mult, reason: game.i18n.localize(s.key) });
      content += `<button data-action="roll-con" data-value="1" data-actor-id="${actor.id}" data-mult="${s.mult}" data-unit="${s.unit}" data-knockout="${s.knockout ? 1 : 0}"><i class="fas fa-dice-d20"></i> ${label}</button>`;
    }
    content += '</div>';
  }
  content += '</div>';
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Roll a Constitution save owed by a wound threshold, and report the duration
 * of unconsciousness on a failure.
 * @param {HTMLElement} btn
 */
async function _onRollConstitution(btn) {
  const actor = game.actors.get(btn.dataset.actorId);
  if (!actor) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Chat.NoTarget'));
  const mult = Number(btn.dataset.mult) || 5;
  const unit = btn.dataset.unit || 'minutes';
  const isKnockout = btn.dataset.knockout === '1';
  const con = Number(actor.system.stats?.con?.total ?? actor.system.stats?.con?.value) || 0;
  const target = con * mult;

  const roll = new Roll('1d100');
  await roll.evaluate();
  const success = roll.total <= target;
  // Knockout duration is CON hours; wound thresholds use (21 - CON).
  const duration = isKnockout ? con : Math.max(1, 21 - con);
  const unitLabel = game.i18n.localize(`HOGWARTS.Wound.Unit.${unit}`);

  // Both wound thresholds and knockout attempts render the target unconscious on a failure.
  if (!success) await actor.update({ 'system.conditions.unconscious': true });

  let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${actor.name}</h3>`;
  content += `<span class="card-type">CON×${mult}</span></header>`;
  content += `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> <span class="roll-value">${roll.total}</span> / ${target}</div>`;
  content += `<div class="card-row wound-outcome">${success
    ? game.i18n.localize('HOGWARTS.Wound.SaveSuccess')
    : game.i18n.format('HOGWARTS.Wound.SaveFailure', { duration, unit: unitLabel })}</div>`;
  if (isKnockout && !success) content += `<div class="card-row">${game.i18n.localize('HOGWARTS.Wound.KnockoutThirdDamage')}</div>`;
  content += '</div>';

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Handle the "Use Fougue" button click on a chat card.
 * Reverses the d100 digits, spends 1 fougue point, and updates the chat message.
 * @param {HTMLElement} btn - The clicked button element
 * @param {ChatMessage} message - The chat message document
 */
async function _onUseFougue(btn, message) {
  const rollValue = Number(btn.dataset.roll) || 0;
  const targetValue = Number(btn.dataset.target) || 0;
  const actorId = btn.dataset.actorId;
  if (!rollValue || !actorId) return;

  const actor = game.actors.get(actorId);
  if (!actor) return;

  // Only the owning player(s) or GM can use fougue
  if (!actor.isOwner) {
    ui.notifications.warn(game.i18n.localize('HOGWARTS.Chat.NotOwner'));
    return;
  }

  // Check fougue available
  const currentFougue = Number(actor.system.fougue?.value) || 0;
  if (currentFougue <= 0) {
    ui.notifications.warn(game.i18n.localize('HOGWARTS.Chat.NoFougue'));
    return;
  }

  // Reverse the dice
  const reversed = reverseDice(rollValue);

  // Spend 1 fougue
  await actor.update({ 'system.fougue.value': currentFougue - 1 });

  // Recalculate degree with the reversed value; missing an action after
  // spending a point is treated as a fumble (l. 2995).
  const degree = fougueDegree(degreeOf(reversed, targetValue));

  // Build the new degree badge
  const degreeLabel = game.i18n.localize(`HOGWARTS.Roll.Degree.${degree}`);
  const cls = degree.toLowerCase();
  const degreeBadge = `<span class="degree ${cls}">${degreeLabel}</span>`;
  const fougueTag = `<span class="fougue-tag">${game.i18n.localize('HOGWARTS.Roll.FougueReversed')}</span>`;

  // Update the chat message content: replace roll value + degree, remove fougue button
  let content = message.content;
  // Replace the roll-value span and degree badge in the roll row
  content = content.replace(
    /<span class="roll-value">\d+<\/span>(?:<span class="fougue-tag">.*?<\/span>)?\s*→\s*<span class="degree \w+">[^<]+<\/span>/,
    `<span class="roll-value">${reversed}</span>${fougueTag} → ${degreeBadge}`
  );
  // Remove the fougue buttons section
  content = content.replace(/<div class="card-buttons">[\s\S]*?<button[^>]*data-action="use-fougue"[^>]*>[\s\S]*?<\/div>/, '');

  await message.update({ content });
  ui.notifications.info(`${game.i18n.localize('HOGWARTS.Chat.UseFougue')}: ${rollValue} → ${reversed}`);
}

/**
 * Award the fougue point a critical earns (l. 10190). Gamemaster only: the book
 * requires an action "accomplie passionnément" and excludes combat (§8.4),
 * neither of which the system can decide on its own.
 * @param {HTMLElement} btn
 * @param {ChatMessage} message
 */
async function _onGrantFougue(btn, message) {
  if (!game.user.isGM) return;
  const actor = game.actors.get(btn.dataset.actorId);
  if (!actor) return;

  const current = Number(actor.system.fougue?.value) || 0;
  const max = Number(actor.system.fougue?.max) || 5;
  if (current >= max) {
    ui.notifications.warn(game.i18n.format('HOGWARTS.Chat.FougueAtMax', { max }));
    return;
  }

  await actor.update({ 'system.fougue.value': current + 1 });
  const content = message.content.replace(
    /<div class="card-buttons">[\s\S]*?<button[^>]*data-action="grant-fougue"[^>]*>[\s\S]*?<\/div>/,
    `<div class="card-row points-gain">${game.i18n.format('HOGWARTS.Chat.FougueGranted', { name: actor.name, total: current + 1 })}</div>`
  );
  await message.update({ content });
}

/**
 * Close a scenario: fougue drops to 0 and everyone starts the next one with a
 * single point (l. 10193).
 */
async function endScenario() {
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize('HOGWARTS.Fougue.EndScenario') },
    content: `<p>${game.i18n.localize('HOGWARTS.Fougue.EndScenarioConfirm')}</p>`,
  }).catch(() => false);
  if (!ok) return;

  const characters = game.actors.filter((a) => a.type === 'character');
  for (const actor of characters) {
    await actor.update({ 'system.fougue.value': 1 });
  }
  await ChatMessage.create({
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Fougue.EndScenario')}</h3></header>
      <div class="card-row">${game.i18n.format('HOGWARTS.Fougue.EndScenarioDone', { count: characters.length })}</div>
    </div>`,
  });
}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.hogwartssystem.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'hogwarts-system.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
