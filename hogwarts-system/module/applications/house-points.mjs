const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * House points tracker (Chap. 24.2).
 *
 * Points can be adjusted by hand, or derived from the rulebook's action tables:
 * the teacher's mood is rolled on 1d100 and decides how many points the action
 * is worth. The mood bands differ between losses and gains, and a roll in the
 * extreme band means an automatic punishment or reward on top of the points.
 */
export class HousePointsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hogwarts-house-points',
    tag: 'div',
    classes: ['hogwarts-system', 'house-points'],
    window: { title: 'HOGWARTS.HousePoints.Title', icon: 'fas fa-hourglass-half', resizable: true },
    position: { width: 760, height: 'auto' },
    actions: {
      adjust: HousePointsApp._onAdjust,
      rollAction: HousePointsApp._onRollAction,
      resetAll: HousePointsApp._onResetAll,
    },
  };

  static PARTS = {
    body: { template: 'systems/hogwarts-system/templates/apps/house-points.hbs' },
  };

  /** Current totals, always through the world setting so every client agrees. */
  static get points() {
    return game.settings.get('hogwarts-system', 'housePoints') ?? {};
  }

  /** Survives re-renders, which the standings sort would otherwise scramble. */
  #targetHouse = null;

  /** Gem level drawn by the previous render, so the next one can animate away from it. */
  #drawn = null;

  /** Hourglass geometry, expressed in the SVG's own user units. */
  static GLASS = { top: 14, neck: 80, bottom: 146, height: 66 };

  /** @override */
  async _prepareContext() {
    const points = HousePointsApp.points;
    const houses = Object.entries(CONFIG.HOGWARTS.houses).map(([id, label]) => ({
      id, label: game.i18n.localize(label), points: Number(points[id]) || 0,
    }));

    // A floor keeps a single early award from filling a glass to the brim.
    const scale = Math.max(100, ...houses.map((h) => h.points));
    const best = Math.max(...houses.map((h) => h.points));
    const G = HousePointsApp.GLASS;
    for (const h of houses) {
      const ratio = Math.min(1, Math.max(0, h.points / scale));
      h.lower = { y: G.bottom - G.height * ratio, h: G.height * ratio };
      h.leader = best > 0 && h.points === best;

      const was = this.#drawn?.[h.id];
      h.from = was && was.h !== h.lower.h ? was : null;
      h.rising = h.from ? h.lower.h > h.from.h : false;
    }
    this.#drawn = Object.fromEntries(houses.map((h) => [h.id, { ...h.lower }]));

    const ranked = [...houses].sort((a, b) => b.points - a.points);
    this.#targetHouse ??= houses[0]?.id ?? null;

    const L = (kind, cat, key) => game.i18n.localize(`HOGWARTS.HousePoints.Action.${kind}.${key}`);
    const build = (kind) => Object.entries(CONFIG.HOGWARTS.housePointActions[kind])
      .map(([cat, list]) => ({
        cat,
        label: game.i18n.localize(`HOGWARTS.HousePoints.Category.${cat}`),
        actions: list.map((a) => ({ ...a, kind, cat, label: L(kind, cat, a.key) })),
      }));

    return {
      houses,
      picker: houses.map((h) => ({ ...h, selected: h.id === this.#targetHouse })),
      isGM: game.user.isGM,
      leader: ranked[0]?.points ? ranked[0] : null,
      gain: build('gain'),
      loss: build('loss'),
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('select[name=house]')
      ?.addEventListener('change', (ev) => { this.#targetHouse = ev.target.value; });
    this.#animateGems();
  }

  /**
   * Raise or lower the gems from the level the previous render drew.
   *
   * Uses the Web Animations API rather than a CSS transition off an inline style:
   * a hidden window never fires `requestAnimationFrame`, which would leave the
   * inline start value stranded and the glass showing a stale level.
   */
  #animateGems() {
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const fig of this.element.querySelectorAll('.hourglass[data-from-h]')) {
      const { fromY, fromH } = fig.dataset;
      for (const rect of fig.querySelectorAll('.sand, .gems')) {
        // The empty closing keyframe resolves to the element's own attributes.
        rect.animate(
          [{ y: `${fromY}px`, height: `${fromH}px` }, {}],
          { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
    }
  }

  /**
   * Persist a delta and announce it in chat.
   * @param {string} house
   * @param {number} delta
   * @param {string} reason
   * @param {Roll[]} rolls
   */
  static async applyDelta(house, delta, reason, rolls = []) {
    const points = foundry.utils.deepClone(HousePointsApp.points);
    points[house] = (Number(points[house]) || 0) + delta;
    await game.settings.set('hogwarts-system', 'housePoints', points);

    const houseLabel = game.i18n.localize(CONFIG.HOGWARTS.houses[house]);
    const sign = delta >= 0 ? '+' : '';
    const cls = delta >= 0 ? 'points-gain' : 'points-loss';
    const content = `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${houseLabel}</h3>
        <span class="card-type">${game.i18n.localize('HOGWARTS.HousePoints.Title')}</span></header>
        <div class="card-row ${cls}"><strong>${sign}${delta}</strong> — ${reason}</div>
        <div class="card-row">${game.i18n.localize('HOGWARTS.HousePoints.NewTotal')}: ${points[house]}</div>
      </div>`;
    await ChatMessage.create({ content, rolls, rollMode: game.settings.get('core', 'rollMode') });
  }

  /** Re-render every open tracker. Called on the setting update, so all clients follow. */
  static refreshAll() {
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof HousePointsApp) app.render();
    }
  }

  /**
   * Manual adjustment from the +/- controls.
   * @this HousePointsApp
   */
  static async _onAdjust(event, target) {
    const house = target.dataset.house;
    const input = this.element.querySelector(`input[name="delta-${house}"]`);
    const amount = Math.abs(Number(input?.value) || 0);
    if (!amount) return ui.notifications.warn(game.i18n.localize('HOGWARTS.HousePoints.NoAmount'));
    const delta = target.dataset.sign === '-' ? -amount : amount;
    await HousePointsApp.applyDelta(house, delta, game.i18n.localize('HOGWARTS.HousePoints.Manual'));
    if (input) input.value = '';
  }

  /**
   * Roll the teacher's mood for a table action and apply the resulting points.
   * @this HousePointsApp
   */
  static async _onRollAction(event, target) {
    const { kind, cat, key } = target.dataset;
    const house = this.element.querySelector('select[name="house"]')?.value;
    if (!house) return ui.notifications.warn(game.i18n.localize('HOGWARTS.HousePoints.NoHouse'));

    const action = CONFIG.HOGWARTS.housePointActions[kind][cat].find((a) => a.key === key);
    if (!action) return;

    const roll = new Roll('1d100');
    await roll.evaluate();
    const bands = CONFIG.HOGWARTS.housePointMoods[kind];
    const band = bands.find((b) => roll.total >= b.min && roll.total <= b.max) ?? bands[1];

    // The extreme band grants the harshest/most generous value plus a
    // punishment or reward the Gamemaster narrates.
    const moodId = band.id === 'auto' ? (kind === 'loss' ? 'bad' : 'good') : band.id;
    const amount = Number(action[moodId]) || 0;
    const delta = kind === 'loss' ? -amount : amount;

    const moodLabel = game.i18n.localize(`HOGWARTS.HousePoints.Mood.${band.id}`);
    const actionLabel = game.i18n.localize(`HOGWARTS.HousePoints.Action.${kind}.${key}`);
    const reason = `${actionLabel} — ${game.i18n.localize('HOGWARTS.HousePoints.Mood.Label')}: ${moodLabel} (${roll.total})`;
    await HousePointsApp.applyDelta(house, delta, reason, [roll]);
  }

  /** @this HousePointsApp */
  static async _onResetAll() {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('HOGWARTS.HousePoints.Reset') },
      content: `<p>${game.i18n.localize('HOGWARTS.HousePoints.ResetConfirm')}</p>`,
    }).catch(() => false);
    if (!ok) return;
    const blank = Object.fromEntries(Object.keys(CONFIG.HOGWARTS.houses).map((h) => [h, 0]));
    await game.settings.set('hogwarts-system', 'housePoints', blank);
  }
}

Hooks.on('updateSetting', (setting) => {
  if (setting.key === 'hogwarts-system.housePoints') HousePointsApp.refreshAll();
});
