import HogwartsItemBase from './base-item.mjs';

export default class HogwartsComponent extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Component',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.rarity = new fields.StringField({
      required: true,
      blank: false,
      initial: 'commun',
      choices: ['commun', 'rare', 'rarissime'],
    });

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
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
      }),
    });

    // Potions this ingredient is used in (informational)
    schema.usedIn = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
    });

    // Other uses (informational)
    schema.otherUses = new fields.StringField({
      required: false,
      blank: true,
      initial: '',
    });

    return schema;
  }
}
