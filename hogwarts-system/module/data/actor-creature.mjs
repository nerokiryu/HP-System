import HogwartsActorBase from './base-actor.mjs';

export default class HogwartsCreature extends HogwartsActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'HOGWARTS.Actor.Creature',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // ── Classification (X to XXXXX) ──────────────────────────────
    schema.classification = new fields.StringField({
      required: true,
      initial: 'XXX',
      choices: {
        'X': 'X',
        'XX': 'XX',
        'XXX': 'XXX',
        'XXXX': 'XXXX',
        'XXXXX': 'XXXXX',
      },
    });

    // ── Core BRP stats ───────────────────────────────────────────
    const statKeys = ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app', 'per'];
    schema.stats = new fields.SchemaField(
      statKeys.reduce((obj, stat) => {
        obj[stat] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
          formula: new fields.StringField({ blank: true }),
        });
        return obj;
      }, {})
    );

    // ── Movement (ground speed, optional fly/swim in parentheses) ─
    schema.movement = new fields.SchemaField({
      land: new fields.NumberField({ ...requiredInteger, initial: 8, min: 0 }),
      fly: new fields.NumberField({ required: true, nullable: true, initial: null, integer: true, min: 0 }),
      swim: new fields.NumberField({ required: true, nullable: true, initial: null, integer: true, min: 0 }),
    });

    // ── Natural armor ────────────────────────────────────────────
    schema.armor = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      label: new fields.StringField({ blank: true }),
    });

    // ── Attacks (combat) ─────────────────────────────────────────
    schema.attacks = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, blank: true }),
        chance: new fields.NumberField({ ...requiredInteger, initial: 30, min: 0, max: 100 }),
        damage: new fields.StringField({ blank: true, initial: '1d6' }),
      })
    );

    // ── Skills ───────────────────────────────────────────────────
    schema.skills = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true }),
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      })
    );

    // ── Powers & abilities (rich text) ───────────────────────────
    schema.powers = new fields.HTMLField({ blank: true });

    // ── Usage / utility (rich text) ──────────────────────────────
    schema.usage = new fields.HTMLField({ blank: true });

    // ── Resistance to magic ──────────────────────────────────────
    schema.magicResistance = new fields.SchemaField({
      threshold: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 100 }),
      effectReduction: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0 }),
    });

    // ── GM Notes ─────────────────────────────────────────────────
    schema.notes = new fields.SchemaField({
      gmNotes: new fields.HTMLField({ blank: true }),
    });

    return schema;
  }

  prepareDerivedData() {
    // Derive stat checks (stat × 5) for opposition rolls
    this.checks = {};
    for (const key in this.stats) {
      const v = Number(this.stats[key]?.value) || 0;
      this.stats[key].label = game.i18n.localize(CONFIG.HOGWARTS.stats[key]) ?? key;
      // No ancestry on creatures, but the shared roll formulas expect `total`.
      this.stats[key].total = v;
      this.checks[key] = v * 5;
    }

    // Calculate health max: (SIZ + CON) / 2
    const siz = Number(this.stats.siz?.value) || 0;
    const con = Number(this.stats.con?.value) || 0;
    if (siz > 0 && con > 0) {
      this.health.max = Math.ceil((siz + con) / 2);
    }
    if (this.healthNonLethal) this.healthNonLethal.max = this.health.max;

    // Damage bonus based on STR + SIZ
    const str = Number(this.stats.str?.value) || 0;
    const total = str + siz;
    if (total <= 12) {
      this.damageBonus = '-1d4';
    } else if (total <= 16) {
      this.damageBonus = '-1d2';
    } else if (total <= 24) {
      this.damageBonus = '—';
    } else if (total <= 32) {
      this.damageBonus = '+1d3';
    } else if (total <= 40) {
      this.damageBonus = '+1d6';
    } else if (total <= 56) {
      this.damageBonus = '+2d6';
    } else if (total <= 72) {
      this.damageBonus = '+3d6';
    } else {
      this.damageBonus = '+4d6';
    }

    // Luck derived characteristic
    const pow = Number(this.stats.pow?.value) || 0;
    this.luck = pow * 5;

    // Movement display string
    const mv = this.movement;
    const mvParts = [`${mv.land}`];
    if (mv.fly) mvParts.push(`vol ${mv.fly}`);
    if (mv.swim) mvParts.push(`nage ${mv.swim}`);
    this.movementDisplay = mvParts.join(' / ');
  }

  getRollData() {
    const data = {};
    if (this.stats) data.stats = foundry.utils.deepClone(this.stats);
    if (this.checks) data.checks = foundry.utils.deepClone(this.checks);
    if (this.skills) data.skills = foundry.utils.deepClone(this.skills);
    return data;
  }
}
