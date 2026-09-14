const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Assistant de l'étape 2 de la création (l. 565-575).
 *
 * « Pour déterminer la valeur d'une caractéristique, on lance 2d6+6 et on note le
 * résultat sur une feuille de brouillon. On répartit ensuite les valeurs des
 * caractéristiques en fonction de l'archétype de sorcier qu'on désire incarner. »
 *
 * Le tirage est donc un pool de huit valeurs à répartir, pas huit jets assignés
 * d'office : l'assistant tire, propose la répartition publiée pour l'archétype
 * choisi (l. 640-646), et laisse le joueur échanger les valeurs à sa guise.
 *
 * Les valeurs écrites sont celles d'un **adulte** : le malus d'âge est appliqué
 * ensuite par le modèle de données, et l'aperçu montre ce que cela donne.
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

  /** Ordre d'affichage des huit caractéristiques. */
  static STATS = ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app', 'per'];

  /** Champ à refocaliser après le re-rendu, qui remplace tous les contrôles. */
  #focus = null;

  /**
   * À chaque type d'acteur sa formule : `2d6+6` pour un personnage joueur
   * (l. 566), `3d6` pour un PNJ — « On lance 3d6 pour les 8 caractéristiques »
   * (§21.1). Les PJ sont des héros, donc tenus à la fourchette 8-18 ; un PNJ
   * ordinaire descend jusqu'à 3.
   */
  static FORMULES = {
    character: { libelle: '2d6+6', des: 2, socle: 6 },
    npc: { libelle: '3d6', des: 3, socle: 0 },
  };

  /**
   * @param {Actor} actor
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.formule = CharacterCreationApp.FORMULES[actor.type] ?? CharacterCreationApp.FORMULES.character;
    this.pool = CharacterCreationApp.roll(this.formule);
    // Choix de l'assistant, distinct de celui de la fiche : on peut essayer une
    // répartition sans toucher à l'acteur tant qu'on n'a pas appliqué.
    this.archetype = actor.system?.profile?.archetype ?? '';
    this.assignment = this.#byArchetype(this.archetype);
  }

  get title() {
    return `${game.i18n.localize('HOGWARTS.Creation.Title')} — ${this.actor.name}`;
  }

  /** Huit tirages de la formule du type d'acteur. */
  static roll(formule = CharacterCreationApp.FORMULES.character) {
    const un = () => 1 + Math.floor(CONFIG.Dice.randomUniform() * 6);
    return Array.from({ length: 8 }, () => {
      let total = formule.socle;
      for (let i = 0; i < formule.des; i++) total += un();
      return total;
    }).sort((a, b) => b - a);
  }

  /**
   * Range le pool décroissant selon l'ordre de priorité de l'archétype, le reste
   * des valeurs allant aux caractéristiques non citées.
   * @returns {Record<string, number>}
   */
  #byArchetype(archetype) {
    const priorite = CONFIG.HOGWARTS?.archetypePriority?.[archetype] ?? [];
    const ordre = [...priorite, ...CharacterCreationApp.STATS.filter((s) => !priorite.includes(s))];
    return Object.fromEntries(ordre.map((stat, i) => [stat, this.pool[i]]));
  }

  /** @override */
  async _prepareContext() {
    const malus = this.actor.system?.ageMalus ?? 0;
    const stats = CharacterCreationApp.STATS.map((key) => {
      const adulte = Number(this.assignment[key]) || 0;
      const touchee = this.actor.system.constructor.AGE_MALUS_STATS.includes(key);
      return {
        key,
        label: game.i18n.localize(CONFIG.HOGWARTS.stats[key]),
        adulte,
        actuel: touchee ? Math.max(1, adulte - malus) : adulte,
        touchee,
      };
    });

    const valeur = (k) => stats.find((s) => s.key === k).actuel;
    const total = valeur('str') + valeur('siz');

    return {
      stats,
      pool: this.pool,
      formule: this.formule.libelle,
      malus,
      age: this.actor.system?.profile?.age,
      archetype: this.archetype,
      archetypes: CONFIG.HOGWARTS.archetypes,
      // Le joueur voit tout de suite ce que sa répartition donne en jeu.
      apercu: {
        health: Math.ceil((valeur('siz') + valeur('con')) / 2),
        damage: total <= 24 ? '—' : total <= 32 ? '+1d3' : total <= 40 ? '+1d6' : '+2d6',
        idea: valeur('int') * 5,
        luck: valeur('pow') * 5,
      },
      // Un doublon signifie qu'une valeur du pool a été perdue dans l'échange.
      doublons: CharacterCreationApp.#doublons(this.assignment, this.pool),
      buttons: [
        { type: 'submit', icon: 'fas fa-check', label: 'HOGWARTS.Creation.Apply' },
        { type: 'button', action: 'reroll', icon: 'fas fa-rotate', label: 'HOGWARTS.Creation.Reroll' },
      ],
    };
  }

  /** Les huit valeurs assignées doivent être exactement le pool tiré. */
  static #doublons(assignment, pool) {
    const restant = [...pool];
    for (const v of Object.values(assignment)) {
      const i = restant.indexOf(Number(v));
      if (i >= 0) restant.splice(i, 1);
    }
    return restant.length > 0;
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
    const champ = event.target;

    if (champ?.name === 'archetype') {
      this.archetype = champ.value;
      this.assignment = this.#byArchetype(this.archetype);
      this.#focus = champ.name;
      this.render();
      return;
    }

    if (!champ?.name?.startsWith('stat.')) return;

    const stat = champ.name.slice(5);
    const valeur = Number(champ.value);
    const precedente = Number(this.assignment[stat]);
    // Échange plutôt qu'écrasement : le pool reste intact, comme au brouillon.
    const autre = Object.keys(this.assignment).find((k) => k !== stat && Number(this.assignment[k]) === valeur);
    if (autre) this.assignment[autre] = precedente;
    this.assignment[stat] = valeur;
    this.#focus = champ.name;
    this.render();
  }

  static #onReroll() {
    this.pool = CharacterCreationApp.roll(this.formule);
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
