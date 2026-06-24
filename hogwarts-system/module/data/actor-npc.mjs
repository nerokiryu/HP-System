import HogwartsActorBase from './base-actor.mjs';

export default class HogwartsNPC extends HogwartsActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'HOGWARTS.Actor.NPC',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.cr = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
    });

    // Full BRP-like stats (same as character — needed for opposition rolls)
    schema.stats = new fields.SchemaField(
      Object.keys(CONFIG.HOGWARTS.stats).reduce((obj, stat) => {
        obj[stat] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 1 }),
        });
        return obj;
      }, {})
    );

    // Skills array (same structure as character)
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

    // Combat-relevant fields
    schema.damage = new fields.StringField({ blank: true, initial: '1d3' });
    schema.armor = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.movement = new fields.NumberField({ ...requiredInteger, initial: 8, min: 0 });

    // Notes (rich text for GM)
    schema.notes = new fields.SchemaField({
      gmNotes: new fields.HTMLField({ blank: true }),
    });

    return schema;
  }

  prepareDerivedData() {
    this.xp = this.cr * this.cr * 100;

    // Derive stat checks (stat × 5) for opposition rolls
    this.checks = {};
    for (const key in this.stats) {
      const v = Number(this.stats[key]?.value) || 0;
      this.stats[key].label = game.i18n.localize(CONFIG.HOGWARTS.stats[key]) ?? key;
      this.checks[key] = v * 5;
    }

    // Calculate health max: (SIZ + CON) / 2
    const siz = Number(this.stats.siz?.value) || 0;
    const con = Number(this.stats.con?.value) || 0;
    if (siz > 0 && con > 0) {
      this.health.max = Math.ceil((siz + con) / 2);
    }
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

    // Derive skill values
    if (Array.isArray(this.skills)) {
      for (const s of this.skills) {
        const b = Number(s.base) || 0;
        const p = Number(s.spent) || 0;
        s.value = b + p;
      }
    }
  }

  getRollData() {
    const data = {};
    if (this.stats) data.stats = foundry.utils.deepClone(this.stats);
    if (this.checks) data.checks = foundry.utils.deepClone(this.checks);
    if (this.skills) data.skills = foundry.utils.deepClone(this.skills);
    return data;
  }
}
