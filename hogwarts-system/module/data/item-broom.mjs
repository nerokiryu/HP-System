import HogwartsItemBase from './base-item.mjs';

export default class HogwartsBroom extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Broom',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.brand = new fields.StringField({
      required: true,
      blank: true,
      initial: '',
    });

    schema.characteristics = new fields.StringField({
      required: true,
      blank: true,
      initial: '',
    });

    schema.effects = new fields.StringField({
      required: true,
      blank: true,
      initial: '',
    });

    schema.pbpCost = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: null,
      max: null,
      step: 0.5,
    });

    return schema;
  }
}
