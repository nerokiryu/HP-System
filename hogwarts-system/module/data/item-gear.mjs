import HogwartsItemBase from './base-item.mjs';

export default class HogwartsGear extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Gear',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1,
    });
    schema.weight = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: 0,
    });

    // Cost in wizarding currency
    schema.cost = new fields.SchemaField({
      galleons: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
      sickles: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
      knuts: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      })
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
