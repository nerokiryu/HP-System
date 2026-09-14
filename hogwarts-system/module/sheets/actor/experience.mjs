/**
 * Expérience : résolution des jets de gain, bilans de trimestre, de fin d'année
 * et de vacances, dépense de la réserve et récupération au repos.
 */

/**
 * Weekly hit point recovery (Chap. 1.11): 1d3 alone, 1d6 resting in bed,
 * 2d3 in a hospital. Chocolate doubles the result and adds +1 to the die.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onRestRecovery(event, target) {
  event.preventDefault();
  const L = (k) => game.i18n.localize(`HOGWARTS.Recovery.${k}`);
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: L('Title') },
    content: `
      <div class="form-group">
        <label>${L('Mode')}</label>
        <select name="mode">
          <option value="1d3">${L('Alone')} (1d3)</option>
          <option value="1d6">${L('BedRest')} (1d6)</option>
          <option value="2d3">${L('Hospital')} (2d3)</option>
        </select>
      </div>
      <div class="form-group">
        <label><input type="checkbox" name="chocolate" /> ${L('Chocolate')}</label>
      </div>`,
    ok: {
      label: L('Roll'),
      callback: (ev, button) => ({
        mode: button.form.elements.mode.value,
        chocolate: button.form.elements.chocolate.checked,
      }),
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (!choice) return;

  const roll = new Roll(choice.mode);
  await roll.evaluate();
  const base = Number(roll.total) || 0;
  const healed = choice.chocolate ? (base + 1) * 2 : base;

  const hp = this.actor.system.health ?? {};
  const before = Number(hp.value) || 0;
  const max = Number(hp.max) || before;
  const after = Math.min(max, before + healed);

  await this.actor.update({
    'system.health.value': after,
    // A week of rest clears accumulated non-lethal damage (Chap. 1.10.1).
    'system.healthNonLethal.value': 0,
    'system.conditions.staggered': false,
  });

  let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${this.actor.name}</h3><span class="card-type">${L('Title')}</span></header>`;
  content += `<div class="card-row">${choice.mode} → <span class="roll-value">${base}</span>${choice.chocolate ? ` ${L('ChocolateApplied')} → <strong>${healed}</strong>` : ''}</div>`;
  content += `<div class="card-row"><strong>${L('Result')}:</strong> ${before} → ${after} / ${max}</div>`;
  if (after === max && before + healed > max) content += `<div class="card-row">${L('CappedAtMax')}</div>`;
  content += '</div>';

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: [roll],
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * XP Resolution: for each skill with xpCheck=true, roll d100 > current value.
 * If the roll exceeds the current skill value, the skill increases.
 * @this HogwartsActorSheet
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function onResolveXP(event, target) {
  event.preventDefault();
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  const results = [];
  // Collect every Roll so they can be attached to the chat message. This
  // turns the card into a proper roll message (Dice So Nice animation) and
  // lets the dice breakdown be revealed on hover.
  const allRolls = [];
  let updated = false;

  // Collect XP modifiers from active (non-disabled) effects.
  // Supported key patterns (Foundry AE engine ignores unknown paths; we read them manually):
  //   xp.multiplier                       → multiplies XP gain for ALL skills
  //   xp.multiplier.{category}            → multiplies XP gain for a specific category
  //   xp.multiplier.skill.{name}          → multiplies XP gain for a specific skill (case-insensitive)
  //   xp.bonus                            → flat bonus added to XP gain for ALL skills
  //   xp.bonus.{category}                 → flat bonus for a specific category
  //   xp.bonus.skill.{name}               → flat bonus for a specific skill (case-insensitive)
  // Use `appliedEffects` (not `effects`) so that effects transferred from
  // owned items (features, gear, …) are included, and so that disabled or
  // suppressed effects are automatically excluded. Reading `actor.effects`
  // would only see effects placed directly on the actor and would silently
  // drop any XP modifier coming from an item.
  const xpEffects = [];
  for (const effect of (this.actor.appliedEffects ?? [])) {
    for (const change of (effect.changes ?? [])) {
      if (change.key?.startsWith('xp.')) {
        xpEffects.push({ key: change.key, value: Number(change.value) || 0, label: effect.name });
      }
    }
  }

  // Compute effective multiplier + bonus for a given skill entry.
  const getXPMods = (skill) => {
    let multiplier = 1;
    let bonus = 0;
    const lname = (skill.name ?? '').toLowerCase();
    for (const fx of xpEffects) {
      const parts = fx.key.split('.');
      const isMultiplier = parts[1] === 'multiplier';
      const isBonus = parts[1] === 'bonus';
      if (!isMultiplier && !isBonus) continue;
      let matches = false;
      if (parts.length === 2) {
        matches = true; // global
      } else if (parts[2] === 'skill') {
        matches = parts.slice(3).join('.').toLowerCase() === lname;
      } else {
        matches = skill.category === parts[2];
      }
      if (!matches) continue;
      if (isMultiplier) multiplier *= fx.value;
      else bonus += fx.value;
    }
    // Some ancestries make experience in a skill a third higher (§17.2).
    if (skill.hybridXp) multiplier *= 4 / 3;
    return { multiplier, bonus };
  };

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    if (!s.xpCheck) continue;

    const roll = new Roll('1d100');
    await roll.evaluate();
    allRolls.push(roll);
    const r = Number(roll.total) || 0;
    const currentValue = Number(s.value) || 0;

    // From 90% on, the chance to improve is INT itself and the gain is +1
    // whatever happens (l. 6836-6837).
    const mastered = currentValue >= 90;
    const intScore = Number(this.actor.system.stats?.int?.total ?? this.actor.system.stats?.int?.value) || 0;
    const improved = mastered ? r <= intScore : r > currentValue;

    if (improved) {
      let increase = 1;
      let rawIncrease = null;
      let multiplier = 1;
      let bonus = 0;

      if (!mastered) {
        const increaseRoll = new Roll('1d6');
        await increaseRoll.evaluate();
        allRolls.push(increaseRoll);
        rawIncrease = Number(increaseRoll.total) || 1;
        ({ multiplier, bonus } = getXPMods(s));
        // The canonical +1 (l. 6834) sits outside the homebrew multiplier.
        increase = Math.max(1, Math.ceil(rawIncrease * multiplier) + 1 + bonus);
      }

      s.spent = (Number(s.spent) || 0) + increase;
      s.xpCheck = false;
      updated = true;
      results.push({
        name: s.name,
        spec: s.spec,
        roll: r,
        d6: rawIncrease,
        current: currentValue,
        target: mastered ? intScore : currentValue,
        mastered,
        increase,
        rawIncrease: mastered ? null : rawIncrease,
        multiplier: multiplier !== 1 ? multiplier : null,
        bonus: bonus !== 0 ? bonus : null,
        success: true,
      });
    } else {
      s.xpCheck = false;
      updated = true;
      results.push({
        name: s.name,
        spec: s.spec,
        roll: r,
        d6: null,
        current: currentValue,
        target: mastered ? intScore : currentValue,
        mastered,
        increase: 0,
        success: false,
      });
    }
  }

  if (!updated) {
    ui?.notifications?.info?.(game.i18n.localize('HOGWARTS.Roll.XP.NoChecks'));
    return;
  }

  // Update the actor with cleared xpCheck flags and any increases
  await this.actor.update({ 'system.skills': skills });

  // Build a chat card with the results
  const rolledLabel = game.i18n.localize('HOGWARTS.Roll.XP.Rolled');
  let content = `<div class="hogwarts-chat-card"><header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Roll.XP.Title')}</h3><span class="card-type">XP</span></header>`;
  for (const res of results) {
    const nameDisplay = res.spec ? `${res.name} (${res.spec})` : res.name;
    // Hover tooltip exposing the exact dice that were rolled for this skill.
    const tip = res.success
      ? `1d100 → ${res.roll}<br>1d6 → ${res.d6}`
      : `1d100 → ${res.roll}`;
    const rollValue = `<span class="roll-value" data-tooltip="${tip}">${res.roll}</span>`;
    const rule = res.mastered ? ` <em class="xp-mod">(≥ 90 % → INT)</em>` : '';
    if (res.success) {
      let modDisplay = '';
      if (res.rawIncrease !== null) {
        const parts = [`1d6=${res.rawIncrease}`];
        if (res.multiplier !== null) parts.push(`×${res.multiplier}`);
        parts.push('+1');
        if (res.bonus !== null) parts.push(`${res.bonus >= 0 ? '+' : ''}${res.bonus}`);
        modDisplay = ` <em class="xp-mod">(${parts.join(' ')})</em>`;
      }
      const comparison = res.mastered ? `≤ ${res.target}` : `> ${res.current}`;
      content += `<div class="card-row xp-success">✓ ${nameDisplay}: ${rolledLabel} ${rollValue} ${comparison} → +${res.increase}${modDisplay}${rule}</div>`;
    } else {
      const comparison = res.mastered ? `> ${res.target}` : `≤ ${res.current}`;
      content += `<div class="card-row xp-fail">✗ ${nameDisplay}: ${rolledLabel} ${rollValue} ${comparison}${rule}</div>`;
    }
  }
  content += `</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content,
    rolls: allRolls,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Credit one school event: the very first week, then each of the three terms
 * (§7.3 l. 6841-6850, §25.1 l. 28185-28196). The counter resets on its own
 * when the pupil moves up a year, so a term can never be granted twice.
 * @this HogwartsActorSheet
 */
export async function onSchoolTermXP(event, target) {
  event.preventDefault();
  const year = Number(this.actor.system.profile?.year) || 1;
  const progress = this.actor.system.experience?.school ?? {};
  const periods = progress.year === year ? Number(progress.periods) || 0 : 0;
  const mode = game.settings.get('hogwarts-system', 'schoolXpMode') ?? 'flat';

  const firstWeekPending = year === 1 && !progress.firstWeek;
  if (!firstWeekPending && periods >= 3) {
    return ui.notifications.warn(game.i18n.localize('HOGWARTS.Roll.XP.AllTermsDone'));
  }

  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  const cursus = skills.filter((s) => s.category === 'school' && !s.unavailable);
  if (!cursus.length) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Roll.XP.NoSchoolSkills'));

  // §7.3 makes the first week a flat +10%; §25.1 rolls for it like any term.
  const flatBonus = firstWeekPending && mode === 'tapered' ? CONFIG.HOGWARTS.schoolFirstWeek.tapered : null;
  const formula = mode === 'tapered'
    ? CONFIG.HOGWARTS.schoolXpTapered[Math.min(year, 7) - 1]
    : CONFIG.HOGWARTS.schoolXpFlat;

  const rolls = [];
  const lines = [];
  for (const skill of cursus) {
    let gain = flatBonus;
    if (gain === null) {
      const roll = new Roll(formula);
      await roll.evaluate();
      rolls.push(roll);
      gain = Number(roll.total) || 0;
    }
    const headroom = Math.max(0, (Number(skill.max) || 0) - (Number(skill.base) || 0) - (Number(skill.spent) || 0));
    const applied = Math.min(gain, headroom);
    skill.spent = (Number(skill.spent) || 0) + applied;
    lines.push(`<div class="card-row">${skill.name}: +${applied}${applied < gain ? ` <em class="xp-mod">(${gain}, plafonné)</em>` : ''}</div>`);
  }

  await this.actor.update({
    'system.skills': skills,
    'system.experience.school.year': year,
    'system.experience.school.periods': firstWeekPending ? periods : periods + 1,
    'system.experience.school.firstWeek': progress.firstWeek || firstWeekPending,
  });

  const heading = firstWeekPending
    ? game.i18n.localize('HOGWARTS.Roll.XP.FirstWeek')
    : game.i18n.format('HOGWARTS.Roll.XP.Term', { n: periods + 1 });
  const detail = flatBonus !== null ? `+${flatBonus}%` : formula;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${heading}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.XP.School')}</span></header>
      <div class="card-row"><em>${detail}</em></div>${lines.join('')}</div>`,
    rolls,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}

/**
 * Total the end-of-year rewards into the pool the player will spread later
 * (§25.2, l. 28293-28300).
 * @this HogwartsActorSheet
 */
export async function onYearEndXP(event, target) {
  event.preventDefault();
  const year = Number(this.actor.system.profile?.year) || 1;
  const rows = CONFIG.HOGWARTS.yearEndRewards.map((r) => {
    const label = game.i18n.localize(`HOGWARTS.Roll.XP.Reward.${r.key}`);
    // A signed reward spans ±year, so it needs a field rather than a checkbox.
    const fixed = r.perYear !== undefined && r.min === undefined && !r.signed
      ? year * r.perYear + (r.flat ?? 0)
      : null;
    const min = r.signed ? -year : (r.min ?? 0);
    const max = r.signed ? year : (r.max ?? 0);
    return { key: r.key, label, fixed, min, max };
  });

  const html = rows.map((r) => r.fixed !== null
    ? `<div class="form-group"><label>${r.label}</label>
         <input type="checkbox" name="${r.key}" checked /> <span>+${r.fixed}%</span></div>`
    : `<div class="form-group"><label>${r.label}</label>
         <input type="number" name="${r.key}" value="0" min="${r.min}" max="${r.max}" step="1" />
         <span class="hint">${r.min}…${r.max}</span></div>`).join('');

  const total = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize('HOGWARTS.Roll.XP.YearEnd') },
    content: `<div class="year-end-form">${html}</div>`,
    ok: {
      label: game.i18n.localize('OK'),
      callback: (ev, button) => rows.reduce((sum, r) => {
        const field = button.form.elements[r.key];
        if (r.fixed !== null) return sum + (field?.checked ? r.fixed : 0);
        const v = Number(field?.value) || 0;
        return sum + Math.min(r.max, Math.max(r.min, v));
      }, 0),
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (total === null) return;

  await this._creditPool(Math.max(0, total), game.i18n.localize('HOGWARTS.Roll.XP.YearEnd'));
}

/**
 * Holiday gain for a pupil who goes home rather than playing (l. 28202).
 * @this HogwartsActorSheet
 */
export async function onHolidayXP(event, target) {
  event.preventDefault();
  const roll = new Roll(CONFIG.HOGWARTS.holidayXpFormula);
  await roll.evaluate();
  await this._creditPool(Number(roll.total) || 0, game.i18n.localize('HOGWARTS.Roll.XP.Holiday'), [roll]);
}

/**
 * Spread the pool over non-school skills, or trade 5% for a brand new Lore or
 * Language (l. 28308-28316).
 * @this HogwartsActorSheet
 */
export async function onSpendPool(event, target) {
  event.preventDefault();
  const pool = Number(this.actor.system.experience?.pool) || 0;
  if (pool <= 0) return ui.notifications.warn(game.i18n.localize('HOGWARTS.Roll.XP.EmptyPool'));

  const year = Number(this.actor.system.profile?.year) || 1;
  const unlock = CONFIG.HOGWARTS.poolUnlock;
  const skills = foundry.utils.deepClone(this.actor.system.skills ?? []);
  const eligible = skills
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => CONFIG.HOGWARTS.poolSpendCategories.includes(s.category) && !s.unavailable)
    .map((e) => ({
      ...e,
      headroom: Math.max(0, (Number(e.s.max) || 0) - (Number(e.s.base) || 0) - (Number(e.s.spent) || 0)),
    }))
    .filter((e) => e.headroom > 0);

  const rowsHtml = eligible.map((e) => `
    <div class="form-group pool-row">
      <label>${e.s.name}${e.s.spec ? ` (${e.s.spec})` : ''}</label>
      <input type="number" name="skill-${e.index}" value="0" min="0" max="${e.headroom}" step="1" />
      <span class="hint">${e.s.value} / ${e.s.max}</span>
    </div>`).join('');

  const result = await foundry.applications.api.DialogV2.prompt({
    // The stylesheet is namespaced under .hogwarts-system, which a bare dialog lacks.
    classes: ['hogwarts-system'],
    window: { title: game.i18n.format('HOGWARTS.Roll.XP.SpendPool', { pool }) },
    content: `<div class="xp-pool-form">
        <p class="notes">${game.i18n.format('HOGWARTS.Roll.XP.SpendHint', { pool })}</p>
        <div class="form-group unlock-row">
          <label>${game.i18n.format('HOGWARTS.Roll.XP.Unlock', { cost: unlock.cost })}</label>
          <select name="unlockType">
            <option value="">—</option>
            <option value="lore">${game.i18n.localize('HOGWARTS.Roll.XP.UnlockLore')}</option>
            <option value="language">${game.i18n.localize('HOGWARTS.Roll.XP.UnlockLanguage')}</option>
          </select>
          <input type="text" name="unlockName" placeholder="${game.i18n.localize('HOGWARTS.Roll.XP.UnlockName')}" />
        </div>
        <hr />${rowsHtml}
      </div>`,
    ok: {
      label: game.i18n.localize('OK'),
      callback: (ev, button) => {
        const form = button.form;
        const allocations = eligible
          .map((e) => ({ ...e, amount: Math.min(e.headroom, Math.max(0, Number(form.elements[`skill-${e.index}`]?.value) || 0)) }))
          .filter((e) => e.amount > 0);
        return {
          allocations,
          unlockType: form.elements.unlockType?.value || '',
          unlockName: (form.elements.unlockName?.value || '').trim(),
        };
      },
    },
    rejectClose: false,
    modal: true,
  }).catch(() => null);
  if (!result) return;

  const { allocations, unlockType, unlockName } = result;
  const unlockCost = unlockType && unlockName ? unlock.cost : 0;
  const spent = allocations.reduce((sum, a) => sum + a.amount, 0) + unlockCost;
  if (spent > pool) {
    return ui.notifications.warn(game.i18n.format('HOGWARTS.Roll.XP.TooMuch', { spent, pool }));
  }
  if (!spent) return;

  const lines = [];
  for (const a of allocations) {
    skills[a.index].spent = (Number(skills[a.index].spent) || 0) + a.amount;
    lines.push(`<div class="card-row">${skills[a.index].name}: +${a.amount}%</div>`);
  }
  if (unlockCost) {
    const spec = unlockType === 'lore' ? unlock.lore : unlock.language;
    const max = unlockType === 'lore' ? spec.maxFlat + spec.maxPerYear * year : spec.max;
    skills.push({
      name: unlockName,
      base: spec.base,
      max,
      maxOverride: true,
      value: spec.value,
      spent: spec.value,
      category: spec.category,
      spec: '',
      custom: true,
      xpCheck: false,
    });
    lines.push(`<div class="card-row">${game.i18n.format('HOGWARTS.Roll.XP.Unlocked', { name: unlockName, value: spec.value, max })}</div>`);
  }

  await this.actor.update({ 'system.skills': skills, 'system.experience.pool': pool - spent });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    content: `<div class="hogwarts-chat-card">
      <header class="card-header"><h3>${game.i18n.localize('HOGWARTS.Roll.XP.SpendTitle')}</h3><span class="card-type">${game.i18n.localize('HOGWARTS.Roll.XP.Pool')}</span></header>
      ${lines.join('')}
      <div class="card-row"><em>${game.i18n.localize('HOGWARTS.Roll.XP.Pool')}: ${pool} → ${pool - spent}%</em></div></div>`,
    rollMode: game.settings.get('core', 'rollMode'),
  });
}
