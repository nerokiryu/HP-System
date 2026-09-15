import HogwartsActorBase from './base-actor.mjs';
import { deriveSenses } from '../helpers/senses.mjs';

/**
 * Non-player character (§21.1).
 *
 * « La création de personnages non-joueurs suit les mêmes étapes que celles de
 * la création des personnages, à quelques exceptions près »: an NPC is therefore a
 * complete student, not a stat block. Only the budgets differ — 350 skill points
 * against 400, and 4.5 perk points against 6.
 *
 * §21.2 singles out **rivals**, « créés comme des personnages joueurs (même
 * nombre de points de caractéristiques et de compétences, ainsi que même nombre
 * de points d'avantages) », without which confrontations would be uneven. Hence
 * the `rival` toggle.
 */
export default class HogwartsNPC extends HogwartsActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'HOGWARTS.Actor.NPC',
  ];

  /** Creation budgets, §21.1 for a plain NPC and §21.2 for a rival. */
  static BUDGETS = {
    standard: { skillPoints: 350, perkPoints: 4.5 },
    rival: { skillPoints: 400, perkPoints: 6 },
  };

  /**
   * Extra skill points for a character created in an advanced year (§22.2.1).
   * The book gives a range per year; we keep its upper bound, so that a spread
   * the book allows is never flagged as over budget. §22 leaves perk points
   * untouched: they stay those of §21.1.
   */
  static YEAR_SKILL_BONUS = { 1: 0, 2: 50, 3: 110, 4: 180, 5: 250, 6: 330, 7: 410 };

  /** Same as a character: NPCs are students, so the age malus applies. */
  static ADULT_AGE = 16;
  static AGE_MALUS_STATS = ['str', 'con', 'siz'];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Kept from earlier versions: a danger gauge for the gamemaster.
    schema.cr = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });

    // §21.2: a rival is built on player-character budgets.
    schema.rival = new fields.BooleanField({ initial: false });

    schema.profile = new fields.SchemaField({
      year: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1, max: 7 }),
      house: new fields.StringField({ initial: 'gryffindor' }),
      age: new fields.NumberField({ ...requiredInteger, initial: 11, min: 1 }),
      archetype: new fields.StringField({ blank: true, initial: '' }),
      role: new fields.StringField({ blank: true, initial: '' }),
    });

    schema.stats = new fields.SchemaField(
      Object.keys(CONFIG.HOGWARTS.stats).reduce((obj, stat) => {
        obj[stat] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 1 }),
        });
        return obj;
      }, {})
    );

    schema.skills = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true }),
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        spent: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        base: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 95, min: 0 }),
        maxOverride: new fields.BooleanField({ initial: false }),
        category: new fields.StringField({ initial: 'general' }),
        spec: new fields.StringField({ blank: true }),
        custom: new fields.BooleanField({ initial: false }),
        xpCheck: new fields.BooleanField({ initial: false }),
      })
    );

    // Same mechanism as the character sheet: the only practical target for an
    // effect coming from a compendium, array order varying from sheet to sheet.
    schema.skillBonus = new fields.ObjectField();

    // See the character model: effect target for the sense multipliers.
    schema.senseMult = new fields.ObjectField();

    schema.information = new fields.SchemaField({
      bloodStatus: new fields.StringField({
        blank: true,
        initial: 'halfblood',
        choices: {
          muggleborn: 'HOGWARTS.Biography.BloodStatusMuggleBorn',
          halfblood: 'HOGWARTS.Biography.BloodStatusHalfBlood',
          pureblood: 'HOGWARTS.Biography.BloodStatusPureBlood',
        },
      }),
    });

    schema.wand = new fields.SchemaField({
      wood: new fields.StringField({ blank: true }),
      core: new fields.StringField({ blank: true }),
      length: new fields.StringField({ blank: true }),
      flexibility: new fields.StringField({ blank: true }),
      affinity: new fields.StringField({ blank: true }),
      pbpCost: new fields.NumberField({ required: true, nullable: false, initial: 0, step: 0.5 }),
      description: new fields.StringField({ blank: true }),
    });

    schema.experience = new fields.SchemaField({
      creationPoints: new fields.SchemaField({
        max: new fields.NumberField({ ...requiredInteger, initial: 350, min: 0 }),
        spent: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
      personalBonusPoints: new fields.SchemaField({
        max: new fields.NumberField({ required: true, nullable: false, initial: 4.5, min: 0, step: 0.5 }),
        spent: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0, step: 0.5 }),
      }),
    });

    schema.stress = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 25 }),
    });

    schema.damage = new fields.StringField({ blank: true, initial: '1d3' });
    schema.armor = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.movement = new fields.NumberField({ ...requiredInteger, initial: 8, min: 0 });

    schema.notes = new fields.SchemaField({
      gmNotes: new fields.HTMLField({ blank: true }),
    });

    // Same as a character: nothing in the book reserves familiars to heroes.
    schema.familiar = new fields.SchemaField({
      linkedActor: new fields.StringField({ blank: true }),
      name: new fields.StringField({ blank: true }),
      species: new fields.StringField({ blank: true }),
      age: new fields.StringField({ blank: true }),
      bond: new fields.StringField({ blank: true, choices: ['', 'weak', 'normal', 'strong'] }),
      appearance: new fields.HTMLField({ blank: true }),
      personality: new fields.HTMLField({ blank: true }),
      abilities: new fields.HTMLField({ blank: true }),
      notes: new fields.HTMLField({ blank: true }),
    });

    // Years spent in a duelling club: +1 initiative each, up to +5, cumulative
    // with the *Initié au duel* advantage (l. 28569-28577).
    schema.duelClubYears = new fields.NumberField({
      required: true, nullable: false, integer: true, initial: 0, min: 0, max: 5,
    });

    return schema;
  }

  /** « Malus qui diminuera de 1 chaque année » (l. 574), table du §22.1.2. */
  get ageMalus() {
    const age = Number(this.profile?.age);
    if (!Number.isFinite(age)) return 0;
    return Math.max(0, HogwartsNPC.ADULT_AGE - age);
  }

  /** Applicable budget, depending on whether the NPC is a rival. */
  get budget() {
    const base = HogwartsNPC.BUDGETS[this.rival ? 'rival' : 'standard'];
    const yearBonus = HogwartsNPC.YEAR_SKILL_BONUS[this.profile?.year] ?? 0;
    return { ...base, yearBonus, skillPoints: base.skillPoints + yearBonus };
  }

  prepareBaseData() {
    if (!Array.isArray(this.skills)) this.skills = [];
    this._backfillPresetSkills();
    this._seedSkillBonuses();
    this._computeSkillValues();
    for (const s of this.skills) s._preEffectValue = s.value;
  }

  /** Presets come from the character model: an NPC is a student like any other. */
  _backfillPresetSkills() {
    const model = CONFIG.Actor?.dataModels?.character;
    if (!model?.presetSkills) return;
    const known = new Set(this.skills.map((s) => `${s.category}:${s.name}`));
    for (const entry of model.presetSkills()) {
      if (known.has(`${entry.category}:${entry.name}`)) continue;
      this.skills.push({ ...entry });
    }

    // Same rule as a player character: an advantage may open a whole skill.
    for (const item of this.parent?.items ?? []) {
      if (item.type !== 'feature') continue;
      const grant = item.system?.grantsSkill;
      if (!grant?.name || known.has(`special:${grant.name}`)) continue;
      this.skills.push({
        name: grant.name,
        base: Number(grant.base) || 0,
        max: Number(grant.max) || 95,
        maxOverride: true,
        value: Number(grant.base) || 0,
        spent: 0,
        category: 'special',
        spec: '',
        custom: false,
        xpCheck: false,
        grantedBy: item.name,
      });
      known.add(`special:${grant.name}`);
    }
  }

  /** One numeric slot per skill, otherwise an ADD effect would store a string. */
  _seedSkillBonuses() {
    if (!this.skillBonus || typeof this.skillBonus !== 'object') this.skillBonus = {};
    for (const s of this.skills) {
      if (!s.name || s.name.includes('.')) continue;
      this.skillBonus[s.name] = Number(this.skillBonus[s.name]) || 0;
    }
  }

  /**
   * Clamps `spent` to the mastery ceiling and sets `value = base + spent`.
   * @returns {number} Total points spent.
   */
  _computeSkillValues() {
    if (!Array.isArray(this.skills)) return 0;
    const year = Number(this.profile?.year) || 1;
    const autoSchoolMax = CONFIG.Actor.dataModels.character.autoSchoolMax(year);
    let total = 0;

    for (const s of this.skills) {
      const b = Number(s.base) || 0;
      let m = Number(s.max) || 0;
      if (s.category === 'school' && !s.maxOverride) {
        m = autoSchoolMax;
        s.max = autoSchoolMax;
      }
      const p = Math.max(0, Math.min(Number(s.spent) || 0, Math.max(0, m - b)));
      s.spent = p;
      let v = b + p;
      if (m > 0) v = Math.min(v, m);
      s.value = Math.max(v, b);
      total += p;
    }
    return total;
  }

  prepareDerivedData() {
    this.xp = this.cr * this.cr * 100;
    const budget = this.budget;
    this.experience.creationPoints.max = budget.skillPoints;
    this.experience.creationPoints.yearBonus = budget.yearBonus;
    this.experience.personalBonusPoints.max = budget.perkPoints;

    this.checks = {};
    for (const key in this.stats) {
      const value = Number(this.stats[key]?.value) || 0;
      const ageMod = HogwartsNPC.AGE_MALUS_STATS.includes(key) ? -this.ageMalus : 0;
      this.stats[key].label = game.i18n.localize(CONFIG.HOGWARTS.stats[key]) ?? key;
      this.stats[key].ageMod = ageMod;
      this.stats[key].hybridMod = 0;
      this.stats[key].mod = ageMod;
      this.stats[key].total = Math.max(1, value + ageMod);
      this.checks[key] = this.stats[key].total * 5;
    }

    const siz = Number(this.stats.siz?.total) || 0;
    const con = Number(this.stats.con?.total) || 0;
    if (siz > 0 && con > 0) this.health.max = Math.ceil((siz + con) / 2);
    if (this.healthNonLethal) this.healthNonLethal.max = this.health.max;

    const total = (Number(this.stats.str?.total) || 0) + siz;
    if (total <= 24) this.damageBonus = '—';
    else if (total <= 32) this.damageBonus = '+1d3';
    else if (total <= 40) this.damageBonus = '+1d6';
    else this.damageBonus = '+2d6';
    this.brawlingDamage = total <= 24 ? '1d3' : `1d3${this.damageBonus}`;

    // The attack typed in by the gamemaster wins: it is what the header button
    // rolls and displays, the computed brawling damage being only a fallback.
    const attaque = String(this.damage ?? '').trim();
    this.attackFormula = attaque || this.brawlingDamage;

    const per = Number(this.stats.per?.total) || 0;
    this.derived = deriveSenses({
      per,
      int: Number(this.stats.int?.total) || 0,      pow: Number(this.stats.pow?.total) || 0,
      senseMult: this.senseMult,
      multipliers: CONFIG.HOGWARTS?.derivedMultipliers,
    });

    // An effect may have fired between prepareBaseData and here: capture its
    // contribution before recomputing, so it is not overwritten.
    const deltas = this.skills.map((s) => (Number(s.value) || 0) - (Number(s._preEffectValue) || 0));
    const spent = this._computeSkillValues();
    this.skills.forEach((s, i) => {
      const bonus = Number(this.skillBonus?.[s.name]) || 0;
      s.featureBonus = bonus;
      s.hybridBonus = 0;
      s.value = (Number(s.value) || 0) + bonus + deltas[i];
    });
    this.experience.creationPoints.spent = spent;

    // Wizard blood closes access to a skill category (§Étape 5).
    const sang = this.information?.bloodStatus ?? 'halfblood';
    for (const s of this.skills) {
      s.unavailable = (sang === 'pureblood' && s.category === 'muggle')
        || (sang === 'muggleborn' && s.category === 'wizard');
    }

    this.armorValue = (this.parent?.items ?? [])
      .filter((i) => i.type === 'armor' && i.system?.equipped)
      .reduce((sum, i) => sum + (Number(i.system?.armorValue) || 0), 0);

    // Best equipped shield: a parry bonus, and the same figure as an attack malus.
    this.shieldBonus = (this.parent?.items ?? [])
      .filter((i) => i.type === 'armor' && i.system?.equipped)
      .reduce((best, i) => Math.max(best, Number(i.system?.shieldBonus) || 0), 0);
  }

  getRollData() {
    const data = {};
    if (this.stats) data.stats = foundry.utils.deepClone(this.stats);
    if (this.checks) data.checks = foundry.utils.deepClone(this.checks);
    if (this.skills) data.skills = foundry.utils.deepClone(this.skills);
    data.initiativeBonus = Number(this.initiativeBonus) || 0;
    return data;
  }
}
