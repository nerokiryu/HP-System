import { QUIDDITCH_ROLES, LINEUP } from '../helpers/quidditch.mjs';

/**
 * A Quidditch squad (ch. 28), stored as an Actor so it gets a sheet, folders,
 * per-player permissions and compendium export for free.
 *
 * It deliberately does not extend the actor base: a team has no hit points, no
 * characteristics and never takes damage.
 */
export default class HogwartsQuidditchTeam extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ['HOGWARTS.Actor.QuidditchTeam'];

  static defineSchema() {
    const fields = foundry.data.fields;
    const tally = () => new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 });

    return {
      house: new fields.StringField({ required: false, blank: true, initial: '' }),
      // Actor id of the captain, who alone may call a time-out (l. 29537).
      captain: new fields.StringField({ required: false, blank: true, initial: '' }),
      players: new fields.ArrayField(
        new fields.SchemaField({
          actorId: new fields.StringField({ required: true, blank: false }),
          role: new fields.StringField({ required: true, initial: 'chaser', choices: Object.keys(QUIDDITCH_ROLES) }),
        }),
        { initial: [] }
      ),
      record: new fields.SchemaField({
        wins: tally(),
        losses: tally(),
        pointsFor: tally(),
        pointsAgainst: tally(),
      }),
      description: new fields.HTMLField({ blank: true }),
      notes: new fields.HTMLField({ blank: true }),
    };
  }

  prepareDerivedData() {
    const counts = Object.fromEntries(Object.keys(QUIDDITCH_ROLES).map((r) => [r, 0]));
    for (const p of this.players) counts[p.role] = (counts[p.role] ?? 0) + 1;

    this.counts = counts;
    this.size = this.players.length;
    // The book fixes the line-up at seven: 3 chasers, 2 beaters, 1 keeper,
    // 1 seeker (l. 29488). Anything else is flagged rather than blocked, since
    // an injured team plays on a player short (l. 29548).
    this.lineupIssues = Object.entries(LINEUP)
      .filter(([role, expected]) => counts[role] !== expected)
      .map(([role, expected]) => ({ role, expected, actual: counts[role] }));
    this.lineupValid = this.lineupIssues.length === 0;
  }
}
