import HogwartsActorBase from './base-actor.mjs';

export default class HogwartsFamiliar extends HogwartsActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'HOGWARTS.Actor.Familiar',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Core BRP-like stats (typical range ~3-18)
    const statKeys = ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app', 'per'];
    schema.stats = new fields.SchemaField(
      statKeys.reduce((obj, stat) => {
        obj[stat] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 1 }),
        });
        return obj;
      }, {})
    );

    // Skills as a list of entries: name, value, base, max, category, spec
    schema.skills = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true }),
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        spent: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        base: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 95, min: 0 }),
        category: new fields.StringField({ initial: 'general' }),
        spec: new fields.StringField({ blank: true }),
        custom: new fields.BooleanField({ initial: false })
      })
    );

    // Familiar-specific metadata and header fields
    schema.familiar = new fields.SchemaField({
      name: new fields.StringField({ blank: true }),
      // Armor and movement displayed in header for familiars
      armor: new fields.NumberField({ required: false, nullable: true, initial: 0, integer: true }),
      movement: new fields.NumberField({ required: false, nullable: true, initial: 0, integer: true }),
      // Editable damage formula for familiars (e.g. "1d3", "1d3+1d6")
      dmg: new fields.StringField({ blank: true, initial: '1d3' }),
    });

    // Perks (Advantages/Disadvantages)
    schema.perks = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, blank: true }),
        category: new fields.StringField({ initial: 'advantage' }),
        description: new fields.HTMLField({ blank: true }),
        pbpCost: new fields.NumberField({ required: true, nullable: false, initial: 0, step: 0.5 })
      })
    );

    // Biography (for biography tab) - stored under `bio` to avoid conflicts
    schema.bio = new fields.SchemaField({
      species: new fields.StringField({ blank: true }),
      appearance: new fields.HTMLField({ blank: true }),
      personality: new fields.HTMLField({ blank: true }),
      bond: new fields.HTMLField({ blank: true }),
      notes: new fields.HTMLField({ blank: true })
    });

    // Notes (RP and GM notes)
    schema.notes = new fields.SchemaField({
      rpNotes: new fields.HTMLField({ blank: true }),
      gmNotes: new fields.HTMLField({ blank: true })
    });

    return schema;
  }

  prepareDerivedData() {
    // Derive labels for stats and compute convenience check thresholds (x5 rule)
    this.checks = {};
    for (const key in this.stats) {
      const v = Number(this.stats[key].value) || 0;
      this.stats[key].label = game.i18n.localize(CONFIG.HOGWARTS.stats[key]) ?? key;
      // Typical BRP stat check: value * 5 (percentage)
      this.checks[key] = v * 5;
    }

    // Calculate health max: (SIZ + CON) / 2
    const siz = Number(this.stats.siz?.value) || 0;
    const con = Number(this.stats.con?.value) || 0;
    this.health.max = Math.ceil((siz + con) / 2);

    // Derived characteristics: senses, idea, luck
    const per = Number(this.stats.per?.value) || 0;
    const int = Number(this.stats.int?.value) || 0;
    const pow = Number(this.stats.pow?.value) || 0;
    // Use configurable multipliers from CONFIG.HOGWARTS.derivedMultipliers if present,
    // otherwise fall back to sensible defaults.
    const dm = CONFIG.HOGWARTS?.derivedMultipliers ?? {
      taste: 3,
      smell: 3,
      hearing: 4,
      touch: 3,
      sight: 5,
      idea: 5,
      luck: 5,
    };
    this.derived = {
      taste: per * (dm.taste ?? 3),
      smell: per * (dm.smell ?? 3),
      hearing: per * (dm.hearing ?? 4),
      touch: per * (dm.touch ?? 3),
      sight: per * (dm.sight ?? 5),
      idea: int * (dm.idea ?? 5),
      luck: pow * (dm.luck ?? 5),
    };

    // Initialize default general skills if empty
    if (this.skills.length === 0) {
      const defaultSkills = [
        { name: 'Acrobatie', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' },
        { name: 'Athlétisme', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' },
        { name: 'Discrétion', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' },
        { name: 'Esquive', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' },
        { name: 'Orientation', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' },
        { name: 'Survie', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' },
        { name: 'Vigilance', category: 'general', base: 0, max: 95, spent: 0, value: 0, custom: false, spec: '' }
      ];
      this.skills.push(...defaultSkills);
    }

    // Derive value from base + spent and clamp to [base, max]
    if (Array.isArray(this.skills)) {
      for (const s of this.skills) {
        const b = Number(s.base) || 0;
        const m = Number(s.max) || 0;
        const rawSpent = Number(s.spent) || 0;
        const maxSpent = Math.max(0, m - b);
        const p = Math.max(0, Math.min(rawSpent, maxSpent));
        s.spent = p;
        let v = b + p;
        if (m > 0) v = Math.min(v, m);
        v = Math.max(v, b);
        s.value = v;
      }
    }

    // Minimal validation for familiar dmg formula: allow simple dice terms like "1d3" or "1d3+1d6"
    try {
      if (this.familiar) {
        const raw = String(this.familiar.dmg ?? '').trim();
        // Allow tokens like "1d6", plain numbers like "3", and combinations with +/-,
        // e.g. "1d6+3", "1d20-10", "1d6+1d4+2".
        const diceRegex = /^\s*(?:\d*d\d+|\d+)(?:\s*[+-]\s*(?:\d*d\d+|\d+))*\s*$/i;
        if (!diceRegex.test(raw)) {
          // Reset to safe default if invalid
          this.familiar.dmg = '1d3';
        }
      }
    } catch (err) {
      // Fail-safe: ensure a sane default
      if (this.familiar) this.familiar.dmg = '1d3';
    }
  }

  getRollData() {
    const data = {};

    // Expose stats and derived checks
    if (this.stats) data.stats = foundry.utils.deepClone(this.stats);
    if (this.checks) data.checks = foundry.utils.deepClone(this.checks);
    if (this.skills) data.skills = foundry.utils.deepClone(this.skills);
    if (this.derived) data.derived = foundry.utils.deepClone(this.derived);
    if (this.bio) data.bio = foundry.utils.deepClone(this.bio);

    return data;
  }
}
