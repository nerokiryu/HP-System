/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: 'temporary',
      label: game.i18n.localize('HOGWARTS.Effect.Temporary'),
      effects: [],
    },
    passive: {
      type: 'passive',
      label: game.i18n.localize('HOGWARTS.Effect.Passive'),
      effects: [],
    },
    inactive: {
      type: 'inactive',
      label: game.i18n.localize('HOGWARTS.Effect.Inactive'),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (const e of effects) {
    if (e.disabled) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }

  // Sort each category
  for (const c of Object.values(categories)) {
    c.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }
  return categories;
}

/**
 * Build a flat list of Active-Effect-targetable attribute keys for a document,
 * together with their current ("true") values. Only leaf Number and Boolean
 * fields from the document's data schema are included, since those are the
 * properties Active Effects modify in practice. Array fields (e.g. the skills
 * list) and rich-text/HTML fields are skipped to keep the reference readable.
 *
 * Skills are enumerated separately by index so their individual value/base/max
 * keys are surfaced. XP modifier pseudo-keys (xp.multiplier, xp.bonus, …) used
 * by the custom XP resolution logic are also included as synthetic entries.
 *
 * @param {foundry.abstract.Document} doc  An Actor or Item document.
 * @returns {{key: string, label: string, value: *, dtype: string, section: string}[]}
 */
export function prepareEffectAttributes(doc) {
  const system = doc?.system;
  const schema = system?.schema;
  if (!schema || !system) return [];

  const fields = foundry.data.fields;
  const rows = [];

  // --- 1. Schema walk (non-array scalar fields) ---
  const walk = (field, path) => {
    if (field instanceof fields.SchemaField) {
      for (const [name, sub] of Object.entries(field.fields)) {
        walk(sub, path ? `${path}.${name}` : name);
      }
      return;
    }
    // Skip arrays — handled separately below
    if (field instanceof fields.ArrayField || field instanceof fields.SetField) return;

    let dtype = null;
    if (field instanceof fields.NumberField) dtype = 'Number';
    else if (field instanceof fields.BooleanField) dtype = 'Boolean';
    if (!dtype) return;

    const value = foundry.utils.getProperty(system, path);
    rows.push({
      key: `system.${path}`,
      label: path,
      value: value ?? '',
      dtype,
      section: 'schema',
    });
  };

  for (const [name, field] of Object.entries(schema.fields)) {
    walk(field, name);
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));

  // --- 2. Skills enumerated by index ---
  const skills = system.skills;
  if (Array.isArray(skills) && skills.length > 0) {
    const skillFields = ['value', 'base', 'max', 'spent'];
    for (let i = 0; i < skills.length; i++) {
      const s = skills[i];
      const label = s.spec ? `${s.name} (${s.spec})` : s.name;
      for (const f of skillFields) {
        rows.push({
          key: `system.skills.${i}.${f}`,
          label: `${label} — ${f}`,
          value: s[f] ?? '',
          dtype: 'Number',
          section: 'skills',
        });
      }
    }
  }

  // --- 3. XP modifier synthetic keys ---
  const xpPseudoKeys = [
    { key: 'xp.multiplier',                        hint: 'Multiplicateur XP global (ex : 1.333)' },
    { key: 'xp.multiplier.general',                hint: 'Multiplicateur XP — comp. générales' },
    { key: 'xp.multiplier.wizard',                 hint: 'Multiplicateur XP — comp. de sorcier' },
    { key: 'xp.multiplier.muggle',                 hint: 'Multiplicateur XP — comp. moldues' },
    { key: 'xp.multiplier.school',                 hint: 'Multiplicateur XP — matières scolaires' },
    { key: 'xp.multiplier.skill.{nom}',            hint: 'Multiplicateur XP — comp. précise (ex : xp.multiplier.skill.Bibliothèque)' },
    { key: 'xp.bonus',                             hint: 'Bonus XP flat global (ex : 1)' },
    { key: 'xp.bonus.general',                     hint: 'Bonus XP flat — comp. générales' },
    { key: 'xp.bonus.wizard',                      hint: 'Bonus XP flat — comp. de sorcier' },
    { key: 'xp.bonus.muggle',                      hint: 'Bonus XP flat — comp. moldues' },
    { key: 'xp.bonus.school',                      hint: 'Bonus XP flat — matières scolaires' },
    { key: 'xp.bonus.skill.{nom}',                 hint: 'Bonus XP flat — comp. précise (ex : xp.bonus.skill.Érudition)' },
  ];
  for (const { key, hint } of xpPseudoKeys) {
    rows.push({ key, label: hint, value: '', dtype: 'Number', section: 'xp', synthetic: true });
  }

  return rows;
}
