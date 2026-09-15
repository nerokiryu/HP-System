/**
 * Shared plumbing for the opposed skill roll of §28.3.4, which the rulebook
 * uses well beyond Quidditch — the chapter 2 combat examples resolve a dodge
 * (l. 3067) and a brawl (l. 3081) exactly the same way.
 *
 * Each contender publishes the **margin** of their roll in a chat card; the
 * Gamemaster then picks the pair to compare.
 */
import { marginOf, resolveOpposed } from '../helpers/opposition.mjs';

/** Chat row carrying a margin, and the data hook the resolver reads back. */
export function marginRow(margin, { combatantId = '', label = '' } = {}) {
  const title = label || game.i18n.localize('HOGWARTS.Opposition.Margin');
  return `<div class="card-row hogwarts-margin" data-margin="${margin}" data-combatant-id="${combatantId}">
    <strong>${title}:</strong> <strong>${margin}</strong>
  </div>`;
}

/** Recent margins published to chat, newest last. */
export function collectMargins(limit = 40) {
  const found = [];
  for (const m of game.messages.contents.slice(-limit)) {
    const el = document.createElement('div');
    el.innerHTML = m.content;
    const row = el.querySelector('.hogwarts-margin');
    if (row) found.push({ name: m.speaker?.alias ?? '?', margin: Number(row.dataset.margin) || 0 });
  }
  return found;
}

/**
 * Roll a percentile target and publish its margin.
 * @returns {Promise<{roll: Roll, margin: number, success: boolean}>}
 */
export async function rollMargin(target) {
  const roll = new Roll('1d100');
  await roll.evaluate();
  const total = Number(roll.total) || 0;
  return { roll, margin: marginOf(target, total), success: total <= target };
}

/**
 * Ask which two published margins to compare, then post the verdict.
 * The acting side may carry a hindrance, as in « 40-10-28 = 2 » (l. 29857).
 */
export async function openOppositionResolver() {
  const margins = collectMargins();
  if (margins.length < 2) {
    return ui.notifications.warn(game.i18n.localize('HOGWARTS.Opposition.NeedTwoMargins'));
  }

  const options = margins.map((m, i) => `<option value="${i}">${m.name} (${m.margin})</option>`).join('');
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('HOGWARTS.Opposition.Resolver') },
    content: `
      <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Opposition.Acting')}</label>
        <select name="a">${options}</select></div>
      <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Opposition.Opposing')}</label>
        <select name="b">${options}</select></div>
      <div class="form-group"><label>${game.i18n.localize('HOGWARTS.Opposition.Hindrance')}</label>
        <input type="number" name="hindrance" value="0" min="0" step="1" /></div>`,
    ok: {
      callback: (ev, btn) => ({
        a: Number(btn.form.elements.a.value),
        b: Number(btn.form.elements.b.value),
        hindrance: Number(btn.form.elements.hindrance.value) || 0,
      }),
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (!result || result.a === result.b) return;

  const A = margins[result.a];
  const B = margins[result.b];
  const { total, actingWins, tie } = resolveOpposed(A.margin, B.margin, result.hindrance);

  await ChatMessage.create({
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Opposition.Resolver')}</h3></header>
      <div class="card-row">${A.name} <strong>${A.margin}</strong>${result.hindrance ? ` − ${result.hindrance}` : ''} − ${B.name} <strong>${B.margin}</strong> = <strong>${total}</strong></div>
      <div class="card-row"><strong>${game.i18n.format('HOGWARTS.Opposition.Winner', { name: actingWins ? A.name : B.name })}</strong></div>
      ${tie ? `<div class="card-row"><em>${game.i18n.localize('HOGWARTS.Opposition.TieRule')}</em></div>` : ''}
    </div>`,
  });
}
