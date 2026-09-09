const fields = foundry.data.fields;

/**
 * Typed store for the world-scoped `housePoints` setting. A plain Object setting
 * accepts any shape, so a corrupted value would only surface as NaN in the UI.
 */
export default class HousePointsData extends foundry.abstract.DataModel {
  static defineSchema() {
    const tally = () =>
      new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    return {
      gryffindor: tally(),
      slytherin: tally(),
      ravenclaw: tally(),
      hufflepuff: tally(),
    };
  }
}
