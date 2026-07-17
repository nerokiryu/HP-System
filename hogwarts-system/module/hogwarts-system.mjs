// Import document classes.
import { HogwartsActor } from './documents/actor.mjs';
import { HogwartsItem } from './documents/item.mjs';
// Import sheet classes.
import { HogwartsActorSheet } from './sheets/actor-sheet.mjs';
import { HogwartsItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { HOGWARTS } from './helpers/config.mjs';
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
    formula: '1d6 + @stats.dex.value + @system.initiativeBonus',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = HogwartsActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.HogwartsCharacter,
    npc: models.HogwartsNPC,
    familiar: models.HogwartsFamiliar,
    creature: models.HogwartsCreature,
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
    makeDefault: true,
    label: 'HOGWARTS.SheetLabels.Actor',
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

  // World setting: house points tracker (persisted as a JSON object)
  game.settings.register('hogwarts-system', 'housePoints', {
    name: 'HOGWARTS.HousePoints.Title',
    scope: 'world',
    config: false,
    type: Object,
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
/*  Compendium Translation                      */
/* -------------------------------------------- */

/**
 * Patches the in-memory compendium index with localized names from the active
 * language file (HOGWARTS.Packs.<packName>.<id>.name).
 * Called once on `ready` — does not modify stored data.
 */
function _patchCompendiumIndex() {
  const packTranslations = foundry.utils.getProperty(game.i18n.translations, 'HOGWARTS.Packs') ?? {};
  for (const [packName, entries] of Object.entries(packTranslations)) {
    const pack = game.packs.find(
      p => p.metadata.name === packName && p.metadata.system === 'hogwarts-system'
    );
    if (!pack) continue;
    for (const [id, trans] of Object.entries(entries)) {
      const entry = pack.index.get(id);
      if (entry && trans.name) entry.name = trans.name;
    }
  }
}

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));

  // Apply localized names to compendium entries based on the active language
  _patchCompendiumIndex();



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
    const MIGRATIONS = [
      {
        version: '3.0.0',
        description: 'Rename `system.biography` -> `system.bio` for actors',
        migrate: async () => {
          let migrated = 0;
          for (const actor of game.actors.contents) {
            try {
              const bioSource = actor.system?.biography;
              const bioTarget = actor.system?.bio;
              if (bioSource && !bioTarget) {
                await actor.update({ 'system.bio': bioSource });
                migrated++;
              }
            } catch (e) {
              console.error('HOGWARTS MIGRATE | Failed migrating actor', actor.id, e);
            }
          }
          console.log(`HOGWARTS MIGRATE | 3.0.0 migration moved bio for ${migrated} actor(s)`);
        }
      },
      {
        version: '3.1.0',
        description: 'Seed NPC stats/skills defaults; add fougue/stress/movement to characters',
        migrate: async () => {
          let migrated = 0;
          for (const actor of game.actors.contents) {
            try {
              const updateData = {};

              // NPC: seed stats if not present (schema defaults handle new fields,
              // but existing documents need explicit update for the stats object)
              if (actor.type === 'npc' && !actor.system.stats) {
                const defaultStats = {};
                for (const key of Object.keys(CONFIG.HOGWARTS.stats)) {
                  defaultStats[key] = { value: 10 };
                }
                updateData['system.stats'] = defaultStats;
                updateData['system.skills'] = [];
                updateData['system.damage'] = '1d3';
                updateData['system.armor'] = 0;
                updateData['system.movement'] = 8;
              }

              // Character: seed new fields if not present
              if (actor.type === 'character') {
                if (actor.system.fougue === undefined) {
                  updateData['system.fougue'] = { value: 1, max: 1 };
                }
                if (actor.system.stress === undefined) {
                  updateData['system.stress'] = { value: 0 };
                }
                if (actor.system.movement === undefined) {
                  updateData['system.movement'] = 8;
                }
              }

              if (Object.keys(updateData).length > 0) {
                await actor.update(updateData);
                migrated++;
              }
            } catch (e) {
              console.error('HOGWARTS MIGRATE | Failed migrating actor', actor.id, e);
            }
          }
          console.log(`HOGWARTS MIGRATE | 3.1.0 migration updated ${migrated} actor(s)`);
        }
      }
    ];

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
Hooks.on('renderChatMessage', (message, html) => {
  // html is a jQuery-like HTMLElement in v14
  const el = html instanceof HTMLElement ? html : html[0] ?? html;
  const buttons = el.querySelectorAll('.card-buttons button[data-action]');
  for (const btn of buttons) {
    btn.addEventListener('click', (ev) => _onChatCardAction(ev, message));
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

  // ── Apply Damage / Apply Healing ──────────────────────────────────────
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

    if (action === 'apply-damage') {
      const current = Number(actor.system.health?.value) ?? 0;
      const newVal = Math.max(0, current - value);
      await actor.update({ 'system.health.value': newVal });
    } else if (action === 'apply-healing') {
      const current = Number(actor.system.health?.value) ?? 0;
      const max = Number(actor.system.health?.max) ?? current;
      const newVal = Math.min(max, current + value);
      await actor.update({ 'system.health.value': newVal });
    }
  }

  // Provide feedback
  const count = tokens.length;
  const actionLabel = action === 'apply-damage'
    ? game.i18n.localize('HOGWARTS.Chat.ApplyDamage')
    : game.i18n.localize('HOGWARTS.Chat.ApplyHealing');
  ui.notifications.info(`${actionLabel}: ${value} → ${count} cible(s)`);
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
  let reversed;
  if (rollValue === 100) reversed = 1;
  else {
    const str = String(rollValue).padStart(2, '0');
    reversed = parseInt(str.split('').reverse().join(''), 10) || 1;
  }

  // Spend 1 fougue
  await actor.update({ 'system.fougue.value': currentFougue - 1 });

  // Recalculate degree with the reversed value
  const useExtendedTiers = game.settings.get('hogwarts-system', 'useExtendedSuccessTiers') ?? false;
  let degree = 'Fail';
  if (reversed <= 5) degree = 'Critical';
  else if (useExtendedTiers && reversed <= Math.ceil(targetValue / 5)) degree = 'Extreme';
  else if (useExtendedTiers && reversed <= Math.ceil(targetValue / 2)) degree = 'Hard';
  else if (reversed <= targetValue) degree = 'Success';
  else if (reversed >= 96) degree = 'Fumble';

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
