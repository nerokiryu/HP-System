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

    // Points de Fougue (Heroism/Fate points — Rules §Fougue)
    schema.fougue = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
    });

    // Stress level (Rules §Stress — malus applied to rolls)
    schema.stress = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 25 }),
    });

    // Movement speed in meters/round (default 8 — Rules §Déplacement)
    schema.movement = new fields.NumberField({ ...requiredInteger, initial: 8, min: 0 });

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

  prepareBaseData() {
    // Seed default skills if empty
    if (!Array.isArray(this.skills)) this.skills = [];
    if (this.skills.length === 0 && CONFIG.HOGWARTS?.skillPresets) {
      const cats = CONFIG.HOGWARTS.skillPresets;
      const seed = [];
      for (const [category, list] of Object.entries(cats)) {
        for (const entry of list) {
          seed.push({
            name: entry.name,
            base: Number(entry.base) || 0,
            max: Number(entry.max) || 95,
            value: 0,
            spent: 0,
            category,
            spec: entry.name.includes('(...)') ? '' : '',
            custom: false,
            xpCheck: false
          });
        }
      }
      this.skills = seed;
    }
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
    // Non-lethal pool max mirrors lethal HP max
    if (this.healthNonLethal) this.healthNonLethal.max = this.health.max;

    // Calculate damage bonus based on STR + SIZ
    const str = Number(this.stats.str?.value) || 0;
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
      // Auto-update max for school subjects only when the value hasn't been manually edited:
      //  - 95  → schema initial (field never touched)
      //  - (year-2)*15+30  → was following auto-calc last year, advance to this year
      // Any other value is treated as a manual override and left untouched.
      const autoSchoolMax = (year - 1) * 15 + 30;
      const prevAutoSchoolMax = year <= 1 ? 95 : (year - 2) * 15 + 30;

      for (const s of this.skills) {
        const b = Number(s.base) || 0;
        let m = Number(s.max) || 0;

        // Apply auto-calc only if max is still at a "never manually edited" value
        if (s.category === 'school' && (m === 95 || m === prevAutoSchoolMax)) {
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
        s.value = v;

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
