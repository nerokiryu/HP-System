import HogwartsActorBase from './base-actor.mjs';

/**
 * Personnage non-joueur (§21.1).
 *
 * « La création de personnages non-joueurs suit les mêmes étapes que celles de
 * la création des personnages, à quelques exceptions près » : le PNJ est donc un
 * élève complet, pas un bloc de statistiques. Seuls les budgets changent —
 * 350 points de compétence contre 400, et 4,5 points d'avantages contre 6.
 *
 * Le §21.2 réserve un sort particulier aux **rivaux**, « créés comme des
 * personnages joueurs (même nombre de points de caractéristiques et de
 * compétences, ainsi que même nombre de points d'avantages) », faute de quoi les
 * confrontations se font à forces inégales. D'où la bascule `rival`.
 */
export default class HogwartsNPC extends HogwartsActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'HOGWARTS.Actor.NPC',
  ];

  /** Budgets de création, §21.1 pour le PNJ ordinaire et §21.2 pour le rival. */
  static BUDGETS = {
    standard: { skillPoints: 350, perkPoints: 4.5 },
    rival: { skillPoints: 400, perkPoints: 6 },
  };

  /**
   * Points de compétences supplémentaires d'un personnage créé dans une année
   * avancée (§22.2.1). Le livre donne une fourchette par année ; on retient son
   * plafond, pour ne pas signaler comme dépassement une répartition qu'il autorise.
   * Le §22 ne touche pas aux points d'avantages, qui restent ceux du §21.1.
   */
  static YEAR_SKILL_BONUS = { 1: 0, 2: 50, 3: 110, 4: 180, 5: 250, 6: 330, 7: 410 };

  /** Identique au personnage : les PNJ sont des élèves, donc soumis à l'âge. */
  static ADULT_AGE = 16;
  static AGE_MALUS_STATS = ['str', 'con', 'siz'];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Conservé des versions précédentes : repère de dangerosité pour le MJ.
    schema.cr = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });

    // §21.2 : un rival se crée avec les budgets d'un personnage joueur.
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

    // Même mécanisme que le personnage : seule cible praticable pour un effet
    // venu d'un compendium, l'ordre du tableau variant d'une fiche à l'autre.
    schema.skillBonus = new fields.ObjectField();

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

    return schema;
  }

  /** « Malus qui diminuera de 1 chaque année » (l. 574), table du §22.1.2. */
  get ageMalus() {
    const age = Number(this.profile?.age);
    if (!Number.isFinite(age)) return 0;
    return Math.max(0, HogwartsNPC.ADULT_AGE - age);
  }

  /** Budget applicable, selon que le PNJ est un rival ou non. */
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

  /** Les préréglages viennent du personnage : un PNJ est un élève comme un autre. */
  _backfillPresetSkills() {
    const model = CONFIG.Actor?.dataModels?.character;
    if (!model?.presetSkills) return;
    const connus = new Set(this.skills.map((s) => `${s.category}:${s.name}`));
    for (const entree of model.presetSkills()) {
      if (connus.has(`${entree.category}:${entree.name}`)) continue;
      this.skills.push({ ...entree });
    }
  }

  /** Une case numérique par compétence, sinon un effet ADD y stockerait une chaîne. */
  _seedSkillBonuses() {
    if (!this.skillBonus || typeof this.skillBonus !== 'object') this.skillBonus = {};
    for (const s of this.skills) {
      if (!s.name || s.name.includes('.')) continue;
      this.skillBonus[s.name] = Number(this.skillBonus[s.name]) || 0;
    }
  }

  /**
   * Écrête `spent` au plafond de maîtrise et pose `value = base + spent`.
   * @returns {number} Total des points dépensés.
   */
  _computeSkillValues() {
    if (!Array.isArray(this.skills)) return 0;
    const year = Number(this.profile?.year) || 1;
    const autoSchoolMax = Math.min(100, 30 + (year - 1) * 15);
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

    // L'attaque saisie par le MJ prime : c'est elle que le bouton de l'en-tête
    // lance et affiche, la bagarre calculée ne servant que de repli.
    const attaque = String(this.damage ?? '').trim();
    this.attackFormula = attaque || this.brawlingDamage;

    const per = Number(this.stats.per?.total) || 0;
    const dm = CONFIG.HOGWARTS?.derivedMultipliers ?? {};
    this.derived = {
      taste: per * (dm.taste ?? 3),
      smell: per * (dm.smell ?? 3),
      hearing: per * (dm.hearing ?? 4),
      touch: per * (dm.touch ?? 3),
      sight: per * (dm.sight ?? 5),
      idea: (Number(this.stats.int?.total) || 0) * (dm.idea ?? 5),
      luck: (Number(this.stats.pow?.total) || 0) * (dm.luck ?? 5),
    };

    // Un effet a pu jouer entre prepareBaseData et ici : on capte son apport
    // avant de recalculer, pour ne pas l'écraser.
    const deltas = this.skills.map((s) => (Number(s.value) || 0) - (Number(s._preEffectValue) || 0));
    const depense = this._computeSkillValues();
    this.skills.forEach((s, i) => {
      const bonus = Number(this.skillBonus?.[s.name]) || 0;
      s.featureBonus = bonus;
      s.hybridBonus = 0;
      s.value = (Number(s.value) || 0) + bonus + deltas[i];
    });
    this.experience.creationPoints.spent = depense;

    // Le sang du sorcier ferme l'accès à une catégorie de compétences (§Étape 5).
    const sang = this.information?.bloodStatus ?? 'halfblood';
    for (const s of this.skills) {
      s.unavailable = (sang === 'pureblood' && s.category === 'muggle')
        || (sang === 'muggleborn' && s.category === 'wizard');
    }

    this.armorValue = (this.parent?.items ?? [])
      .filter((i) => i.type === 'armor' && i.system?.equipped)
      .reduce((sum, i) => sum + (Number(i.system?.armorValue) || 0), 0);

    // Meilleur bouclier équipé : bonus à la parade, même chiffre en malus d'attaque.
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
