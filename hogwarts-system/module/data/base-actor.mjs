export default class HogwartsActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HOGWARTS.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.health = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 10,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 }),
    });
    schema.biography = new fields.HTMLField();

    // Initiative bonus placeholder so Roll formulas referencing
    // `@system.initiativeBonus` always have a defined numeric value.
    schema.initiativeBonus = new fields.NumberField({ required: true, nullable: false, initial: 0 });

    // Non-lethal damage (separate pool, heals at 1/hour of rest — Chap. 1.8)
    schema.healthNonLethal = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 }),
    });

    // Wound condition flags (Blessure grave / Agonie — Chap. 1.8)
    schema.conditions = new fields.SchemaField({
      seriousWound: new fields.BooleanField({ initial: false }),
      agony: new fields.BooleanField({ initial: false }),
      // Non-lethal total equals remaining HP (Chap. 1.10.2)
      staggered: new fields.BooleanField({ initial: false }),
      unconscious: new fields.BooleanField({ initial: false }),
    });

    return schema;
  }
}
