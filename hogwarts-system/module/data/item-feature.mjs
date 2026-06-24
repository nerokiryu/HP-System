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

    return schema;
  }
}
