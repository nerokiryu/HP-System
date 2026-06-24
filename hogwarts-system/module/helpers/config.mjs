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
  // New extra category for custom/special skills
  special: [
    // Intentionally left empty; users add via the UI
  ]
};

// Build a mapping from preset display names to i18n keys
HOGWARTS.skillNameKeys = {};
for (const [cat, list] of Object.entries(HOGWARTS.skillPresets)) {
  for (const entry of list) {
    if (!HOGWARTS.skillNameKeys[entry.name]) {
      HOGWARTS.skillNameKeys[entry.name] = `HOGWARTS.SkillDisplay.${entry.name}`;
    }
  }
}
