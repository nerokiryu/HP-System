export const HOGWARTS = {};

/**
 * BRP-like core characteristics used by the system.
 * We expose full and abbreviated labels for i18n.
 */
HOGWARTS.stats = {
  str: 'HOGWARTS.Stat.Str.long',
  con: 'HOGWARTS.Stat.Con.long',
  siz: 'HOGWARTS.Stat.Siz.long',
  dex: 'HOGWARTS.Stat.Dex.long',
  int: 'HOGWARTS.Stat.Int.long',
  pow: 'HOGWARTS.Stat.Pow.long',
  app: 'HOGWARTS.Stat.App.long',
  per: 'HOGWARTS.Stat.Per.long',
};

HOGWARTS.statAbbreviations = {
  str: 'HOGWARTS.Stat.Str.abbr',
  con: 'HOGWARTS.Stat.Con.abbr',
  siz: 'HOGWARTS.Stat.Siz.abbr',
  dex: 'HOGWARTS.Stat.Dex.abbr',
  int: 'HOGWARTS.Stat.Int.abbr',
  pow: 'HOGWARTS.Stat.Pow.abbr',
  app: 'HOGWARTS.Stat.App.abbr',
  per: 'HOGWARTS.Stat.Per.abbr',
};

/**
 * Example skills list (placeholders, adjust to taste).
 */
HOGWARTS.skills = {
  charms: 'HOGWARTS.Skill.Charms',
  transfiguration: 'HOGWARTS.Skill.Transfiguration',
  potions: 'HOGWARTS.Skill.Potions',
  dada: 'HOGWARTS.Skill.DADA',
  herbology: 'HOGWARTS.Skill.Herbology',
  flying: 'HOGWARTS.Skill.Flying',
  history: 'HOGWARTS.Skill.History',
  quidditch: 'HOGWARTS.Skill.Quidditch',
};

/**
 * Houses and school years (for UI selections later, optional).
 */
HOGWARTS.houses = {
  gryffindor: 'HOGWARTS.House.Gryffindor',
  slytherin: 'HOGWARTS.House.Slytherin',
  ravenclaw: 'HOGWARTS.House.Ravenclaw',
  hufflepuff: 'HOGWARTS.House.Hufflepuff',
};

HOGWARTS.schoolYears = [1, 2, 3, 4, 5, 6, 7];

/**
 * Character archetypes from Harry Potter JdR creation step 1.
 * Each archetype suggests stat priority and playstyle.
 */
HOGWARTS.archetypes = {
  '': 'HOGWARTS.Actor.Character.Archetype.none',
  canaille: 'HOGWARTS.Actor.Character.Archetype.canaille',
  cerebral: 'HOGWARTS.Actor.Character.Archetype.cerebral',
  honnete: 'HOGWARTS.Actor.Character.Archetype.honnete',
  manipulateur: 'HOGWARTS.Actor.Character.Archetype.manipulateur',
  naturaliste: 'HOGWARTS.Actor.Character.Archetype.naturaliste',
  sportif: 'HOGWARTS.Actor.Character.Archetype.sportif',
};

/**
 * Preset skills with base and max values, grouped by category.
 * Names are provided by the user; you can adjust later.
 */
HOGWARTS.skillPresets = {
  general: [
    { name: 'Acrobatie/Quidditch', base: 10, max: 60 },
    { name: 'Artisanat', base: 5, max: 30 },
    { name: 'Athlétisme', base: 20, max: 75 },
    { name: 'Bagarre', base: 10, max: 50 },
    { name: 'Bibliothèque', base: 15, max: 75 },
    { name: 'Commandement', base: 10, max: 60 },
    { name: 'Connaissance (...)', base: 10, max: 50 },
    { name: 'Déguisement', base: 5, max: 55 },
    { name: 'Discrétion', base: 10, max: 60 },
    { name: 'Dressage/Soin', base: 10, max: 30 },
    { name: 'Empathie', base: 20, max: 75 },
    { name: 'Esquive', base: 25, max: 80 },
    { name: 'Fouille/Ménage', base: 20, max: 80 },
    { name: 'Langue étrangère (...)', base: 0, max: 95 },
    { name: 'Langue natale', base: 70, max: 95 },
    { name: 'Orientation', base: 20, max: 80 },
    { name: 'Persuasion/Baratin', base: 10, max: 80 },
    { name: 'Psychologie', base: 5, max: 70 },
    { name: 'Secourisme', base: 0, max: 20 },
    { name: 'Survie', base: 0, max: 20 },
    { name: 'Triche', base: 0, max: 40 },
    { name: 'Vigilance', base: 20, max: 75 }
  ],
  wizard: [
    { name: 'Connaissance (...) (S)', base: 0, max: 50 },
    { name: 'Connaissance des Moldus (S)', base: 0, max: 40 },
    { name: 'Culture générale des sorciers (S)', base: 0, max: 80 },
    { name: 'Jeux sorciers (S)', base: 0, max: 80 },
    { name: 'Langue (Latin) (S)', base: 0, max: 95 },
    { name: 'Mythes et légendes des sorciers (S)', base: 0, max: 75 }
  ],
  muggle: [
    { name: 'Bricolage (M)', base: 0, max: 50 },
    { name: 'Conduire (M)', base: 0, max: 30 },
    { name: 'Connaissance (...) (M)', base: 0, max: 50 },
    { name: 'Culture générale Moldue (M)', base: 0, max: 80 },
    { name: 'Jeux Moldus (M)', base: 0, max: 80 },
    { name: 'Langue (Latin) (M)', base: 0, max: 95 },
    { name: 'Sérrurerie (M)', base: 0, max: 50 }
  ],
  school: [
    { name: 'Arithmancie', base: 0, max: 95 },
    { name: 'Art magique', base: 0, max: 95 },
    { name: 'Art moldu', base: 0, max: 95 },
    { name: 'Astronomie', base: 0, max: 95 },
    { name: 'Botanique', base: 0, max: 95 },
    { name: 'Défenses contre les forces du mal', base: 0, max: 95 },
    { name: 'Divination', base: 0, max: 95 },
    { name: 'Enchantements', base: 5, max: 95 },
    { name: 'Etude des Moldus', base: 0, max: 95 },
    { name: 'Etude des runes', base: 0, max: 95 },
    { name: 'Histoire de la magie', base: 0, max: 95 },
    { name: 'Mauvais sorts', base: 0, max: 95 },
    { name: 'Métamorphose', base: 0, max: 95 },
    { name: 'Musique magique', base: 0, max: 95 },
    { name: 'Musique moldue', base: 5, max: 95 },
    { name: 'Potions', base: 0, max: 95 },
    { name: 'Soin aux créatures magiques', base: 0, max: 95 },
    { name: 'Vol en balai', base: 0, max: 95 }
  ]
  ,
  // Specific school courses (rulebook §6.6). Kept out of `school` on purpose:
  // they start in year 3 or 6, so the yearly max progression must not apply.
  special: [
    { name: 'Alchimie', base: 0, max: 95 },
    { name: 'Duels', base: 0, max: 95 },
    // Base/max granted by the Legilimens and Occlumens advantages.
    { name: 'Legilimancie', base: 15, max: 80 },
    { name: 'Occlumancie', base: 15, max: 80 }
  ]
};

// Build a mapping from preset display names to i18n keys
HOGWARTS.skillNameKeys = {};
for (const list of Object.values(HOGWARTS.skillPresets)) {
  for (const entry of list) {
    if (!HOGWARTS.skillNameKeys[entry.name]) {
      HOGWARTS.skillNameKeys[entry.name] = `HOGWARTS.SkillDisplay.${entry.name}`;
    }
  }
}

// House points (Chap. 24.2). Values are the magnitude awarded or removed for a
// given teacher mood; the mood itself is rolled on 1d100 with different bands
// depending on whether points are being taken away or granted.
HOGWARTS.housePointMoods = {
  loss: [
    { id: 'good', min: 1, max: 20 },
    { id: 'neutral', min: 21, max: 75 },
    { id: 'bad', min: 76, max: 95 },
    { id: 'auto', min: 96, max: 100 },
  ],
  gain: [
    { id: 'auto', min: 1, max: 5 },
    { id: 'good', min: 6, max: 25 },
    { id: 'neutral', min: 26, max: 80 },
    { id: 'bad', min: 81, max: 100 },
  ],
};

HOGWARTS.housePointActions = {
  loss: {
    inClass: [
      { key: 'Chatter', good: 5, neutral: 10, bad: 20 },
      { key: 'Curiosity', good: 5, neutral: 10, bad: 15 },
      { key: 'WasteMaterial', good: 10, neutral: 15, bad: 20 },
      { key: 'Insolence', good: 5, neutral: 10, bad: 20 },
      { key: 'InsultTeacher', good: 15, neutral: 25, bad: 35 },
      { key: 'ReadNewspaper', good: 10, neutral: 20, bad: 30 },
      { key: 'SpeakUninvited', good: 5, neutral: 10, bad: 15 },
      { key: 'RefuseHelp', good: 0, neutral: 5, bad: 10 },
      { key: 'RefuseRequest', good: 5, neutral: 10, bad: 15 },
      { key: 'Late', good: 10, neutral: 15, bad: 20 },
      { key: 'StealMaterial', good: 20, neutral: 25, bad: 30 },
    ],
    outsideClass: [
      { key: 'Fight', good: 5, neutral: 10, bad: 20 },
      { key: 'ShoutGreatHall', good: 5, neutral: 10, bad: 15 },
      { key: 'DestroyObject', good: 10, neutral: 20, bad: 30 },
      { key: 'InsultTeacher', good: 15, neutral: 25, bad: 35 },
      { key: 'BadAttire', good: 5, neutral: 10, bad: 15 },
      { key: 'NightWandering', good: 10, neutral: 20, bad: 30 },
      { key: 'ForbiddenForest', good: 20, neutral: 30, bad: 40 },
      { key: 'BookOutside', good: 5, neutral: 10, bad: 15 },
    ],
  },
  gain: {
    inClass: [
      { key: 'GoodAnswer', bad: 5, neutral: 10, good: 15 },
      { key: 'PredictionComesTrue', bad: 10, neutral: 15, good: 20 },
      { key: 'BroomFigures', bad: 5, neutral: 10, good: 15 },
      { key: 'MasterSpellPotion', bad: 5, neutral: 10, good: 15 },
      { key: 'BroomFigure', bad: 10, neutral: 15, good: 20 },
      { key: 'WinDuel', bad: 10, neutral: 15, good: 20 },
      { key: 'SolveRiddle', bad: 10, neutral: 20, good: 30 },
      { key: 'HealCreature', bad: 10, neutral: 15, good: 20 },
      { key: 'TranslateRunes', bad: 10, neutral: 15, good: 20 },
      { key: 'DefeatBoggart', bad: 5, neutral: 10, good: 15 },
    ],
    outsideClass: [
      { key: 'HelpStudent', bad: 10, neutral: 15, good: 20 },
      { key: 'HigherYearMastery', bad: 10, neutral: 15, good: 20 },
      { key: 'ExcellentHomework', bad: 5, neutral: 10, good: 15 },
      { key: 'OpposeInjustice', bad: 5, neutral: 10, good: 15 },
      { key: 'TidyClassroom', bad: 5, neutral: 10, good: 15 },
      { key: 'ClubTournamentWin', bad: 15, neutral: 25, good: 50 },
    ],
  },
};

/* -------------------------------------------- */
/*  Hybrid characters (Chap. 17)                 */
/* -------------------------------------------- */

/**
 * Generations separating a character from its magical ancestor, with the
 * creation cost the book attaches to each (l. 24663-24665, 25224).
 */
HOGWARTS.hybridGenerations = {
  half: { label: 'HOGWARTS.Hybrid.Generation.Half', symbol: '½', cost: 2 },
  quarter: { label: 'HOGWARTS.Hybrid.Generation.Quarter', symbol: '¼', cost: 1.5 },
  eighth: { label: 'HOGWARTS.Hybrid.Generation.Eighth', symbol: '⅛', cost: 1 },
  fate: { label: 'HOGWARTS.Hybrid.Generation.Fate', symbol: '½', cost: 0 },
  resurgent: { label: 'HOGWARTS.Hybrid.Generation.Resurgent', symbol: '—', cost: 0.5 },
};

HOGWARTS.hybridRaces = {
  elf: 'HOGWARTS.Hybrid.Race.Elf',
  giant: 'HOGWARTS.Hybrid.Race.Giant',
  goblin: 'HOGWARTS.Hybrid.Race.Goblin',
  troll: 'HOGWARTS.Hybrid.Race.Troll',
  vampire: 'HOGWARTS.Hybrid.Race.Vampire',
  veela: 'HOGWARTS.Hybrid.Race.Veela',
};

/**
 * Characteristic adjustments per race and generation (§17.1 table, l. 24678-24689
 * and §17.3 table for `resurgent`).
 *
 * `pick` lists starred entries: the player keeps one value of the list and the
 * others fall to ±0. Bonuses and penalties are picked independently.
 */
HOGWARTS.hybridStatAdjustments = {
  elf: {
    half: { str: -1, con: -1, siz: -2, per: 2, dex: 2, app: -1, pow: -2 },
    quarter: { siz: -1, per: 1, dex: 1, pow: -1 },
    eighth: { pick: { bonus: { per: 1, dex: 1 }, malus: { siz: -1, pow: -1 } } },
    fate: { str: -1, con: -1, siz: -2, per: 2, dex: 2, app: -1, pow: -2 },
    resurgent: { siz: -1, per: 1 },
  },
  giant: {
    half: { str: 3, con: 3, siz: 4, per: -2, dex: -2, app: -1 },
    quarter: { str: 2, con: 2, siz: 3, per: -1, dex: -1 },
    eighth: { str: 1, con: 1, siz: 2, dex: -1 },
    fate: { str: 3, con: 3, siz: 4, per: -2, dex: -2, app: -1 },
    resurgent: { siz: 2, per: -1, dex: -1 },
  },
  goblin: {
    half: { str: -1, siz: -2, int: 3, pow: 2 },
    quarter: { siz: -1, int: 2, pow: 1 },
    eighth: { siz: -1, pick: { bonus: { int: 1, pow: 1 } } },
    fate: null,
    resurgent: { siz: -1, int: 1 },
  },
  troll: {
    half: { str: 2, con: 2, siz: 1, dex: -1, app: -2 },
    quarter: { str: 1, con: 1, app: -1 },
    eighth: { app: -1, pick: { bonus: { str: 1, con: 1 } } },
    fate: { str: 2, con: 2, siz: 1, dex: -1, app: -2 },
    resurgent: { con: 1, app: -1 },
  },
  vampire: {
    half: { str: 1, con: -2, dex: 1, app: 1, pow: 1 },
    quarter: { con: -1, dex: 1, app: 1 },
    eighth: { con: -1, pick: { bonus: { dex: 1, app: 1 } } },
    fate: null,
    resurgent: { con: -1, app: 1 },
  },
  veela: {
    half: { str: -1, con: -2, dex: 1, app: 2, pow: 1 },
    quarter: { con: -1, app: 2 },
    eighth: { app: 1 },
    fate: null,
    resurgent: { con: -1, app: 1 },
  },
};

/**
 * Magical capabilities per race and generation (§17.2 tables, l. 24936-25213,
 * and §17.3 for `resurgent`). Descriptions live in the Encyclopédie.
 *
 * Machine-readable effects are applied automatically:
 *   skillBonus  {name: percent}  flat bonus to a skill
 *   skillXp     [names]          experience gained is a third higher
 *   newSkill    {name,base,max}  grants a skill the character would not have
 *   spellMalus / potionMalus     penalty when casting / brewing
 *   wandless    percent          reduces the penalty for casting without a wand
 * Everything else is granted as a descriptive feature item for the Gamemaster
 * to arbitrate, keeping the book's numbers in `note` for reference.
 */
HOGWARTS.hybridCapabilities = {
  elf: {
    half: [
      { key: 'Anonymity' },
      { key: 'Wandless', wandless: 5 },
      { key: 'AlertStealth', skillBonus: { 'Vigilance': 10, 'Discrétion': 10 }, skillXp: ['Vigilance', 'Discrétion'] },
      { key: 'MagicalWeakness', spellMalus: 10, potionMalus: 5 },
      { key: 'Yumboe', note: 15, optional: true, extraCost: 0.5 },
    ],
    quarter: [
      { key: 'Anonymity' },
      { key: 'Wandless', wandless: 5 },
      { key: 'AlertOrStealth', choose: 1, options: ['Vigilance', 'Discrétion'], bonus: 10, xp: true },
      { key: 'MagicalWeakness', spellMalus: 5, potionMalus: 2 },
      { key: 'Yumboe', note: 10, optional: true, extraCost: 0.5 },
    ],
    eighth: [
      { key: 'Anonymity' },
      { key: 'Wandless', wandless: 5 },
      { key: 'MagicalWeakness', spellMalus: 2, potionMalus: 0 },
      { key: 'Yumboe', note: 5, optional: true, extraCost: 0.5 },
    ],
    fate: [
      { key: 'Anonymity' },
      { key: 'Wandless', wandless: 5 },
      { key: 'MagicalWeakness', spellMalus: 10, potionMalus: 5 },
    ],
    resurgent: [
      { key: 'ResurgentChoice', choose: 1, options: ['Anonymity', 'Wandless'] },
      { key: 'MagicalWeakness', spellMalus: 2, potionMalus: 0 },
    ],
  },
  giant: {
    half: [
      { key: 'Athletics', skillBonus: { 'Athlétisme': 10 }, skillXp: ['Athlétisme'] },
      { key: 'GiantTongue' }, { key: 'MagicResistance', note: 30 },
      { key: 'SpellEffectsHalved' }, { key: 'PermanentToVariable', note: 'min' },
      { key: 'StupefyCount', note: 5 }, { key: 'Impatience' },
      { key: 'PotionInefficacy' }, { key: 'PoorEyesight' },
    ],
    quarter: [
      { key: 'Athletics', skillBonus: { 'Athlétisme': 10 }, skillXp: ['Athlétisme'] },
      { key: 'GiantTongue' }, { key: 'MagicResistance', note: 20 },
      { key: 'SpellEffectsThird' }, { key: 'PermanentToVariable', note: 'h' },
      { key: 'StupefyCount', note: 4 }, { key: 'Impatience' }, { key: 'PotionInefficacy' },
    ],
    eighth: [
      { key: 'Athletics', skillBonus: { 'Athlétisme': 10 } },
      { key: 'GiantTongue' }, { key: 'MagicResistance', note: 10 },
      { key: 'SpellEffectsQuarter' }, { key: 'StupefyCount', note: 3 },
      { key: 'PotionInefficacy' },
    ],
    fate: [
      { key: 'Athletics', skillBonus: { 'Athlétisme': 10 }, skillXp: ['Athlétisme'] },
      { key: 'GiantTongue' }, { key: 'MagicResistance', note: 30 },
      { key: 'SpellEffectsHalved' }, { key: 'PermanentToVariable', note: 'min' },
      { key: 'StupefyCount', note: 5 }, { key: 'Impatience' },
      { key: 'PotionInefficacy' }, { key: 'PoorEyesight' },
    ],
    resurgent: [
      { key: 'ResurgentChoice', choose: 1, options: ['MagicResistanceQuarter', 'StupefyCount3'] },
      { key: 'PotionInefficacy' },
    ],
  },
  goblin: {
    half: [
      { key: 'GoblinCraftAll' }, { key: 'Affinity', note: '½' },
      { key: 'Charms', skillBonus: { 'Enchantements': 10 }, skillXp: ['Enchantements'] },
      { key: 'Wandless', wandless: 10 },
    ],
    quarter: [
      { key: 'GoblinCraftOne', choose: 1, options: ['Artisanat', 'Connaissance (...)', 'Gobbledegook'] },
      { key: 'Affinity', note: '¾' },
      { key: 'Charms', skillBonus: { 'Enchantements': 10 } },
      { key: 'Wandless', wandless: 5 },
    ],
    eighth: [
      { key: 'GoblinCraftOne', choose: 1, options: ['Artisanat', 'Connaissance (...)', 'Gobbledegook'] },
      { key: 'Charms', skillBonus: { 'Enchantements': 5 } },
    ],
    fate: null,
    resurgent: [{ key: 'Charms', skillBonus: { 'Enchantements': 5 } }],
  },
  troll: {
    half: [
      { key: 'NaturalWeaponBite' }, { key: 'StrengthSurge', note: '+4 / 3' },
      { key: 'Endurance', skillBonus: { 'Athlétisme': 20 } },
      { key: 'Heritage', note: 10 }, { key: 'BodyOdour', note: 3 }, { key: 'Sweating', note: 3 },
    ],
    quarter: [
      { key: 'ProminentTeeth' }, { key: 'StrengthSurge', note: '+3 / 2' },
      { key: 'Endurance', skillBonus: { 'Athlétisme': 10 } },
      { key: 'Heritage', note: 5 }, { key: 'BodyOdour', note: 2 }, { key: 'Sweating', note: 2 },
    ],
    eighth: [
      { key: 'StrengthSurge', note: '+2 / 1' },
      { key: 'Endurance', skillBonus: { 'Athlétisme': 5 } },
      { key: 'BodyOdour', note: 1 }, { key: 'Sweating', note: 1 },
    ],
    fate: [
      { key: 'NaturalWeaponBite' }, { key: 'StrengthSurge', note: '+4 / 3' },
      { key: 'Endurance', skillBonus: { 'Athlétisme': 20 } },
      { key: 'Heritage', note: 10 }, { key: 'BodyOdour', note: 3 }, { key: 'Sweating', note: 3 },
    ],
    resurgent: [
      { key: 'ResurgentChoice', choose: 1, options: ['StrengthSurge2', 'Endurance5'] },
      { key: 'BodyOdourOrSweating' },
    ],
  },
  vampire: {
    half: [
      { key: 'Fascination', note: 'APP×3' }, { key: 'ClawAndBite', note: '1 / 1d4-1' },
      { key: 'Longevity' }, { key: 'VampiricBite' },
      { key: 'BloodSense', note: '12 m / PER×3' }, { key: 'PoisonResistance' },
      { key: 'SunGarlicStrong' }, { key: 'BloodPower' },
    ],
    quarter: [
      { key: 'Fascination', note: 'APP×3' }, { key: 'ClawAndBite', note: '1 / 1' },
      { key: 'Longevity' }, { key: 'VampiricBite' },
      { key: 'BloodSense', note: '6 m / PER×3' }, { key: 'PoisonResistance' },
      { key: 'SunGarlicLight' }, { key: 'BloodPower' },
    ],
    eighth: [
      { key: 'Fascination', note: 'APP×2' }, { key: 'BiteOnly', note: '1' },
      { key: 'VampiricBite' }, { key: 'BloodSense', note: '6 m / PER×2' },
      { key: 'SunGarlicMild' },
    ],
    fate: null,
    resurgent: [
      { key: 'ResurgentChoice', choose: 1, options: ['FascinationApp2', 'BloodSense6'] },
      { key: 'BiteOnly', note: '1' }, { key: 'SunGarlicMild' },
    ],
  },
  veela: {
    half: [
      { key: 'Dance', newSkill: { name: 'Danse', base: 20, max: 95 } },
      { key: 'FireAffinity', note: 10 }, { key: 'SeductionDance', note: 'APP+5' },
      { key: 'HypnoticFascination', note: 'APP×5 vs POU×5' },
      { key: 'Wandless', wandless: 5 }, { key: 'MagicResistance', note: 5 },
      { key: 'Choleric', note: 10 },
    ],
    quarter: [
      { key: 'Dance', newSkill: { name: 'Danse', base: 20, max: 95 } },
      { key: 'FireAffinity', note: 5 }, { key: 'SeductionDance', note: 'APP+3' },
      { key: 'HypnoticFascination', note: 'APP×4 vs POU×5' },
      { key: 'MagicResistance', note: 2 }, { key: 'Choleric', note: 5 },
    ],
    eighth: [
      { key: 'Dance', newSkill: { name: 'Danse', base: 20, max: 95 } },
      { key: 'FireAffinity', note: 5 }, { key: 'SeductionDance', note: 'APP+1' },
      { key: 'HypnoticFascination', note: 'APP×3 vs POU×5' },
      { key: 'Choleric', note: 5 },
    ],
    fate: null,
    resurgent: [
      { key: 'Dance', newSkill: { name: 'Danse', base: 20, max: 95 } },
      { key: 'SeductionDance', note: 'APP+1' },
      { key: 'HypnoticFascination', note: 'APP×3 vs POU×5' },
      { key: 'Choleric', note: 5 },
    ],
  },
};

/* -------------------------------------------- */
/*  School experience (Chap. 7.3 and 25)         */
/* -------------------------------------------- */

/**
 * Gain per school term. The book gives this twice and the two disagree, so both
 * are kept and selected by the `schoolXpMode` setting.
 *
 *  flat    §25.1 l. 28186 — a flat 1d6+1 every term, whatever the year.
 *  tapered §7.3  l. 6848  — indexed by how many years the subject has been
 *                            taught; approximated here by the pupil's year.
 */
HOGWARTS.schoolXpTapered = ['1d6+1', '1d6+1', '1d4+1', '1d4+1', '1d4', '1d4', '1d4'];
HOGWARTS.schoolXpFlat = '1d6+1';

/** The first week of the first year is a flat bonus in §7.3, a roll in §25.1. */
HOGWARTS.schoolFirstWeek = { flat: '1d6+1', tapered: 10 };

/**
 * End-of-year rewards (§25.2, l. 28293-28300). `perYear` multiplies the pupil's
 * school year; `min`/`max` bound a value the Gamemaster picks.
 */
HOGWARTS.yearEndRewards = [
  { key: 'Quest', perYear: 2, flat: 1 },
  { key: 'SideQuests', min: 0, max: 5 },
  { key: 'Participation', perYear: 1, signed: true },
  { key: 'FougueAndRP', min: 0, max: 5 },
  { key: 'CleverIdea', min: 0, max: 5 },
  { key: 'AbsurdIdea', min: -5, max: 0 },
  { key: 'Familiars', min: 0, max: 5 },
  { key: 'Other', perYear: 2 },
];

/** Holiday gain when the pupil goes home instead of playing (l. 28202). */
HOGWARTS.holidayXpFormula = '1d10+1';

/** Categories the year-end and holiday pools may be spent on (l. 28308-28310). */
HOGWARTS.poolSpendCategories = ['general', 'wizard', 'muggle'];

/** Trading 5% of the pool for a brand new Lore or Language (l. 28312-28316). */
HOGWARTS.poolUnlock = {
  cost: 5,
  lore: { base: 0, maxFlat: 50, maxPerYear: 5, value: 10, category: 'wizard' },
  language: { base: 0, max: 95, value: 10, category: 'general' },
};
