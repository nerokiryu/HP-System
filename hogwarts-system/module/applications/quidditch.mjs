import {
  QUIDDITCH_ROLES,
  QUIDDITCH_ACTIONS,
  QUIDDITCH_FOULS,
  QUIDDITCH_POINTS,
  snitchChance,
} from '../helpers/quidditch.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Blank match state, stored on the Combat document so it follows the encounter. */
const BLANK_MATCH = {
  active: true,
  teams: ['', ''],
  score: [0, 0],
  snitchOnPitch: false,
  snitchSpottedBy: '',
  snitchDistance: 0,
  finished: false,
};

/**
 * Match dashboard for chapter 28. The Combat document supplies rounds, turns
 * and initiative; everything here is the Quidditch layer on top of it.
 */
export class QuidditchApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hogwarts-quidditch',
    classes: ['hogwarts-system', 'quidditch'],
    position: { width: 620, height: 'auto' },
    window: { title: 'HOGWARTS.Quidditch.Title', icon: 'fas fa-broom' },
    actions: {
      startMatch: QuidditchApp._onStartMatch,
      endMatch: QuidditchApp._onEndMatch,
      score: QuidditchApp._onScore,
      setTeam: QuidditchApp._onSetTeam,
      setRole: QuidditchApp._onSetRole,
      rollAction: QuidditchApp._onRollAction,
      rollSnitch: QuidditchApp._onRollSnitch,
      closeDistance: QuidditchApp._onCloseDistance,
      bludgerHit: QuidditchApp._onBludgerHit,
      callFoul: QuidditchApp._onCallFoul,
      openResolver: QuidditchApp._onOpenResolver,
      saveTeam: QuidditchApp._onSaveTeam,
      deleteTeam: QuidditchApp._onDeleteTeam,
    },
  };

  static PARTS = {
    // Without `scrollable`, ApplicationV2 leaves the content overflow hidden and
    // a long line-up is simply clipped with no way to reach it.
    body: { template: 'systems/hogwarts-system/templates/apps/quidditch.hbs', scrollable: [''] },
  };

  /**
   * @override
   * ApplicationV2 fires `data-action` on click only. On a `<select>` that means
   * the handler runs when the list opens, carrying the value the user is about
   * to replace, so the dropdowns are bound to `change` by hand instead.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    for (const el of this.element.querySelectorAll('select[data-change]')) {
      el.addEventListener('change', (ev) => {
        const handler = QuidditchApp.DEFAULT_OPTIONS.actions[el.dataset.change];
        handler?.call(this, ev, el);
      });
    }
  }

  /**
   * The encounter currently doubling as a match.
   *
   * `game.combat` is really `game.combats.viewed`, which goes transiently null
   * while the combat tracker re-renders — and the dashboard re-renders at
   * exactly that moment, blanking itself. The match flag is stable, so it wins.
   */
  static get combat() {
    return game.combats.find((c) => c.getFlag('hogwarts-system', 'quidditch.active')) ?? game.combat ?? null;
  }

  /** Match state read off the active encounter. */
  static get match() {
    const stored = QuidditchApp.combat?.getFlag('hogwarts-system', 'quidditch');
    return foundry.utils.mergeObject(foundry.utils.deepClone(BLANK_MATCH), stored ?? {}, { inplace: false });
  }

  static async setMatch(changes) {
    const combat = QuidditchApp.combat;
    if (!combat) return;
    await combat.setFlag('hogwarts-system', 'quidditch', foundry.utils.mergeObject(QuidditchApp.match, changes, { inplace: false }));
  }

  /** Squads, now first-class actors rather than a world setting. */
  static get teams() {
    return game.actors.filter((a) => a.type === 'quidditchTeam');
  }

  /** @override */
  async _prepareContext() {
    const combat = QuidditchApp.combat;
    const match = QuidditchApp.match;
    const started = !!combat?.started;
    const squads = QuidditchApp.teams.map((t) => ({
      id: t.id,
      name: t.name,
      size: t.system.players.length,
      lineupValid: t.system.lineupValid,
    }));

    const sides = [0, 1].map((i) => {
      const squad = squads.find((t) => t.id === match.teams[i]) ?? null;
      return {
        index: i,
        squadId: match.teams[i] ?? '',
        name: squad?.name ?? game.i18n.format('HOGWARTS.Quidditch.SideDefault', { n: i + 1 }),
        score: Number(match.score[i]) || 0,
      };
    });

    const combatants = (combat?.combatants ?? []).map((c) => {
      const role = c.getFlag('hogwarts-system', 'quidditchRole') ?? 'chaser';
      return {
        id: c.id,
        actorId: c.actorId,
        name: c.name,
        img: c.img,
        initiative: c.initiative,
        role,
        roleLabel: game.i18n.localize(QUIDDITCH_ROLES[role]?.label ?? role),
        icon: QUIDDITCH_ROLES[role]?.icon ?? '',
        side: Number(c.getFlag('hogwarts-system', 'quidditchSide')) || 0,
        actions: (QUIDDITCH_ROLES[role]?.actions ?? []).map((key) => ({
          key,
          label: game.i18n.localize(QUIDDITCH_ACTIONS[key]?.label ?? key),
        })),
      };
    });

    return {
      isGM: game.user.isGM,
      hasCombat: !!combat,
      started,
      active: match.active && started,
      finished: match.finished,
      round: combat?.round ?? 0,
      sides,
      squads,
      combatants,
      roles: Object.entries(QUIDDITCH_ROLES).map(([key, r]) => ({ key, label: game.i18n.localize(r.label) })),
      snitch: {
        onPitch: match.snitchOnPitch,
        chance: snitchChance(combat?.round ?? 0),
        spottedBy: match.snitchSpottedBy,
        spottedName: combatants.find((c) => c.id === match.snitchSpottedBy)?.name ?? '',
        distance: Number(match.snitchDistance) || 0,
      },
      fouls: QUIDDITCH_FOULS.map((key) => ({ key, label: game.i18n.localize(`HOGWARTS.Quidditch.Foul.${key}`) })),
      points: QUIDDITCH_POINTS,
    };
  }

  /**
   * Foundry only re-sorts an encounter when initiative changes, so switching a
   * role or opening a match leaves the previous order in place until something
   * else forces a rebuild.
   */
  static resort() {
    const combat = QuidditchApp.combat;
    if (!combat) return;
    combat.setupTurns();
    ui.combat?.render();
  }

  /** Re-render every open dashboard, so all clients follow the same match. */
  static refreshAll() {
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof QuidditchApp) app.render();
    }
  }

  /* ─── Match lifecycle ─────────────────────────────────────────────────── */

  static async _onStartMatch() {
    const combat = QuidditchApp.combat;
    if (!combat) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Quidditch.NoCombat'));
    await combat.setFlag('hogwarts-system', 'quidditch', foundry.utils.deepClone(BLANK_MATCH));
    if (!combat.started) await combat.startCombat();
    // Possession is decided by a coin toss (l. 29650).
    const toss = await new Roll('1d2').evaluate();
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.Title')}</h3></header>
        <div class="card-row">${game.i18n.format('HOGWARTS.Quidditch.CoinToss', { side: toss.total })}</div>
      </div>`,
      rolls: [toss],
    });
    QuidditchApp.resort();
    QuidditchApp.refreshAll();
  }

  static async _onEndMatch() {
    await QuidditchApp.setMatch({ active: false, finished: true });
    const m = QuidditchApp.match;
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.MatchOver')}</h3></header>
        <div class="card-row"><strong>${m.score[0]} — ${m.score[1]}</strong></div>
      </div>`,
    });
    // Leaving Quidditch mode changes the sort key back to initiative, and Foundry
    // only recomputes the turn order when an initiative actually changes.
    QuidditchApp.resort();
    QuidditchApp.refreshAll();
  }

  /** @this QuidditchApp */
  static async _onScore(event, target) {
    const side = Number(target.dataset.side);
    const kind = target.dataset.kind;
    const points = QUIDDITCH_POINTS[kind] ?? 0;
    const match = QuidditchApp.match;
    const score = [...match.score];
    score[side] = (Number(score[side]) || 0) + points;

    // Catching the snitch scores 150 and ends the match (l. 29525).
    const finished = kind === 'snitch';
    await QuidditchApp.setMatch({ score, finished, active: !finished });
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize(`HOGWARTS.Quidditch.Score.${kind}`)}</h3></header>
        <div class="card-row">+${points} → <strong>${score[0]} — ${score[1]}</strong></div>
        ${finished ? `<div class="card-row">${game.i18n.localize('HOGWARTS.Quidditch.MatchOver')}</div>` : ''}
      </div>`,
    });
    QuidditchApp.refreshAll();
  }

  /* ─── Line-up ─────────────────────────────────────────────────────────── */

  static async _onSetTeam(event, target) {
    await QuidditchApp._applySquad(Number(target.dataset.side), target.value);
  }

  /** Assign a saved squad to a side, importing each member's role. */
  static async _applySquad(side, squadId) {
    const match = QuidditchApp.match;
    const teams = [...match.teams];
    teams[side] = squadId;
    await QuidditchApp.setMatch({ teams });

    const squad = QuidditchApp.teams.find((t) => t.id === squadId);
    const combat = QuidditchApp.combat;
    if (!squad || !combat) return QuidditchApp.refreshAll();

    const updates = [];
    for (const member of squad.system.players) {
      const c = combat.combatants.find((x) => x.actorId === member.actorId);
      if (c) updates.push({ _id: c.id, 'flags.hogwarts-system.quidditchRole': member.role, 'flags.hogwarts-system.quidditchSide': side });
    }
    if (updates.length) await combat.updateEmbeddedDocuments('Combatant', updates);
    QuidditchApp.resort();
    QuidditchApp.refreshAll();
  }

  static async _onSetRole(event, target) {
    const combat = QuidditchApp.combat;
    const c = combat?.combatants.get(target.dataset.combatantId);
    if (!c) return;
    await c.setFlag('hogwarts-system', 'quidditchRole', target.value);
    QuidditchApp.resort();
    QuidditchApp.refreshAll();
  }

  static async _onSaveTeam() {
    const combat = QuidditchApp.combat;
    if (!combat) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Quidditch.NoCombat'));
    const side = Number(this.element.querySelector('select[name="saveSide"]')?.value) || 0;
    const name = this.element.querySelector('input[name="saveName"]')?.value?.trim();
    if (!name) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Quidditch.NoTeamName'));

    const players = combat.combatants
      .filter((c) => (Number(c.getFlag('hogwarts-system', 'quidditchSide')) || 0) === side && c.actorId)
      .map((c) => ({ actorId: c.actorId, role: c.getFlag('hogwarts-system', 'quidditchRole') ?? 'chaser' }));
    if (!players.length) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Quidditch.NoPlayers'));

    const existing = QuidditchApp.teams.find((t) => t.name === name);
    if (existing) await existing.update({ 'system.players': players });
    else await Actor.create({ name, type: 'quidditchTeam', system: { players } });

    ui.notifications.info(game.i18n.format('HOGWARTS.Quidditch.TeamSaved', { name, count: players.length }));
    QuidditchApp.refreshAll();
  }

  static async _onDeleteTeam(event, target) {
    const team = game.actors.get(target.dataset.teamId);
    if (!team) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('HOGWARTS.Quidditch.Team.Delete') },
      content: `<p>${game.i18n.format('HOGWARTS.Quidditch.Team.DeleteConfirm', { name: team.name })}</p>`,
    }).catch(() => false);
    if (!ok) return;
    await team.delete();
    QuidditchApp.refreshAll();
  }

  /* ─── Rolls ───────────────────────────────────────────────────────────── */

  /** Skill names the chapter assigns to the two kinds of flying (l. 29594). */
  static SKILLS = { quidditch: 'Acrobatie/Quidditch', broom: 'Vol en balai' };

  /**
   * Target number for an action: a skill percentage, or a characteristic times
   * the difficulty multiplier the chapter uses, x5 easy to x1 very hard (l. 29817).
   */
  static targetFor(actor, action) {
    const spec = QUIDDITCH_ACTIONS[action];
    if (!spec) return { target: 0, label: action };
    if (spec.multiplier) {
      const stat = Number(actor.system.stats?.[spec.roll]?.total ?? actor.system.stats?.[spec.roll]?.value) || 0;
      const short = game.i18n.localize(`HOGWARTS.Stat.${spec.roll.charAt(0).toUpperCase() + spec.roll.slice(1)}.abbr`);
      return { target: stat * spec.multiplier, label: `${short}×${spec.multiplier}` };
    }
    const name = QuidditchApp.SKILLS[spec.roll];
    const skill = actor.system.skills?.find((s) => s.name === name);
    return { target: Number(skill?.value) || 0, label: name };
  }

  /** @this QuidditchApp */
  static async _onRollAction(event, target) {
    const combat = QuidditchApp.combat;
    const c = combat?.combatants.get(target.dataset.combatantId);
    const actor = c?.actor;
    if (!actor) return;
    const action = target.dataset.actionKey;
    await QuidditchApp.rollFor(actor, c, action);
  }

  /**
   * Roll an action and publish its **margin**. The chapter compares margins,
   * not raw results: "il lance les dés et obtient 046 soit une différence de
   * 58-46 = 12" (l. 3066), and the winner is the highest margin (l. 29820).
   */
  static async rollFor(actor, combatant, action) {
    const spec = QUIDDITCH_ACTIONS[action];
    const { target, label } = QuidditchApp.targetFor(actor, action);
    const mod = await QuidditchApp._promptModifier(action);
    if (mod === null) return;

    const finalTarget = target + mod;
    const roll = new Roll('1d100');
    await roll.evaluate();
    const margin = finalTarget - roll.total;
    const success = roll.total <= finalTarget;

    const actionLabel = game.i18n.localize(spec?.label ?? action);
    const modText = mod ? ` ${mod >= 0 ? '+' : ''}${mod}` : '';
    const marginRow = spec?.opposed
      ? `<div class="card-row quidditch-margin" data-margin="${margin}" data-combatant-id="${combatant?.id ?? ''}">
           <strong>${game.i18n.localize('HOGWARTS.Quidditch.Margin')}:</strong> ${finalTarget} − ${roll.total} = <strong>${margin}</strong>
         </div>`
      : `<div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> ${roll.total} →
           ${game.i18n.localize(success ? 'HOGWARTS.Roll.Degree.Success' : 'HOGWARTS.Roll.Degree.Fail')}</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${actionLabel}</h3>
        <span class="card-type">${game.i18n.localize('HOGWARTS.Quidditch.Title')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${label} ${target}${modText}</div>
        ${marginRow}
        ${QuidditchApp._followUp(action, success, combatant)}
      </div>`,
      rolls: [roll],
      rollMode: game.settings.get('core', 'rollMode'),
    });

    await QuidditchApp._applyOutcome(action, success, combatant);
  }

  /** Extra line some actions add to their card. */
  static _followUp(action, success, combatant) {
    if (action === 'spotSnitch' && success) {
      return `<div class="card-row">${game.i18n.localize('HOGWARTS.Quidditch.Snitch.Spotted')}</div>`;
    }
    if (action === 'catchSnitch' && success) {
      const side = Number(combatant?.getFlag('hogwarts-system', 'quidditchSide')) || 0;
      return `<div class="card-buttons">
        <button data-action="quidditch-snitch-caught" data-side="${side}" data-kind="snitch">
          <i class="fas fa-trophy"></i> ${game.i18n.format('HOGWARTS.Quidditch.AwardSnitch', { points: QUIDDITCH_POINTS.snitch })}
        </button></div>`;
    }
    return '';
  }

  /** Side effects a successful action has on the match state. */
  static async _applyOutcome(action, success, combatant) {
    if (action === 'spotSnitch' && success) {
      await QuidditchApp.setMatch({ snitchSpottedBy: combatant?.id ?? '', snitchDistance: 30 });
      QuidditchApp.refreshAll();
    }
  }

  /** Difficulty is a per-situation call, so every action asks for a modifier. */
  static async _promptModifier(action) {
    return foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize(QUIDDITCH_ACTIONS[action]?.label ?? action) },
      content: `<div class="form-group">
          <label>${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}</label>
          <input type="number" name="mod" value="0" step="1" autofocus />
        </div>`,
      ok: {
        label: game.i18n.localize('HOGWARTS.Quidditch.Roll'),
        callback: (ev, btn) => Number(btn.form.elements.mod.value) || 0,
      },
    }).catch(() => null);
  }

  /* ─── Snitch ──────────────────────────────────────────────────────────── */

  static async _onRollSnitch() {
    const combat = QuidditchApp.combat;
    if (!combat) return;
    await combat.rollSnitchAppearance();
    QuidditchApp.refreshAll();
  }

  /** The seeker closes 5 m per round (l. 29805). */
  static async _onCloseDistance() {
    const match = QuidditchApp.match;
    const distance = Math.max(0, (Number(match.snitchDistance) || 0) - 5);
    await QuidditchApp.setMatch({ snitchDistance: distance });
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.Action.chaseSnitch')}</h3></header>
        <div class="card-row">${game.i18n.format('HOGWARTS.Quidditch.Snitch.Distance', { distance })}</div>
        ${distance === 0 ? `<div class="card-row">${game.i18n.localize('HOGWARTS.Quidditch.Snitch.InReach')}</div>` : ''}
      </div>`,
    });
    QuidditchApp.refreshAll();
  }

  /* ─── Bludger ─────────────────────────────────────────────────────────── */

  /**
   * A bludger deals 1 lethal plus 1d4−2 non-lethal, then the non-lethal total
   * is opposed to the victim's remaining hit points on the resistance table to
   * see whether they are knocked out for CON x 1 hours (l. 29778).
   */
  static async _onBludgerHit(event, target) {
    const combat = QuidditchApp.combat;
    const actor = combat?.combatants.get(target.dataset.combatantId)?.actor;
    if (!actor) return;

    const roll = new Roll('1d4-2');
    await roll.evaluate();
    const nonLethal = Math.max(0, roll.total);
    const remaining = Math.max(0, (Number(actor.system.health?.value) || 0) - nonLethal - 1);
    // Resistance table: 50 + (active − passive) × 5, capped to 1-99.
    const chance = Math.clamp(50 + (nonLethal - remaining) * 5, 1, 99);
    const ko = new Roll('1d100');
    await ko.evaluate();
    const knockedOut = ko.total <= chance || remaining <= 0;
    const con = Number(actor.system.stats?.con?.total ?? actor.system.stats?.con?.value) || 0;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.Bludger.Hit')}</h3>
        <span class="card-type">${game.i18n.localize('HOGWARTS.Quidditch.Title')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Quidditch.Bludger.Damage')}:</strong>
          1 ${game.i18n.localize('HOGWARTS.Quidditch.Bludger.Lethal')} + ${nonLethal} ${game.i18n.localize('HOGWARTS.Quidditch.Bludger.NonLethal')}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Quidditch.Bludger.Resistance')}:</strong>
          ${nonLethal} / ${remaining} → ${chance}% · ${ko.total} →
          ${game.i18n.localize(knockedOut ? 'HOGWARTS.Quidditch.Bludger.KnockedOut' : 'HOGWARTS.Quidditch.Bludger.Resisted')}</div>
        ${knockedOut ? `<div class="card-row">${game.i18n.format('HOGWARTS.Quidditch.Bludger.Unconscious', { hours: con })}</div>` : ''}
        <div class="card-buttons">
          <button data-action="apply-damage" data-value="1"><i class="fas fa-heart-broken"></i> 1</button>
          <button data-action="apply-nonlethal" data-value="${nonLethal}"><i class="fas fa-hand-fist"></i> ${nonLethal}</button>
        </div>
      </div>`,
      rolls: [roll, ko],
    });
  }

  /* ─── Fouls ───────────────────────────────────────────────────────────── */

  /** @this QuidditchApp */
  static async _onCallFoul(event, target) {
    const key = this.element.querySelector('select[name="foul"]')?.value;
    const side = Number(this.element.querySelector('select[name="foulSide"]')?.value) || 0;
    if (!key) return;
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.FoulCalled')}</h3></header>
        <div class="card-row"><strong>${game.i18n.localize(`HOGWARTS.Quidditch.Foul.${key}`)}</strong></div>
        <div class="card-row">${game.i18n.format('HOGWARTS.Quidditch.PenaltyFor', { side: side + 1 })}</div>
        <div class="card-row"><em>${game.i18n.localize('HOGWARTS.Quidditch.PenaltyRule')}</em></div>
      </div>`,
    });
  }

  /* ─── Opposition resolver ─────────────────────────────────────────────── */

  /**
   * Collect the margins published this round and let the Gamemaster pick the
   * opposing pair, plus any hindrance. The chapter's worked example subtracts a
   * hindrance from the acting player's margin: 40 − 10 − 28 = 2 (l. 29857).
   */
  static async _onOpenResolver() {
    const margins = [];
    for (const m of game.messages.contents.slice(-40)) {
      const el = document.createElement('div');
      el.innerHTML = m.content;
      const row = el.querySelector('.quidditch-margin');
      if (row) margins.push({ name: m.speaker?.alias ?? '?', margin: Number(row.dataset.margin) || 0 });
    }
    if (margins.length < 2) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Quidditch.NeedTwoMargins'));

    const options = margins.map((m, i) => `<option value="${i}">${m.name} (${m.margin})</option>`).join('');
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize('HOGWARTS.Quidditch.Resolver') },
      content: `
        <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Quidditch.Acting')}</label>
          <select name="a">${options}</select></div>
        <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Quidditch.Opposing')}</label>
          <select name="b">${options}</select></div>
        <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Quidditch.Hindrance')}</label>
          <input type="number" name="hindrance" value="0" min="0" step="1" /></div>`,
      ok: {
        callback: (ev, btn) => ({
          a: Number(btn.form.elements.a.value),
          b: Number(btn.form.elements.b.value),
          hindrance: Number(btn.form.elements.hindrance.value) || 0,
        }),
      },
    }).catch(() => null);
    if (!result || result.a === result.b) return;

    const A = margins[result.a];
    const B = margins[result.b];
    const total = A.margin - result.hindrance - B.margin;
    // A tie goes to whoever acts first in the initiative order (l. 29822).
    const winner = total >= 0 ? A.name : B.name;

    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Quidditch.Resolver')}</h3></header>
        <div class="card-row">${A.name} <strong>${A.margin}</strong>${result.hindrance ? ` − ${result.hindrance}` : ''} − ${B.name} <strong>${B.margin}</strong> = <strong>${total}</strong></div>
        <div class="card-row"><strong>${game.i18n.format('HOGWARTS.Quidditch.Winner', { name: winner })}</strong></div>
        ${total === 0 ? `<div class="card-row"><em>${game.i18n.localize('HOGWARTS.Quidditch.TieRule')}</em></div>` : ''}
      </div>`,
    });
  }
}
