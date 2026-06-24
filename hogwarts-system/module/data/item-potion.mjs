import HogwartsItemBase from './base-item.mjs';

export default class HogwartsPotion extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Potion',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.potionLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 1,
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

    // A potion can target one or more categories at once (e.g. "A/P").
    schema.target = new fields.SetField(
      new fields.StringField({
        required: true,
        blank: false,
        choices: ['A', 'O', 'P', 'V', 'X'],
      }),
      { initial: [] }
    );

    schema.ingredientRarity = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
      choices: ['', 'commun', 'rare', 'rarissime'],
    });

    // List of specific ingredients needed for crafting
    schema.ingredientList = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, blank: true, initial: '' }),
        quantity: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1 }),
        rarity: new fields.StringField({ blank: true, initial: '', choices: ['', 'commun', 'rare', 'rarissime'] }),
        available: new fields.BooleanField({ initial: false }),
      }),
      { initial: [] }
    );

    schema.virulence = new fields.NumberField({
      required: false,
      nullable: true,
      integer: true,
      initial: null,
      min: 0,
    });

    // Crafting-related fields
    schema.prepTime = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
    });

    schema.duration = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
    });

    schema.quantity = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      min: 0,
    });

    schema.crafted = new fields.BooleanField({
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

  /**
   * Check if all ingredients are available for crafting.
   */
  get canBrew() {
    if (this.ingredientList.length === 0) return true;
    return this.ingredientList.every(i => i.available);
  }
}
