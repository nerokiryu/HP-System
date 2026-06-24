import HogwartsItemBase from './base-item.mjs';

export default class HogwartsArmor extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Armor',
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

    schema.cost = new fields.SchemaField({
      galleons: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      sickles: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      knuts: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });

    schema.pbpCost = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      step: 0.5,
    });

    schema.armorValue = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      max: 10,
    });

    return schema;
  }
}
