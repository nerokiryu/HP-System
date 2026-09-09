import HogwartsActorBase from './base-actor.mjs';

export default class HogwartsCharacter extends HogwartsActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'HOGWARTS.Actor.Character',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // School profile (optional): year, house, archetype
    schema.profile = new fields.SchemaField({
      year: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1, max: 7 }),
      house: new fields.StringField({ initial: 'gryffindor' }),
      age: new fields.NumberField({ ...requiredInteger, initial: 11, min: 1 }),
      archetype: new fields.StringField({ blank: true, initial: '' }),
    });

    // Points de Fougue (ch. 8). One at the start of a scenario, capped at 5
    // for the whole session (l. 10192).
    schema.fougue = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
    });

    // Stress level (Rules §Stress — malus applied to rolls)
    schema.stress = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 25 }),
    });

    // Movement speed in meters/round (default 8 — Rules §Déplacement)
    schema.movement = new fields.NumberField({ ...requiredInteger, initial: 8, min: 0 });

    // Hybrid ancestry (Chap. 17). An empty race means a classic wizard.
    schema.hybrid = new fields.SchemaField({
      race: new fields.StringField({ blank: true, initial: '' }),
      generation: new fields.StringField({ blank: true, initial: '' }),
      yumboe: new fields.BooleanField({ initial: false }),
      // Starred entries in the §17.1 table, and the "1 au choix" capabilities.
      pickBonus: new fields.StringField({ blank: true, initial: '' }),
      pickMalus: new fields.StringField({ blank: true, initial: '' }),
      pickCapability: new fields.StringField({ blank: true, initial: '' }),
    });

    // Core BRP-like stats (typical range ~3-18)
    schema.stats = new fields.SchemaField(
      Object.keys(CONFIG.HOGWARTS.stats).reduce((obj, stat) => {
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
        // School subjects derive `max` from the school year unless this is set.
        maxOverride: new fields.BooleanField({ initial: false }),
        category: new fields.StringField({ initial: 'general' }),
        spec: new fields.StringField({ blank: true }),
        custom: new fields.BooleanField({ initial: false }),
        xpCheck: new fields.BooleanField({ initial: false })
      })
    );

    // Family - array of characters
    schema.family = new fields.ArrayField(
      new fields.SchemaField({
        role: new fields.StringField({ blank: true }),
        name: new fields.StringField({ blank: true }),
        age: new fields.NumberField({ nullable: true, integer: true }),
        details: new fields.StringField({ blank: true })
      })
    );

    // Appearance
    schema.appearance = new fields.SchemaField({
      height: new fields.StringField({ blank: true }),
      weight: new fields.StringField({ blank: true }),
      skin: new fields.StringField({ blank: true }),
      hairLength: new fields.StringField({ blank: true }),
      hairType: new fields.StringField({ blank: true }),
      hairColor: new fields.StringField({ blank: true }),
      hairInspiration: new fields.StringField({ blank: true }),
      eyes: new fields.StringField({ blank: true }),
      dominantHand: new fields.StringField({ 
        blank: true,
        choices: {
          'left': 'HOGWARTS.Biography.HandLeft',
          'right': 'HOGWARTS.Biography.HandRight',
          'ambidextrous': 'HOGWARTS.Biography.HandAmbidextrous'
        }
      })
    });

    // Character
    schema.character = new fields.SchemaField({
      qualities: new fields.StringField({ blank: true }),
      flaws: new fields.StringField({ blank: true }),
      style: new fields.StringField({ blank: true }),
      favoriteExpression: new fields.StringField({ blank: true }),
      accent: new fields.StringField({ blank: true }),
      interests: new fields.StringField({ blank: true }),
      likes: new fields.StringField({ blank: true }),
      dislikes: new fields.StringField({ blank: true })
    });

    // Information
    schema.information = new fields.SchemaField({
      patronus: new fields.StringField({ blank: true }),
      origin: new fields.StringField({ blank: true }),
      gender: new fields.StringField({ 
        blank: true,
        choices: {
          'male': 'HOGWARTS.Biography.GenderMale',
          'female': 'HOGWARTS.Biography.GenderFemale',
          'other': 'HOGWARTS.Biography.GenderOther'
        }
      }),
      bloodStatus: new fields.StringField({ 
        blank: true,
        initial: 'halfblood',
        choices: {
          'muggleborn': 'HOGWARTS.Biography.BloodStatusMuggleBorn',
          'halfblood': 'HOGWARTS.Biography.BloodStatusHalfBlood',
          'pureblood': 'HOGWARTS.Biography.BloodStatusPureBlood'
        }
      })
    });

    // Boggart
    schema.boggart = new fields.SchemaField({
      visual: new fields.StringField({ blank: true }),
      description: new fields.StringField({ blank: true }),
      riddikulus: new fields.StringField({ blank: true })
    });

    // Biographie
    schema.bio = new fields.SchemaField({
      motivation: new fields.HTMLField({ blank: true }),
      history: new fields.HTMLField({ blank: true })
    });

    // Notes
    schema.notes = new fields.SchemaField({
      rpNotes: new fields.HTMLField({ blank: true }),
      gmNotes: new fields.HTMLField({ blank: true })
    });

    // Experience
    schema.experience = new fields.SchemaField({
      creationPoints: new fields.SchemaField({
        max: new fields.NumberField({ ...requiredInteger, initial: 400, min: 0 }),
        spent: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
      }),
      personalBonusPoints: new fields.SchemaField({
        max: new fields.NumberField({ ...requiredInteger, initial: 6, min: 0 }),
        spent: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
      }),
      // Percentages awarded at year's end or over the holidays, still to be
      // spread over non-school skills (§25.1-25.2).
      pool: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      // School terms already credited, so a term cannot be granted twice.
      school: new fields.SchemaField({
        year: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        periods: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 3 }),
        firstWeek: new fields.BooleanField({ initial: false })
      })
    });

    // Currency (Wizarding money)
    schema.currency = new fields.SchemaField({
      galleons: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      sickles: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      knuts: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
    });

    // Wand (magic wand)
    schema.wand = new fields.SchemaField({
      wood: new fields.StringField({ blank: true }),
      core: new fields.StringField({ blank: true }),
      length: new fields.StringField({ blank: true }),
      flexibility: new fields.StringField({ blank: true }),
      affinity: new fields.StringField({ blank: true }),
      pbpCost: new fields.NumberField({ required: true, nullable: false, initial: 0, step: 0.5 }),
      description: new fields.StringField({ blank: true })
    });

    // Options
    schema.options = new fields.SchemaField({
      otherSchool: new fields.BooleanField({ initial: false })
    });

    // Animagus (Rules: only characters with the 'Animagus Potential' feature)
    schema.animagus = new fields.SchemaField({
      form: new fields.StringField({ blank: true, initial: '' }),
      mastery: new fields.StringField({
        blank: true,
        initial: 'none',
        choices: {
          'none': 'HOGWARTS.Actor.Animagus.MasteryNone',
          'learning': 'HOGWARTS.Actor.Animagus.MasteryLearning',
          'partial': 'HOGWARTS.Actor.Animagus.MasteryPartial',
          'full': 'HOGWARTS.Actor.Animagus.MasteryFull',
        }
      }),
      transformed: new fields.BooleanField({ initial: false }),
      declared: new fields.BooleanField({ initial: false }),
    });

    // Familiar
    schema.familiar = new fields.SchemaField({
      // ID of a linked familiar Actor (stores Actor id/uuid)
      linkedActor: new fields.StringField({ blank: true }),
      name: new fields.StringField({ blank: true }),
      species: new fields.StringField({ blank: true }),
      age: new fields.StringField({ blank: true }),
      bond: new fields.StringField({ blank: true, choices: ['', 'weak', 'normal', 'strong'] }),
      appearance: new fields.HTMLField({ blank: true }),
      personality: new fields.HTMLField({ blank: true }),
      abilities: new fields.HTMLField({ blank: true }),
      notes: new fields.HTMLField({ blank: true })
    });

    return schema;
  }

  /**
   * The `bio` schema replaced a free-text `biography` field during development.
   * Doing this here rather than in a world migration also covers compendium and
   * imported actors. The legacy field is left untouched in the source.
   */
  static migrateData(source) {
    if (source.biography && !source.bio?.history) {
      source.bio ??= {};
      source.bio.history = source.biography;
    }
    return super.migrateData(source);
  }

  prepareBaseData() {
    if (!Array.isArray(this.skills)) this.skills = [];
    const presets = CONFIG.HOGWARTS?.skillPresets;
    if (!presets) return;

    // Preset skills cannot be deleted from the sheet, so a missing one always
    // means the system added it after this actor was created. Backfilling here
    // covers both a brand-new actor and one predating a preset being added.
    const known = new Set(this.skills.map(s => `${s.category}:${s.name}`));
    for (const [category, list] of Object.entries(presets)) {
      for (const entry of list) {
        if (known.has(`${category}:${entry.name}`)) continue;
        this.skills.push({
          name: entry.name,
          base: Number(entry.base) || 0,
          max: Number(entry.max) || 95,
          maxOverride: false,
          value: 0,
          spent: 0,
          category,
          spec: '',
          custom: false,
          xpCheck: false
        });
      }
    }

    // Some ancestries grant a skill an ordinary wizard never has (§17.2.6).
    const granted = CONFIG.HOGWARTS?.hybridCapabilities?.[this.hybrid?.race]?.[this.hybrid?.generation] ?? [];
    for (const capability of granted) {
      const skill = capability.newSkill;
      if (!skill || known.has(`general:${skill.name}`)) continue;
      this.skills.push({
        name: skill.name,
        base: Number(skill.base) || 0,
        max: Number(skill.max) || 95,
        maxOverride: true,
        value: 0,
        spent: 0,
        category: 'general',
        spec: '',
        custom: false,
        xpCheck: false
      });
      known.add(`general:${skill.name}`);
    }
  }

  /**
   * Resolve the hybrid ancestry into per-stat modifiers and the aggregated
   * numeric effects of the granted capabilities (Chap. 17).
   *
   * Sets `stats.<k>.hybridMod` and `stats.<k>.total`; every derived value below
   * reads `total`, never `value`, so an ancestry actually reaches hit points,
   * the damage bonus and initiative.
   */
  _prepareHybrid() {
    const { race, generation, pickBonus, pickMalus, pickCapability } = this.hybrid ?? {};
    const adjustments = CONFIG.HOGWARTS?.hybridStatAdjustments?.[race]?.[generation] ?? null;
    const capabilities = CONFIG.HOGWARTS?.hybridCapabilities?.[race]?.[generation] ?? null;

    const mods = {};
    if (adjustments) {
      for (const [key, delta] of Object.entries(adjustments)) {
        if (key !== 'pick') mods[key] = delta;
      }
      // A starred entry only applies to the stat the player selected.
      if (adjustments.pick?.bonus?.[pickBonus]) mods[pickBonus] = adjustments.pick.bonus[pickBonus];
      if (adjustments.pick?.malus?.[pickMalus]) mods[pickMalus] = adjustments.pick.malus[pickMalus];
    }

    for (const key in this.stats) {
      const value = Number(this.stats[key].value) || 0;
      const mod = Number(mods[key]) || 0;
      this.stats[key].hybridMod = mod;
      // A characteristic can never be reduced below 1.
      this.stats[key].total = Math.max(1, value + mod);
    }

    const effects = { skillBonus: {}, skillXp: [], newSkills: [], spellMalus: 0, potionMalus: 0, wandless: 0 };
    for (const capability of capabilities ?? []) {
      if (capability.key === 'Yumboe' && !this.hybrid?.yumboe) continue;
      // A "1 au choix" capability contributes only through the selected option.
      if (capability.choose && capability.bonus && capability.options?.includes(pickCapability)) {
        effects.skillBonus[pickCapability] = (effects.skillBonus[pickCapability] ?? 0) + capability.bonus;
        if (capability.xp) effects.skillXp.push(pickCapability);
        continue;
      }
      for (const [name, bonus] of Object.entries(capability.skillBonus ?? {})) {
        effects.skillBonus[name] = (effects.skillBonus[name] ?? 0) + bonus;
      }
      effects.skillXp.push(...(capability.skillXp ?? []));
      if (capability.newSkill) effects.newSkills.push(capability.newSkill);
      effects.spellMalus += Number(capability.spellMalus) || 0;
      effects.potionMalus += Number(capability.potionMalus) || 0;
      effects.wandless += Number(capability.wandless) || 0;
    }
    this.hybridEffects = effects;
  }

  prepareDerivedData() {
    this._prepareHybrid();

    // Derive labels for stats and compute convenience check thresholds (x5 rule)
    this.checks = {};
    for (const key in this.stats) {
      const v = Number(this.stats[key].total) || 0;
      this.stats[key].label = game.i18n.localize(CONFIG.HOGWARTS.stats[key]) ?? key;
      // Typical BRP stat check: value * 5 (percentage)
      this.checks[key] = v * 5;
    }

    // Calculate health max: (SIZ + CON) / 2
    const siz = Number(this.stats.siz?.total) || 0;
    const con = Number(this.stats.con?.total) || 0;
    this.health.max = Math.ceil((siz + con) / 2);
    // Non-lethal pool max mirrors lethal HP max
    if (this.healthNonLethal) this.healthNonLethal.max = this.health.max;

    // Calculate damage bonus based on STR + SIZ
    const str = Number(this.stats.str?.total) || 0;
    const total = str + siz;
    if (total <= 24) {
      this.damageBonus = '—';
    } else if (total <= 32) {
      this.damageBonus = '+1d3';
    } else if (total <= 40) {
      this.damageBonus = '+1d6';
    } else {
      this.damageBonus = '+2d6';
    }
    // Full brawling damage formula (1d3 + damage bonus)
    this.brawlingDamage = total <= 24 ? '1d3' : '1d3' + this.damageBonus;

    // Only worn armour reduces incoming damage (Chap. 2.8.1).
    this.armor = (this.parent?.items ?? [])
      .filter((i) => i.type === 'armor' && i.system?.equipped)
      .reduce((sum, i) => sum + (Number(i.system?.armorValue) || 0), 0);

    // Best equipped shield: bonus to parry, same figure as a penalty to attack.
    this.shieldBonus = (this.parent?.items ?? [])
      .filter((i) => i.type === 'armor' && i.system?.equipped)
      .reduce((best, i) => Math.max(best, Number(i.system?.shieldBonus) || 0), 0);

    // Derived characteristics: senses, idea, luck
    const per = Number(this.stats.per?.total) || 0;
    const int = Number(this.stats.int?.total) || 0;
    const pow = Number(this.stats.pow?.total) || 0;
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

    // Ensure a sensible default for personal bonus points max, but do not
    // overwrite a value that the user or world has explicitly set. The
    // 'Other School' option grants a +1 to the currently available PBPs
    // (display/logic) rather than increasing the permanent maximum.
    if (this.experience?.personalBonusPoints) {
      const baseMax = 6;
      const currentMax = this.experience.personalBonusPoints.max;
      if (currentMax === undefined || currentMax === null) {
        this.experience.personalBonusPoints.max = baseMax;
      }
    }



    // Derive value from base + spent and clamp to [base, max];
    // also clamp spent to [0, max - base]
    const year = Number(this.profile?.year) || 1;
    const excludeSchoolFromCP = game.settings.get('hogwarts-system', 'excludeSchoolSkillsFromCP') ?? false;
    let totalSkillsSpent = 0;
    if (Array.isArray(this.skills)) {
      // Maîtrise maximale scolaire : 30 % en 1re année, +15 %/an, plafonnée à
      // 100 % (livre v1.12, l. 6707-6714). Un `maxOverride` coupe l'automatisme.
      const autoSchoolMax = Math.min(100, 30 + (year - 1) * 15);

      for (const s of this.skills) {
        const b = Number(s.base) || 0;
        let m = Number(s.max) || 0;

        if (s.category === 'school' && !s.maxOverride) {
          m = autoSchoolMax;
          s.max = autoSchoolMax;
        }

        const rawSpent = Number(s.spent) || 0;
        const maxSpent = Math.max(0, m - b);
        const p = Math.max(0, Math.min(rawSpent, maxSpent));
        s.spent = p;
        let v = b + p;
        if (m > 0) v = Math.min(v, m);
        v = Math.max(v, b);

        // Ancestry bonuses sit on top of the mastery ceiling: they are innate,
        // not points the character spent (§17.2).
        const hybridBonus = Number(this.hybridEffects?.skillBonus?.[s.name]) || 0;
        s.hybridBonus = hybridBonus;
        s.hybridXp = this.hybridEffects?.skillXp?.includes(s.name) ?? false;
        s.value = v + hybridBonus;

        // Accumulate total spent points (school subjects optionally excluded)
        if (!excludeSchoolFromCP || s.category !== 'school') {
          totalSkillsSpent += p;
        }
      }
    }

    // Auto-calculate creation points spent based on skills
    if (this.experience?.creationPoints) {
      this.experience.creationPoints.spent = totalSkillsSpent;
    }

    // Blood status — mark wizard/muggle skills as available or restricted.
    // pureblood: no muggle skills access; muggleborn: no wizard skills access
    const bloodStatus = this.information?.bloodStatus ?? 'halfblood';
    if (Array.isArray(this.skills) && bloodStatus !== 'halfblood') {
      for (const s of this.skills) {
        if (bloodStatus === 'pureblood' && s.category === 'muggle') {
          s.unavailable = true;
        } else if (bloodStatus === 'muggleborn' && s.category === 'wizard') {
          s.unavailable = true;
        } else {
          s.unavailable = false;
        }
      }
    } else if (Array.isArray(this.skills)) {
      for (const s of this.skills) s.unavailable = false;
    }
  }

  getRollData() {
    const data = {};

    // Expose stats and derived checks. Allows formulas like `@checks.dex`.
    if (this.stats) data.stats = foundry.utils.deepClone(this.stats);
    if (this.checks) data.checks = foundry.utils.deepClone(this.checks);
    // Expose skills array for access; templates can pass numeric targets directly
    if (this.skills) data.skills = foundry.utils.deepClone(this.skills);
    // Expose derived characteristics
    if (this.derived) data.derived = foundry.utils.deepClone(this.derived);

    return data;
  }
}
