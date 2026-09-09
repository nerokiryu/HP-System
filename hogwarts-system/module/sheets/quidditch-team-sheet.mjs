import { QUIDDITCH_ROLES, LINEUP } from '../helpers/quidditch.mjs';

const { api, sheets } = foundry.applications;

/**
 * Sheet for the `quidditchTeam` actor. Kept separate from the character sheet:
 * a squad shares none of its tabs, rolls or resources.
 */
export class HogwartsQuidditchTeamSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['hogwarts-system', 'quidditch-team'],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      onEditImage: HogwartsQuidditchTeamSheet._onEditImage,
      addPlayer: HogwartsQuidditchTeamSheet._onAddPlayer,
      removePlayer: HogwartsQuidditchTeamSheet._onRemovePlayer,
      openPlayer: HogwartsQuidditchTeamSheet._onOpenPlayer,
      setCaptain: HogwartsQuidditchTeamSheet._onSetCaptain,
    },
    dragDrop: [{ dragSelector: null, dropSelector: '.quidditch-team-sheet' }],
  };

  static PARTS = {
    body: { template: 'systems/hogwarts-system/templates/actor/quidditch-team.hbs', scrollable: [''] },
  };

  /** @override */
  async _prepareContext() {
    const sys = this.actor.system;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;

    const players = sys.players.map((p, index) => {
      const actor = game.actors.get(p.actorId);
      return {
        index,
        actorId: p.actorId,
        name: actor?.name ?? game.i18n.localize('HOGWARTS.Quidditch.Team.MissingPlayer'),
        img: actor?.img ?? 'icons/svg/mystery-man.svg',
        missing: !actor,
        role: p.role,
        isCaptain: p.actorId === sys.captain,
      };
    });

    return {
      actor: this.actor,
      system: sys,
      editable: this.isEditable,
      players,
      roles: Object.entries(QUIDDITCH_ROLES).map(([key, r]) => ({ key, label: game.i18n.localize(r.label) })),
      houses: Object.entries(CONFIG.HOGWARTS.houses).map(([key, label]) => ({ key, label: game.i18n.localize(label) })),
      lineup: {
        valid: sys.lineupValid,
        size: sys.size,
        expected: Object.values(LINEUP).reduce((a, b) => a + b, 0),
        issues: sys.lineupIssues.map((i) => ({
          ...i,
          label: game.i18n.localize(QUIDDITCH_ROLES[i.role].label),
        })),
      },
      enrichedDescription: await TextEditor.enrichHTML(sys.description, { secrets: this.actor.isOwner }),
      enrichedNotes: await TextEditor.enrichHTML(sys.notes, { secrets: this.actor.isOwner }),
    };
  }

  /** @override */
  async _onDropActor(event, data) {
    if (!this.isEditable) return;
    const actor = await Actor.implementation.fromDropData(data);
    if (!actor || actor.type !== 'character') {
      return ui.notifications.warn(game.i18n.localize('HOGWARTS.Quidditch.Team.OnlyCharacters'));
    }
    if (this.actor.system.players.some((p) => p.actorId === actor.id)) {
      return ui.notifications.warn(game.i18n.format('HOGWARTS.Quidditch.Team.AlreadyIn', { name: actor.name }));
    }
    const players = [...this.actor.system.players.map((p) => ({ ...p })), { actorId: actor.id, role: 'chaser' }];
    await this.actor.update({ 'system.players': players });
  }

  /**
   * @override
   * Mirror the character sheet: the house drives a set of CSS variables through
   * a `house-*` class on the sheet root.
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    for (const c of Array.from(root.classList)) {
      if (c.startsWith('house-')) root.classList.remove(c);
    }
    const house = String(this.actor.system.house ?? '').toLowerCase().replace(/\s+/g, '-');
    if (house) root.classList.add(`house-${house}`);
  }

  /** @this HogwartsQuidditchTeamSheet */
  static async _onEditImage(event, target) {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: this.actor.img,
      callback: (path) => this.actor.update({ img: path }),
    });
    return fp.browse();
  }

  /** @this HogwartsQuidditchTeamSheet */
  static async _onAddPlayer() {
    const players = [...this.actor.system.players.map((p) => ({ ...p }))];
    players.push({ actorId: '', role: 'chaser' });
    await this.actor.update({ 'system.players': players });
  }

  /** @this HogwartsQuidditchTeamSheet */
  static async _onRemovePlayer(event, target) {
    const index = Number(target.dataset.index);
    const players = this.actor.system.players.map((p) => ({ ...p }));
    const [removed] = players.splice(index, 1);
    const update = { 'system.players': players };
    if (removed?.actorId === this.actor.system.captain) update['system.captain'] = '';
    await this.actor.update(update);
  }

  /** @this HogwartsQuidditchTeamSheet */
  static async _onOpenPlayer(event, target) {
    game.actors.get(target.dataset.actorId)?.sheet.render(true);
  }

  /** @this HogwartsQuidditchTeamSheet */
  static async _onSetCaptain(event, target) {
    const id = target.dataset.actorId;
    await this.actor.update({ 'system.captain': this.actor.system.captain === id ? '' : id });
  }
}
