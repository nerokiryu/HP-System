import HogwartsItemBase from './base-item.mjs';

export default class HogwartsSpell extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 0,
      max: 6,
    });

    schema.malus = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      min: -500,
      max: 0,
    });

    schema.spellType = new fields.StringField({
      required: false,
      initial: 'X',
      choices: ['E', 'M', 'S', 'X'],
    });

    // A spell can target one or more categories at once (e.g. "A/P").
    schema.target = new fields.SetField(
      new fields.StringField({
        required: true,
        blank: false,
        choices: ['A', 'O', 'P', 'V', 'S', 'X'],
      }),
      { initial: ['P'] }
    );

    schema.incantation = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
    });

    schema.malusExtremeFormula = new fields.NumberField({
      required: false,
      nullable: false,
      integer: true,
      initial: 0,
      min: -500,
      max: 0,
    });

    schema.extremeFormula = new fields.BooleanField({
      required: false,
      initial: false,
    });

    // Instinctive / pre-school spell: roll POWer×3 instead of school skill
    schema.preSchool = new fields.BooleanField({
      required: false,
      initial: false,
    });

    return schema;
  }

  /**
   * Convert legacy single-string targets (e.g. "P" or "A/P") into the set of
   * target codes used by the current schema. Without this, items created with
   * the old format would fail validation on every update and silently revert
   * all field changes (including the malus).
   */
  static migrateData(source) {
    if (typeof source.target === 'string') {
      source.target = source.target
        .split('/')
        .map((code) => code.trim())
        .filter(Boolean);
    }
    return super.migrateData(source);
  }

  /** Comma-joined target codes for compact display in lists. */
  get targetDisplay() {
    return Array.from(this.target ?? []).join(' / ');
  }
}
