import HogwartsItemBase from './base-item.mjs';

export default class HogwartsFeature extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Feature',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    
    schema.perkType = new fields.StringField({
      initial: '',
      blank: true,
      // Keep legacy 'ability' for compatibility, and add new specific types
      choices: ['', 'fateBoon', 'fateBane', 'advantage', 'disadvantage', 'ability', 'abilityNatural', 'abilitySpecial', 'houseAxiom']
    });

    schema.pbpCost = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: null,
      max: null,
      step: 0.5
    });

    // Some advantages grant a whole skill (Animagus, Legilimens, Occlumens,
    // Métamorphomage). An Active Effect cannot add a row to an array, so the
    // actor reads this field to compose its list.
    schema.grantsSkill = new fields.SchemaField({
      name: new fields.StringField({ blank: true, initial: '' }),
      base: new fields.NumberField({ ...{ required: true, nullable: false, integer: true }, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...{ required: true, nullable: false, integer: true }, initial: 0, min: 0 }),
    });

    return schema;
  }
}
