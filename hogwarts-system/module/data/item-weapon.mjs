import HogwartsItemBase from './base-item.mjs';

export default class HogwartsWeapon extends HogwartsItemBase {
  static LOCALIZATION_PREFIXES = [
    'HOGWARTS.Item.base',
    'HOGWARTS.Item.Weapon',
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

    schema.damage = new fields.StringField({ blank: true, initial: '1d3' });

    schema.weaponType = new fields.StringField({
      blank: true,
      initial: 'melee',
      choices: {
        'melee': 'HOGWARTS.Item.Weapon.WeaponType.melee',
        'ranged': 'HOGWARTS.Item.Weapon.WeaponType.ranged',
        'thrown': 'HOGWARTS.Item.Weapon.WeaponType.thrown',
      }
    });

    schema.range = new fields.StringField({ blank: true, initial: '' });

    return schema;
  }
}
