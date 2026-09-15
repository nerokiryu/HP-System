/**
 * Wizard duel dashboard (ch. 27).
 *
 * The Combat document supplies the passes, the turn order and the initiative;
 * everything here is the duel layer the chapter adds on top: the agreed type
 * and modalities, the allowed-spell list, the priority ladder and the
 * disqualification conditions.
 */
import {
  DUEL_TYPES,
  DUEL_MODES,
  DUEL_MODALITIES,
  DUEL_STEPS,
  MAX_CLUB_YEARS,
  allowedSpells,
  duelPriority,
  duelTrainingBonus,
  initiateBonusPending,
  spellMalus,
} from '../helpers/duel.mjs';
import { marginRow, openOppositionResolver, rollMargin } from './opposition.mjs';
import { HOGWARTS } from '../helpers/config.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Blank duel state, stored on the Combat document so it follows the encounter. */
const BLANK_DUEL = {
  active: true,
  type: 'b',
  passes: 3,
  // The chapter lets the participants forbid each of these beforehand (§27.6).
  modalities: { unspoken: true, innate: false, wounding: false, extreme: false },
  finished: false,
};

export class DuelApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'hogwarts-duel',
    classes: ['hogwarts-system', 'duel'],
    position: { width: 640, height: 'auto' },
    window: { title: 'HOGWARTS.Duel.Title', icon: 'fas fa-wand-sparkles' },
    actions: {
      startDuel: DuelApp._onStartDuel,
      endDuel: DuelApp._onEndDuel,
      nextPass: DuelApp._onNextPass,
      setType: DuelApp._onSetType,
      setPasses: DuelApp._onSetPasses,
      toggleModality: DuelApp._onToggleModality,
      setRole: DuelApp._onSetRole,
      setSpell: DuelApp._onSetSpell,
      setMode: DuelApp._onSetMode,
      rollDuelInitiative: DuelApp._onRollInitiative,
      castDeclared: DuelApp._onCastDeclared,
      disqualify: DuelApp._onDisqualify,
      openResolver: DuelApp._onOpenResolver,
      toggleSpellList: DuelApp._onToggleSpellList,
    },
  };

  static PARTS = {
    body: { template: 'systems/hogwarts-system/templates/apps/duel.hbs', scrollable: [''] },
  };

  /** The three parts a participant can play (§27.1, l. 28525-28531). */
  static ROLES = {
    duellist: { label: 'HOGWARTS.Duel.Role.duellist', icon: 'fas fa-wand-magic' },
    second: { label: 'HOGWARTS.Duel.Role.second', icon: 'fas fa-user-shield' },
    referee: { label: 'HOGWARTS.Duel.Role.referee', icon: 'fas fa-gavel' },
  };

  /** Is the reference list of allowed spells unfolded? Client-side only. */
  #showSpells = false;

  /**
   * @override
   * ApplicationV2 fires `data-action` on click only, which on a `<select>`
   * means the handler runs when the list opens and carries the value the user
   * is about to replace. The dropdowns are bound to `change` by hand instead.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    for (const el of this.element.querySelectorAll('select[data-change]')) {
      el.addEventListener('change', (ev) => {
        const handler = DuelApp.DEFAULT_OPTIONS.actions[el.dataset.change];
        handler?.call(this, ev, el);
      });
    }
  }

  /**
   * The encounter currently doubling as a duel. The duel flag is stable while
   * `game.combat` goes transiently null during a tracker re-render.
   */
  static get combat() {
    return game.combats.find((c) => c.getFlag('hogwarts-system', 'duel.active')) ?? game.combat ?? null;
  }

  static get duel() {
    const stored = DuelApp.combat?.getFlag('hogwarts-system', 'duel');
    return foundry.utils.mergeObject(foundry.utils.deepClone(BLANK_DUEL), stored ?? {}, { inplace: false });
  }

  static async setDuel(changes) {
    const combat = DuelApp.combat;
    if (!combat) return;
    await combat.setFlag('hogwarts-system', 'duel', foundry.utils.mergeObject(DuelApp.duel, changes, { inplace: false }));
  }

  /**
   * Spells a given participant may declare: legal in the agreed duel type, and
   * not barred by an agreed modality.
   */
  static spellChoices(duel) {
    return allowedSpells(duel.type).filter((s) => {
      if (s.unspokenOnly && !duel.modalities.unspoken) return false;
      return true;
    });
  }

  /** @override */
  async _prepareContext() {
    const combat = DuelApp.combat;
    const duel = DuelApp.duel;
    const started = !!combat?.started;
    const spells = DuelApp.spellChoices(duel);

    const participants = (combat?.combatants ?? []).map((c) => {
      const role = c.getFlag('hogwarts-system', 'duelRole') ?? 'duellist';
      const declared = c.getFlag('hogwarts-system', 'duelDeclaration') ?? {};
      const spell = spells.find((s) => s.name === declared.spell) ?? null;
      const mode = DUEL_MODES[declared.mode] ? declared.mode : 'classic';
      const actor = c.actor;
      return {
        id: c.id,
        name: c.name,
        img: c.img,
        initiativeDisplay: typeof c.initiative === 'number' ? String(c.initiative) : '—',
        role,
        roleLabel: game.i18n.localize(DuelApp.ROLES[role]?.label ?? role),
        icon: DuelApp.ROLES[role]?.icon ?? '',
        isDuellist: role === 'duellist',
        disqualified: !!c.getFlag('hogwarts-system', 'duelDisqualified'),
        spell: declared.spell ?? '',
        spellWarns: !!spell?.warn?.includes(duel.type),
        spellUnlinked: !!spell?.unlinked,
        mode,
        priority: duelPriority(spell, mode).priority,
        training: duelTrainingBonus({
          clubYears: actor?.system?.duelClubYears,
          initiate: DuelApp.pendingInitiateBonus(actor),
        }),
      };
    });

    return {
      isGM: game.user.isGM,
      hasCombat: !!combat,
      started,
      active: duel.active && started,
      finished: duel.finished,
      pass: combat?.round ?? 0,
      passes: duel.passes,
      type: duel.type,
      typeLabel: game.i18n.localize(DUEL_TYPES[duel.type]?.label ?? duel.type),
      damageDisqualifies: !!DUEL_TYPES[duel.type]?.damageDisqualifies,
      types: Object.entries(DUEL_TYPES).map(([key, t]) => ({ key, label: game.i18n.localize(t.label) })),
      roles: Object.entries(DuelApp.ROLES).map(([key, r]) => ({ key, label: game.i18n.localize(r.label) })),
      modalities: DUEL_MODALITIES.map((key) => ({
        key,
        label: game.i18n.localize(`HOGWARTS.Duel.Modality.${key}`),
        allowed: !!duel.modalities[key],
      })),
      modes: Object.entries(DUEL_MODES).map(([key, m]) => ({
        key,
        label: game.i18n.localize(m.label),
        initiative: m.initiative,
      })),
      steps: DUEL_STEPS.map((key) => game.i18n.localize(`HOGWARTS.Duel.Step.${key}`)),
      participants,
      spells: spells.map((s) => ({
        name: s.name,
        level: s.level === 6 ? '5+' : String(s.level),
        priority: s.priority,
        warns: !!s.warn?.includes(duel.type),
        unlinked: !!s.unlinked,
        unforgivable: !!s.unforgivable,
      })),
      showSpells: this.#showSpells,
      maxClubYears: MAX_CLUB_YEARS,
    };
  }

  /**
   * The *Initié au duel* advantage is worth +2 initiative (l. 4070), but it
   * ships as a **conditional** active effect on `system.initiativeBonus`. When
   * the player has switched that effect on, the +2 is already inside
   * `initiativeBonus`; adding it again here would count it twice. The duel is
   * precisely the situation the book restricts it to, so it is applied here
   * only while the effect is off.
   */
  static pendingInitiateBonus(actor) {
    return initiateBonusPending({
      owns: !!actor?.items?.some((i) => i.type === 'feature' && i.name === 'Initié au duel'),
      effectApplied: [...(actor?.appliedEffects ?? [])].some((e) => e.name === 'Initié au duel'),
    });
  }

  /** Foundry only re-sorts an encounter when an initiative changes. */
  static resort() {
    const combat = DuelApp.combat;
    if (!combat) return;
    combat.setupTurns();
    ui.combat?.render();
  }

  static refreshAll() {
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof DuelApp) app.render();
    }
  }

  /* ─── Duel lifecycle ──────────────────────────────────────────────────── */

  static async _onStartDuel() {
    const combat = DuelApp.combat;
    if (!combat) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Duel.NoCombat'));
    await combat.setFlag('hogwarts-system', 'duel', foundry.utils.deepClone(BLANK_DUEL));
    if (!combat.started) await combat.startCombat();
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Duel.Title')}</h3></header>
        <div class="card-row">${game.i18n.localize(DUEL_TYPES[DuelApp.duel.type].label)}</div>
        <div class="card-row"><em>${game.i18n.localize('HOGWARTS.Duel.Bow')}</em></div>
      </div>`,
    });
    DuelApp.resort();
    DuelApp.refreshAll();
  }

  static async _onEndDuel() {
    await DuelApp.setDuel({ active: false, finished: true });
    await ChatMessage.create({
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Duel.Over')}</h3></header>
      </div>`,
    });
    // Leaving duel mode restores the chapter 2 phase ordering.
    DuelApp.resort();
    DuelApp.refreshAll();
  }

  /** A pass is a combat round; the declarations are cleared for the next one. */
  static async _onNextPass() {
    const combat = DuelApp.combat;
    if (!combat) return;
    const updates = combat.combatants.map((c) => ({
      _id: c.id,
      'flags.hogwarts-system.duelDeclaration': { spell: '', mode: 'classic' },
      'flags.hogwarts-system.duelPriority': DUEL_MODES.classic.priority,
    }));
    if (updates.length) await combat.updateEmbeddedDocuments('Combatant', updates);
    await combat.nextRound();
    DuelApp.refreshAll();
  }

  /* ─── Agreed rules ────────────────────────────────────────────────────── */

  static async _onSetType(event, target) {
    await DuelApp.setDuel({ type: target.value });
    DuelApp.refreshAll();
  }

  /** @this DuelApp */
  static async _onSetPasses(event, target) {
    const input = target.closest('.duel-passes')?.querySelector('input[name="passes"]');
    await DuelApp.setDuel({ passes: Math.max(1, Math.min(10, Number(input?.value) || 1)) });
    DuelApp.refreshAll();
  }

  static async _onToggleModality(event, target) {
    const key = target.dataset.modality;
    const duel = DuelApp.duel;
    await DuelApp.setDuel({ modalities: { ...duel.modalities, [key]: !duel.modalities[key] } });
    DuelApp.refreshAll();
  }

  static async _onToggleSpellList() {
    this.#showSpells = !this.#showSpells;
    this.render();
  }

  /* ─── Participants ────────────────────────────────────────────────────── */

  static async _onSetRole(event, target) {
    const c = DuelApp.combat?.combatants.get(target.dataset.combatantId);
    if (!c) return;
    await c.setFlag('hogwarts-system', 'duelRole', target.value);
    DuelApp.refreshAll();
  }

  static async _onSetSpell(event, target) {
    await DuelApp._declare(target.dataset.combatantId, { spell: target.value });
  }

  static async _onSetMode(event, target) {
    await DuelApp._declare(target.dataset.combatantId, { mode: target.value });
  }

  /**
   * Record a declaration and the initiative rank it buys. The rank is stored on
   * the combatant because the tracker sorts on it without going through here.
   */
  static async _declare(combatantId, changes) {
    const combat = DuelApp.combat;
    const c = combat?.combatants.get(combatantId);
    if (!c) return;
    const duel = DuelApp.duel;
    const declared = { spell: '', mode: 'classic', ...(c.getFlag('hogwarts-system', 'duelDeclaration') ?? {}), ...changes };
    const spell = DuelApp.spellChoices(duel).find((s) => s.name === declared.spell) ?? null;

    // A spell the table marks unspoken-only cannot be declared any other way.
    if (spell?.unspokenOnly) declared.mode = 'unspoken';

    const { priority } = duelPriority(spell, declared.mode);
    await c.update({
      'flags.hogwarts-system.duelDeclaration': declared,
      'flags.hogwarts-system.duelPriority': priority,
    });
    DuelApp.resort();
    DuelApp.refreshAll();
  }

  /* ─── Initiative ──────────────────────────────────────────────────────── */

  /**
   * Duel initiative: `1d6 + DEX` as in combat, plus the declared mode's
   * modifier and the duelling practice bonus (§27.3, l. 28610 and l. 28577).
   * A Fougue point may be spent to reroll the d6 with a further +2 (l. 28683).
   */
  static async _onRollInitiative(event, target) {
    const combat = DuelApp.combat;
    const c = combat?.combatants.get(target.dataset.combatantId);
    const actor = c?.actor;
    if (!c || !actor) return;

    const declared = c.getFlag('hogwarts-system', 'duelDeclaration') ?? {};
    const mode = DUEL_MODES[declared.mode] ?? DUEL_MODES.classic;
    const dex = Number(actor.system.stats?.dex?.total ?? actor.system.stats?.dex?.value) || 0;
    const base = Number(actor.system.initiativeBonus) || 0;
    const training = duelTrainingBonus({
      clubYears: actor.system.duelClubYears,
      initiate: DuelApp.pendingInitiateBonus(actor),
    });

    const fougue = Number(actor.system.fougue?.value) || 0;
    const useFougue = fougue > 0 && await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('HOGWARTS.Duel.FougueTitle') },
      content: `<p>${game.i18n.localize('HOGWARTS.Duel.FouguePrompt')}</p>`,
      rejectClose: false,
      modal: true,
    }).catch(() => false);

    const roll = new Roll('1d6');
    await roll.evaluate();
    let die = Number(roll.total) || 0;
    let second = null;
    if (useFougue) {
      second = new Roll('1d6');
      await second.evaluate();
      // The point is spent on the reroll itself: the new die stands, +2.
      die = (Number(second.total) || 0) + 2;
      await actor.update({ 'system.fougue.value': Math.max(0, fougue - 1) });
    }

    const total = die + dex + base + training + mode.initiative;
    await combat.setInitiative(c.id, total);

    const parts = [`${die}`, `${game.i18n.localize('HOGWARTS.Stat.Dex.abbr')} ${dex}`];
    if (base) parts.push(`${game.i18n.localize('HOGWARTS.Chat.InitiativeBonus')} ${base >= 0 ? '+' : ''}${base}`);
    if (training) parts.push(`${game.i18n.localize('HOGWARTS.Duel.Training')} +${training}`);
    if (mode.initiative) parts.push(`${game.i18n.localize(mode.label)} ${mode.initiative >= 0 ? '+' : ''}${mode.initiative}`);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Duel.Initiative')}</h3>
        <span class="card-type">${game.i18n.localize('HOGWARTS.Duel.Title')}</span></header>
        <div class="card-row">${parts.join(' + ')} = <strong>${total}</strong></div>
        ${useFougue ? `<div class="card-row"><em>${game.i18n.localize('HOGWARTS.Duel.FougueSpent')}</em></div>` : ''}
      </div>`,
      rolls: second ? [roll, second] : [roll],
    });
    DuelApp.resort();
    DuelApp.refreshAll();
  }

  /* ─── Casting ─────────────────────────────────────────────────────────── */

  /**
   * Target number for the declared spell: the school skill the spell type is
   * rolled under, plus the spell's own malus, minus stress — and minus the 30 %
   * an unspoken casting costs (l. 23224). Returns a null target when the caster
   * does not own the spell.
   */
  static castTarget(actor, spellName, mode) {
    const item = actor.items.find((i) => i.type === 'spell' && i.name === spellName);
    if (!item) return { target: null, label: spellName, parts: [], noExtreme: false };

    const skillName = HOGWARTS.spellSkills[item.system.spellType || 'X'] ?? null;
    const skill = skillName ? actor.system.skills?.find((s) => s.name === skillName) : null;
    const base = Number(skill?.value) || 0;

    const { malus, noExtreme } = spellMalus(item.system, mode);
    const stress = Number(actor.system.stress?.value) || 0;
    const unspoken = mode === 'unspoken' ? 30 : 0;

    const parts = [`${skillName ?? '—'} ${base}`];
    if (malus) parts.push(`${malus}`);
    if (stress) parts.push(`−${stress}`);
    if (unspoken) parts.push(`−${unspoken}`);

    return { target: base + malus - stress - unspoken, label: skillName ?? spellName, parts, noExtreme };
  }

  /**
   * Cast the declared spell — « chaque participant lance les dés pour son
   * sortilège (dans la compétence associée) » (l. 28677). An innate casting
   * needs no roll at all; it only rolls when an opposition is involved, and a
   * failed roll then counts as a success with a margin of 0 (l. 23197).
   */
  static async _onCastDeclared(event, target) {
    const c = DuelApp.combat?.combatants.get(target.dataset.combatantId);
    const actor = c?.actor;
    if (!actor) return;
    const declared = c.getFlag('hogwarts-system', 'duelDeclaration') ?? {};
    if (!declared.spell) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Duel.NoDeclaration'));

    const mode = DUEL_MODES[declared.mode] ? declared.mode : 'classic';
    const computed = DuelApp.castTarget(actor, declared.spell, mode);

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: declared.spell },
      content: `
        ${computed.target === null ? `<p class="notification warning">${game.i18n.localize('HOGWARTS.Duel.SpellNotOwned')}</p>` : ''}
        ${computed.noExtreme ? `<p class="notification warning">${game.i18n.localize('HOGWARTS.Duel.NoExtremeFormula')}</p>` : ''}
        <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Chat.Target')}</label>
          <input type="number" name="target" value="${computed.target ?? 0}" step="1" autofocus /></div>
        <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Roll.ModifierLabel')}</label>
          <input type="number" name="mod" value="0" step="1" /></div>`,
      ok: {
        callback: (ev, btn) => (Number(btn.form.elements.target.value) || 0)
          + (Number(btn.form.elements.mod.value) || 0),
      },
      rejectClose: false,
      modal: true,
    }).catch(() => null);
    if (result === null) return;

    const { roll, margin, success } = await rollMargin(result);
    // An innate spell always lands; a failed roll is a success with margin 0.
    const innate = mode === 'innate';
    const finalMargin = innate ? Math.max(0, margin) : margin;
    const landed = innate || success;

    const duel = DuelApp.duel;
    const spell = DuelApp.spellChoices(duel).find((s) => s.name === declared.spell);
    const warn = spell?.warn?.includes(duel.type);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="hogwarts-chat-card">
        <header class="card-header"><h3>${declared.spell}</h3>
        <span class="card-type">${game.i18n.localize('HOGWARTS.Duel.Title')}</span></header>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Target')}:</strong> ${result}
          ${computed.parts.length ? `<em>(${computed.parts.join(' ')})</em>` : ''} ·
          ${game.i18n.localize(DUEL_MODES[mode].label)}</div>
        <div class="card-row"><strong>${game.i18n.localize('HOGWARTS.Chat.Roll')}:</strong> ${roll.total} →
          ${game.i18n.localize(landed ? 'HOGWARTS.Roll.Degree.Success' : 'HOGWARTS.Roll.Degree.Fail')}</div>
        ${marginRow(finalMargin, { combatantId: c.id })}
        ${warn ? `<div class="card-row duel-warning">${game.i18n.localize('HOGWARTS.Duel.WarnStar')}</div>` : ''}
      </div>`,
      rolls: [roll],
    });
    DuelApp.refreshAll();
  }

  /**
   * « 1 point de dégât = disqualification » in the two non-wounding duel types
   * (§27.4, l. 28616). The call stays manual: only the Gamemaster knows whether
   * the damage came from the spell or from the fall that followed it.
   */
  static async _onDisqualify(event, target) {
    const c = DuelApp.combat?.combatants.get(target.dataset.combatantId);
    if (!c) return;
    const now = !c.getFlag('hogwarts-system', 'duelDisqualified');
    await c.setFlag('hogwarts-system', 'duelDisqualified', now);
    if (now) {
      await ChatMessage.create({
        content: `<div class="hogwarts-chat-card">
          <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Duel.Disqualified')}</h3></header>
          <div class="card-row"><strong>${c.name}</strong></div>
        </div>`,
      });
    }
    DuelApp.refreshAll();
  }

  static async _onOpenResolver() {
    return openOppositionResolver();
  }
}
