const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Assistant for step 2 of character creation (l. 565-575).
 *
 * « Pour déterminer la valeur d'une caractéristique, on lance 2d6+6 et on note le
 * résultat sur une feuille de brouillon. On répartit ensuite les valeurs des
 * caractéristiques en fonction de l'archétype de sorcier qu'on désire incarner. »
 *
 * The roll is therefore a pool of eight values to spread around, not eight rolls
 * assigned outright: the assistant rolls, proposes the published spread for the
 * chosen archetype (l. 640-646), and lets the player swap values at will.
 *
 * The values written down are those of an **adult**: the age malus is applied
 * afterwards by the data model, and the preview shows the outcome.
 */
export class CharacterCreationApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hogwarts-character-creation',
    tag: 'form',
    classes: ['hogwarts-system', 'character-creation'],
    window: { title: 'HOGWARTS.Creation.Title', icon: 'fas fa-dice', resizable: true },
    position: { width: 560, height: 'auto' },
    form: { handler: CharacterCreationApp.#onSubmit, closeOnSubmit: true },
    actions: {
      reroll: CharacterCreationApp.#onReroll,
    },
  };

  static PARTS = {
    body: { template: 'systems/hogwarts-system/templates/apps/character-creation.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  /** Display order of the eight characteristics. */
  static STATS = ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app', 'per'];

  /** Field to refocus after the re-render, which replaces every control. */
  #focus = null;

  /**
   * One formula per actor type: `2d6+6` for a player character (l. 566), `3d6`
   * for an NPC — « On lance 3d6 pour les 8 caractéristiques » (§21.1). Player
   * characters are heroes, hence the 8-18 range; a plain NPC can go down to 3.
   */
  static FORMULAS = {
    character: { label: '2d6+6', dice: 2, floor: 6 },
    npc: { label: '3d6', dice: 3, floor: 0 },
  };

  /**
   * @param {Actor} actor
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.formula = CharacterCreationApp.FORMULAS[actor.type] ?? CharacterCreationApp.FORMULAS.character;
    this.pool = CharacterCreationApp.roll(this.formula);
    // The assistant's own choice, distinct from the sheet's: a spread can be
    // tried out without touching the actor until it is applied.
    this.archetype = actor.system?.profile?.archetype ?? '';
    this.assignment = this.#byArchetype(this.archetype);
  }

  get title() {
    return `${game.i18n.localize('HOGWARTS.Creation.Title')} — ${this.actor.name}`;
  }

  /** Eight rolls of the formula matching the actor type. */
  static roll(formula = CharacterCreationApp.FORMULAS.character) {
    const un = () => 1 + Math.floor(CONFIG.Dice.randomUniform() * 6);
    return Array.from({ length: 8 }, () => {
      let total = formula.floor;
      for (let i = 0; i < formula.dice; i++) total += un();
      return total;
    }).sort((a, b) => b - a);
  }

  /**
   * Lays the descending pool out along the archetype's priority order, the rest
   * of the values going to the characteristics it does not name.
   * @returns {Record<string, number>}
   */
  #byArchetype(archetype) {
    const priority = CONFIG.HOGWARTS?.archetypePriority?.[archetype] ?? [];
    const order = [...priority, ...CharacterCreationApp.STATS.filter((s) => !priority.includes(s))];
    return Object.fromEntries(order.map((stat, i) => [stat, this.pool[i]]));
  }

  /** @override */
  async _prepareContext() {
    const ageMalus = this.actor.system?.ageMalus ?? 0;
    const stats = CharacterCreationApp.STATS.map((key) => {
      const adult = Number(this.assignment[key]) || 0;
      const aged = this.actor.system.constructor.AGE_MALUS_STATS.includes(key);
      return {
        key,
        label: game.i18n.localize(CONFIG.HOGWARTS.stats[key]),
        adult,
        current: aged ? Math.max(1, adult - ageMalus) : adult,
        aged,
      };
    });

    const statValue = (k) => stats.find((s) => s.key === k).current;
    const total = statValue('str') + statValue('siz');

    return {
      stats,
      pool: this.pool,
      formula: this.formula.label,
      ageMalus,
      age: this.actor.system?.profile?.age,
      archetype: this.archetype,
      archetypes: CONFIG.HOGWARTS.archetypes,
      // The player sees at once what the spread yields in play.
      preview: {
        health: Math.ceil((statValue('siz') + statValue('con')) / 2),
        damage: total <= 24 ? '—' : total <= 32 ? '+1d3' : total <= 40 ? '+1d6' : '+2d6',
        idea: statValue('int') * 5,
        luck: statValue('pow') * 5,
      },
      // A duplicate means a pool value was lost during a swap.
      duplicates: CharacterCreationApp.#duplicates(this.assignment, this.pool),
      buttons: [
        { type: 'submit', icon: 'fas fa-check', label: 'HOGWARTS.Creation.Apply' },
        { type: 'button', action: 'reroll', icon: 'fas fa-rotate', label: 'HOGWARTS.Creation.Reroll' },
      ],
    };
  }

  /** The eight assigned values must be exactly the pool that was rolled. */
  static #duplicates(assignment, pool) {
    const remaining = [...pool];
    for (const v of Object.values(assignment)) {
      const i = remaining.indexOf(Number(v));
      if (i >= 0) remaining.splice(i, 1);
    }
    return remaining.length > 0;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.#focus) return;
    this.element.querySelector(`[name="${CSS.escape(this.#focus)}"]`)?.focus();
    this.#focus = null;
  }

  /** @override */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const field = event.target;

    if (field?.name === 'archetype') {
      this.archetype = field.value;
      this.assignment = this.#byArchetype(this.archetype);
      this.#focus = field.name;
      this.render();
      return;
    }

    if (!field?.name?.startsWith('stat.')) return;

    const stat = field.name.slice(5);
    const valueOf = Number(field.value);
    const previous = Number(this.assignment[stat]);
    // Swap rather than overwrite: the pool stays intact, as on the scratch sheet.
    const other = Object.keys(this.assignment).find((k) => k !== stat && Number(this.assignment[k]) === valueOf);
    if (other) this.assignment[other] = previous;
    this.assignment[stat] = valueOf;
    this.#focus = field.name;
    this.render();
  }

  static #onReroll() {
    this.pool = CharacterCreationApp.roll(this.formula);
    this.assignment = this.#byArchetype(this.archetype);
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const patch = {};
    for (const key of CharacterCreationApp.STATS) {
      patch[`system.stats.${key}.value`] = Number(this.assignment[key]) || 8;
    }
    await this.actor.update(patch);
    ui.notifications?.info(game.i18n.format('HOGWARTS.Creation.Done', { name: this.actor.name }));
  }
}
