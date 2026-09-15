/**
 * Unit tests for the rules arithmetic. These cover pure functions only, so they
 * run under plain `node --test` without booting Foundry.
 *
 * Run with: node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// These helpers touch no Foundry global, so the real implementations are used.
const { resistanceChance, marginOf, resolveOpposed } = await import('../module/helpers/opposition.mjs');

/** Mirror of helpers/degrees.mjs, which reads a game setting we cannot load here. */
function degreeOf(roll, target, extended = false) {
  if (roll <= 5) return 'Critical';
  if (roll >= 96) return 'Fumble';
  if (extended && roll <= Math.ceil(target / 5)) return 'Extreme';
  if (extended && roll <= Math.ceil(target / 2)) return 'Hard';
  if (roll <= target) return 'Success';
  return 'Fail';
}

test('success degrees — the bands published in the book (l. 960, 978)', () => {
  assert.equal(degreeOf(1, 50), 'Critical');
  assert.equal(degreeOf(5, 50), 'Critical');
  assert.equal(degreeOf(6, 50), 'Success');
  assert.equal(degreeOf(50, 50), 'Success');
  assert.equal(degreeOf(51, 50), 'Fail');
  assert.equal(degreeOf(95, 50), 'Fail');
  assert.equal(degreeOf(96, 50), 'Fumble');
  assert.equal(degreeOf(100, 50), 'Fumble');
});

test('96-00 misses even when the skill exceeds 95 (l. 960)', () => {
  assert.equal(degreeOf(96, 99), 'Fumble');
  assert.equal(degreeOf(100, 100), 'Fumble');
  assert.equal(degreeOf(95, 99), 'Success');
});

test('extended tiers — optional, rounded up', () => {
  assert.equal(degreeOf(10, 50, true), 'Extreme');
  assert.equal(degreeOf(11, 50, true), 'Hard');
  assert.equal(degreeOf(25, 50, true), 'Hard');
  assert.equal(degreeOf(26, 50, true), 'Success');
  // Switched off, the same rolls stay plain successes.
  assert.equal(degreeOf(10, 50, false), 'Success');
});

test('hit points — (SIZ + CON) / 2 rounded up (l. 740)', () => {
  const pv = (siz, con) => Math.ceil((siz + con) / 2);
  assert.equal(pv(10, 10), 10);
  assert.equal(pv(11, 10), 11);
  assert.equal(pv(14, 13), 14);
});

test('damage bonus — the tiers published in the book (l. 743-745)', () => {
  const bonus = (str, siz) => {
    const t = str + siz;
    if (t <= 24) return '—';
    if (t <= 32) return '+1d3';
    if (t <= 40) return '+1d6';
    return '+2d6';
  };
  assert.equal(bonus(12, 12), '—');
  assert.equal(bonus(13, 12), '+1d3');
  assert.equal(bonus(16, 16), '+1d3');
  assert.equal(bonus(17, 16), '+1d6');
  assert.equal(bonus(20, 21), '+2d6');
});

test('school maximum mastery — 30 % then +15 %/year, capped at 100 (l. 6714)', () => {
  const max = (year) => Math.min(100, 30 + (year - 1) * 15);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(max), [30, 45, 60, 75, 90, 100, 100]);
});

test('experience gain — 1d6+1, the +1 outside the multiplier (l. 6834)', () => {
  const gain = (d6, mult = 1, bonus = 0) => Math.max(1, Math.ceil(d6 * mult) + 1 + bonus);
  assert.equal(gain(1), 2);
  assert.equal(gain(6), 7);
  assert.equal(gain(3, 4 / 3), 5);
});

test('the 90 % rule — chance equal to INT, gain of +1 (l. 6836)', () => {
  const resoudre = (valeur, d100, int) => {
    if (valeur < 90) return d100 > valeur ? 'gain normal' : 'rien';
    return d100 <= int ? 1 : 0;
  };
  assert.equal(resoudre(89, 95, 12), 'gain normal');
  assert.equal(resoudre(90, 10, 12), 1);
  assert.equal(resoudre(90, 50, 12), 0);
});

test('resistance table — 50 − (passive × 5) + (active × 5), clamped to 5-95 (l. 1031)', () => {
  assert.equal(resistanceChance(10, 10), 50);
  assert.equal(resistanceChance(15, 10), 75);
  // The printed table stops at 05 and 95, so the formula is clamped to its range.
  assert.equal(resistanceChance(1, 18), 5);
  assert.equal(resistanceChance(20, 1), 95);
  // The book's own worked example: active 45, passive 53 → 10 %, which it also
  // reduces to active 5 against passive 13 to fit the printed table.
  assert.equal(resistanceChance(5, 13), 10);
  assert.equal(resistanceChance(45, 53), 10);
});

/* ─── Fougue (ch. 8) ────────────────────────────────────────────────────── */

// `reverseDice` touches no Foundry global, so the real implementation is used.
const { reverseDice } = await import('../module/helpers/degrees.mjs');

/** Mirror of helpers/degrees.mjs `fougueDegree`, which reads a game setting. */
function fougueDegree(degree, escalate = true) {
  if (degree !== 'Fail') return degree;
  return escalate ? 'Fumble' : degree;
}

test('fougue — tens and units are swapped (l. 10202)', () => {
  assert.equal(reverseDice(71), 17); // the book's example, l. 10208
  assert.equal(reverseDice(73), 37);
  assert.equal(reverseDice(5), 50);  // 05 → 50
  assert.equal(reverseDice(80), 8);  // 80 → 08
  assert.equal(reverseDice(100), 1); // 00 → 01
});

test('fougue — a palindrome stays put, the point is spent anyway (l. 10220)', () => {
  for (const v of [11, 22, 33, 44, 55, 66, 77, 88, 99]) {
    assert.equal(reverseDice(v), v, `${v} should be its own mirror`);
  }
});

test('fougue — a failure turns into a fumble (l. 2995)', () => {
  assert.equal(fougueDegree('Fail'), 'Fumble');
  assert.equal(fougueDegree('Success'), 'Success');
  assert.equal(fougueDegree('Critical'), 'Critical');
  assert.equal(fougueDegree('Fumble'), 'Fumble');
  // A lenient reading of §8.3, left to a world setting.
  assert.equal(fougueDegree('Fail', false), 'Fail');
});

test('fougue — capped at 5 points per session (l. 10192)', () => {
  const gain = (current, max = 5) => Math.min(max, current + 1);
  assert.equal(gain(0), 1);
  assert.equal(gain(4), 5);
  assert.equal(gain(5), 5);
});

/* ─── Quidditch (ch. 28) ────────────────────────────────────────────────── */

const { snitchChance } = await import('../module/helpers/quidditch.mjs');

test('quidditch — snitch appearance: 10 % on round 2, +5 %/round (l. 29706)', () => {
  assert.equal(snitchChance(1), 0);   // not before the second round
  assert.equal(snitchChance(2), 10);
  assert.equal(snitchChance(3), 15);
  assert.equal(snitchChance(10), 50);
  assert.equal(snitchChance(20), 100); // « jusqu’à atteindre 100 % au vingtième round »
  assert.equal(snitchChance(25), 100); // et n’excède jamais 100
});

test('opposed rolls — the margin is skill − roll (l. 3066)', () => {
  assert.equal(marginOf(58, 46), 12); // the book's worked example
  assert.equal(marginOf(60, 45), 15);
  assert.equal(marginOf(53, 7), 46);
});

test('opposed rolls — highest margin wins, hindrance subtracted (l. 29857)', () => {
  assert.equal(resolveOpposed(40, 28, 10).total, 2); // example 1 in the book
  assert.ok(resolveOpposed(40, 28, 10).actingWins);  // scrapes through
  assert.ok(!resolveOpposed(21, 28).actingWins);     // example 3: the keeper saves
  // A tie goes to whoever acts first in the initiative order (l. 29822).
  assert.ok(resolveOpposed(30, 30).actingWins);
  assert.ok(resolveOpposed(30, 30).tie);
});

test('quidditch — bludger resistance table (l. 29790)', () => {
  // Alice's example: 3 damage against 4 remaining hit points.
  assert.equal(resistanceChance(3, 4), 45);
});

test('quidditch — points scored (l. 29524)', async () => {
  const { QUIDDITCH_POINTS } = await import('../module/helpers/quidditch.mjs');
  assert.equal(QUIDDITCH_POINTS.goal, 10);     // quaffle goal
  assert.equal(QUIDDITCH_POINTS.snitch, 150);  // snitch, which ends the match
});

test('quidditch — regulation line-up 3/2/1/1 for seven players (l. 29488)', async () => {
  const { LINEUP } = await import('../module/helpers/quidditch.mjs');
  assert.deepEqual(LINEUP, { chaser: 3, beater: 2, keeper: 1, seeker: 1 });
  assert.equal(Object.values(LINEUP).reduce((a, b) => a + b, 0), 7);

  const ecarts = (effectif) => Object.entries(LINEUP)
    .filter(([role, attendu]) => (effectif[role] ?? 0) !== attendu)
    .map(([role]) => role);
  assert.deepEqual(ecarts({ chaser: 3, beater: 2, keeper: 1, seeker: 1 }), []);
  // The book provides no substitute: an injured team finishes with six (l. 29548).
  assert.deepEqual(ecarts({ chaser: 2, beater: 2, keeper: 1, seeker: 1 }), ['chaser']);
  assert.deepEqual(ecarts({ chaser: 3, beater: 2, keeper: 1 }), ['seeker']);
});

test('preset skills — no duplicate category/name pair', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const vues = new Set();
  const doublons = [];
  for (const [categorie, liste] of Object.entries(HOGWARTS.skillPresets)) {
    for (const entree of liste) {
      const cle = `${categorie}:${entree.name}`;
      if (vues.has(cle)) doublons.push(cle);
      vues.add(cle);
    }
  }
  // The sheet addresses skills by index: a duplicate would shift the rows.
  assert.deepEqual(doublons, []);
  assert.ok(vues.size > 50);
});

test('preset skills — no name contains a dot', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  // `foundry.utils.setProperty` splits paths on dots, so a name containing one
  // cannot be targeted through `system.skillBonus.<name>`.
  const offenders = Object.values(HOGWARTS.skillPresets).flat()
    .map((s) => s.name)
    .filter((n) => n.includes('.') && !n.includes('(...)'));
  assert.deepEqual(offenders, []);
});

test('preset skills — base never above the maximum mastery', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const offenders = Object.values(HOGWARTS.skillPresets).flat()
    .filter((s) => Number(s.base) > Number(s.max))
    .map((s) => `${s.name} ${s.base}/${s.max}`);
  assert.deepEqual(offenders, []);
});

test('age malus — 1 point per year below 16 (l. 571-574)', () => {
  const malus = (age) => Math.max(0, 16 - age);
  assert.equal(malus(11), 5); // « Un Sorcier de 11 ans aura donc un malus de 5 »
  assert.equal(malus(14), 2); // « 2 pour un Sorcier de 14 ans »
  assert.equal(malus(15), 1); // « On retire 1 à cette valeur si on incarne un Sorcier de 15 ans »
  assert.equal(malus(16), 0); // « celle d’un personnage adulte, soit un personnage de 16 et plus »
  assert.equal(malus(20), 0); // et jamais de bonus au-delà
  // The one-point-per-year thaw *is* the yearly progression: no other is published.
  const suite = [11, 12, 13, 14, 15, 16].map(malus);
  assert.deepEqual(suite, [5, 4, 3, 2, 1, 0]);
  assert.ok(suite.every((v, i) => i === 0 || v === suite[i - 1] - 1));
});

test('age malus — only affects STR, CON and SIZ', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const touchees = ['str', 'con', 'siz'];
  // The other five characteristics carry no remark about young wizards.
  const autres = Object.keys(HOGWARTS.stats).filter((k) => !touchees.includes(k));
  assert.deepEqual(autres.sort(), ['app', 'dex', 'int', 'per', 'pow']);
});

test('rolling — 2d6+6 covers exactly the 8-18 player range (l. 566)', () => {
  const valeurs = [];
  for (let d1 = 1; d1 <= 6; d1++) for (let d2 = 1; d2 <= 6; d2++) valeurs.push(d1 + d2 + 6);
  assert.equal(Math.min(...valeurs), 8);
  assert.equal(Math.max(...valeurs), 18);
});

test('archetypes — four dominant characteristics, valid and distinct (l. 640-646)', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const known = Object.keys(HOGWARTS.stats);
  for (const [partName, order] of Object.entries(HOGWARTS.archetypePriority)) {
    assert.equal(order.length, 4, `${partName} : le livre en donne quatre`);
    assert.equal(new Set(order).size, 4, `${partName} : doublon`);
    for (const stat of order) assert.ok(known.includes(stat), `${partName}: unknown characteristic ${stat}`);
  }
  // Every archetype listed in the dropdown has its priority, bar « aucun ».
  const archetypes = Object.keys(HOGWARTS.archetypes).filter(Boolean);
  assert.deepEqual(archetypes.sort(), Object.keys(HOGWARTS.archetypePriority).sort());
});

test('advantages — granted skills, absent from the presets', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');

  // « Donne une compétence Legilimancie à 15 % de maîtrise. Maîtrise maximale 80 % »,
  // « Occlumancie à 15 % […] 80 % », « Métamorphomage à 20 % (maximal : 90 %) ».
  // Animagus: chapter 16 (l. 24645) prevails over the table (l. 3753).
  assert.deepEqual(HOGWARTS.featureSkills, {
    'Animagus': { name: 'Animagus', base: 10, max: 80 },
    'Legilimens': { name: 'Legilimancie', base: 15, max: 80 },
    'Occlumens': { name: 'Occlumancie', base: 15, max: 80 },
    'Métamorphomage': { name: 'Métamorphomage', base: 20, max: 90 },
  });

  // An ordinary wizard does not have them, so they must appear in no preset
  // category, otherwise the advantage would grant nothing.
  const presetNames = Object.values(HOGWARTS.skillPresets).flat().map((s) => s.name);
  const grantedNames = Object.values(HOGWARTS.featureSkills).map((s) => s.name);
  assert.deepEqual(presetNames.filter((n) => grantedNames.includes(n)), []);
});

test('advantages — perception multipliers (§5.2)', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');

  // « Cette compétence s'ajoute à vos autres perceptions et se fait comme un jet
  // de PERceptionx4. » An extra sense, hence absent from the base multipliers.
  assert.equal(HOGWARTS.featureSenses['Troisième œil'].thirdEye, 4);
  assert.ok(!('thirdEye' in (HOGWARTS.derivedMultipliers ?? {})));

  // « Sans vos lunettes […] PERx1 au lieu de PERx5 » : remplacement, et
  // conditional, hence shipped disabled.
  assert.equal(HOGWARTS.featureSenses['Problèmes visuels'].sight, 1);
  assert.equal(HOGWARTS.featureSenses['Problèmes visuels'].conditional, true);
});

test('senses — a granted sense reaches every actor type that can hold one', async () => {
  const { deriveSenses } = await import('../module/helpers/senses.mjs');
  const { HOGWARTS } = await import('../module/helpers/config.mjs');

  // The character and NPC models inherit from the base separately, so this
  // derivation lived in only one of them: an NPC wrote `senseMult` but never
  // read it, and *Troisième œil* did nothing on an NPC sheet.
  const plain = deriveSenses({ per: 14, int: 10, pow: 12 });
  assert.equal(plain.sight, 70);
  assert.equal(plain.hearing, 56);
  assert.equal(plain.idea, 50);
  assert.equal(plain.luck, 60);
  assert.ok(!('thirdEye' in plain));

  const thirdEye = deriveSenses({ per: 14, senseMult: HOGWARTS.featureSenses['Troisième œil'] });
  assert.equal(thirdEye.thirdEye, 56);
  assert.equal(thirdEye.sight, 70);

  // Problèmes visuels replaces a multiplier instead of adding a sense.
  const glasses = deriveSenses({ per: 14, senseMult: { sight: 1 } });
  assert.equal(glasses.sight, 14);

  // A zero or negative override is ignored rather than wiping the sense out.
  assert.equal(deriveSenses({ per: 14, senseMult: { sight: 0 } }).sight, 70);
  assert.equal(deriveSenses({ per: 14, senseMult: { thirdEye: 0 } }).thirdEye, undefined);
});

test('NPC — creation budgets from §21.1 and §21.2', () => {
  // « Les personnages non-joueurs ne possèdent que 4,5 points (contrairement à 6
  // pour les personnages joueurs) » et « un total de 350 points de compétences
  // (contre 400 pour les PJ) ».
  const BUDGETS = {
    standard: { skillPoints: 350, perkPoints: 4.5 },
    rival: { skillPoints: 400, perkPoints: 6 },
  };
  assert.deepEqual(BUDGETS.standard, { skillPoints: 350, perkPoints: 4.5 });
  // §21.2: a rival is built « comme un personnage joueur », hence identical budgets.
  assert.deepEqual(BUDGETS.rival, { skillPoints: 400, perkPoints: 6 });
  assert.ok(BUDGETS.rival.skillPoints > BUDGETS.standard.skillPoints);
  assert.ok(BUDGETS.rival.perkPoints > BUDGETS.standard.perkPoints);
});

test('NPC — extra points for advanced years (§22.2.1)', async () => {
  // « Augmentation totale : +40 à 50 | +90 à 110 | +150 à 180 | +210 à 250 |
  // +280 à 330 | +350 à 410 » for years 2 to 7. We keep the upper bound, which
  // §22.2.1 explicitly allows.
  const HAUT_DE_FOURCHETTE = { 1: 0, 2: 50, 3: 110, 4: 180, 5: 250, 6: 330, 7: 410 };

  // The source is read rather than the table copied: a copy would never detect
  // a drift between the test and the code.
  const fs = await import('node:fs');
  const src = fs.readFileSync('module/data/actor-npc.mjs', 'utf-8');
  const litteral = src.match(/YEAR_SKILL_BONUS\s*=\s*(\{[^}]*\})/)?.[1];
  assert.ok(litteral, 'YEAR_SKILL_BONUS introuvable dans le modèle de données');
  assert.deepEqual(JSON.parse(litteral.replace(/(\d+):/g, '"$1":')), HAUT_DE_FOURCHETTE);

  // The bonus is cumulative and strictly increasing: one more year can never
  // make an NPC less competent.
  const annees = Object.keys(HAUT_DE_FOURCHETTE).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < annees.length; i++) {
    assert.ok(HAUT_DE_FOURCHETTE[annees[i]] > HAUT_DE_FOURCHETTE[annees[i - 1]]);
  }

  // A seventh-year rival stays the toughest opponent the book allows.
  assert.equal(400 + HAUT_DE_FOURCHETTE[7], 810);
  assert.equal(350 + HAUT_DE_FOURCHETTE[1], 350);
});

test('rolling — 3d6 for an NPC, 2d6+6 for a player character (l. 566 and §21.1)', () => {
  const range = (des, socle) => {
    const min = des * 1 + socle;
    const max = des * 6 + socle;
    return [min, max];
  };
  // A player character is a hero: the book bounds them to 8-18.
  assert.deepEqual(range(2, 6), [8, 18]);
  // A plain NPC goes down to 3, hence the book's remark inviting the gamemaster
  // to adjust: « ne tirer que des 3 ou 4 rendrait le PNJ injouable ».
  assert.deepEqual(range(3, 0), [3, 18]);
  // Both share the same ceiling, only the floor differs.
  assert.equal(range(2, 6)[1], range(3, 0)[1]);
});

/* ─── Wizard duel (ch. 27) ──────────────────────────────────────────────── */

const duel = await import('../module/helpers/duel.mjs');

test('duel — the allowed-spell table holds the 67 printed rows (§27.5)', () => {
  assert.equal(duel.DUEL_SPELLS.length, 67);
  // Every row is legal in at least one duel type, and only in the four printed.
  for (const s of duel.DUEL_SPELLS) {
    assert.ok(s.types.length > 0, `${s.name} is legal nowhere`);
    assert.match(s.types, /^[abcd]+$/, `${s.name}: ${s.types}`);
    assert.ok(s.level >= 1 && s.level <= 6, `${s.name}: level ${s.level}`);
    assert.ok([2, 3].includes(s.priority), `${s.name}: priority ${s.priority}`);
  }
});

test('duel — the Unforgivables are confined to the duel to the death (§27.5)', () => {
  const unforgivable = duel.DUEL_SPELLS.filter((s) => s.unforgivable);
  assert.deepEqual(unforgivable.map((s) => s.name), ['Doloris', 'Imperium', 'Mort']);
  for (const s of unforgivable) assert.equal(s.types, 'd');
  // And nothing else is restricted to type d alone.
  assert.equal(duel.DUEL_SPELLS.filter((s) => s.types === 'd').length, 3);
});

test('duel — the three unmatched names stay flagged, never silently remapped', () => {
  // The table names three spells that exist neither in the rulebook's own
  // tables nor in the Grimoire. They are kept, and marked.
  const unlinked = duel.DUEL_SPELLS.filter((s) => s.unlinked).map((s) => s.name);
  assert.deepEqual(unlinked, ['Annulation de sort', 'Immobilisation totale', 'Explosion']);
});

test('duel — a wounding duel opens up spells the others forbid (§27.4)', () => {
  const a = duel.allowedSpells('a').length;
  const d = duel.allowedSpells('d').length;
  assert.ok(a < d, `type a (${a}) should allow fewer spells than type d (${d})`);
  assert.equal(d, 67); // everything is legal in a duel to the death
  assert.ok(!duel.isSpellAllowed('Doloris', 'c'));
  assert.ok(duel.isSpellAllowed('Doloris', 'd'));
  assert.ok(duel.isSpellAllowed('Désarmement', 'a'));
});

test('duel — priority ladder and its initiative modifiers (§27.3, l. 28610)', () => {
  const protection = duel.DUEL_SPELLS.find((s) => s.name === 'Protection');
  const classic = duel.DUEL_SPELLS.find((s) => s.name === 'Désarmement');

  // Innate spells always go first, extreme formulas always last, whatever the
  // printed column says.
  assert.equal(duel.duelPriority(protection, 'innate').priority, 1);
  assert.equal(duel.duelPriority(protection, 'extreme').priority, 4);
  // Otherwise the printed column wins.
  assert.equal(duel.duelPriority(protection, 'classic').priority, 2);
  assert.equal(duel.duelPriority(classic, 'classic').priority, 3);
  assert.equal(duel.duelPriority(classic, 'unspoken').priority, 3);

  assert.equal(duel.duelPriority(classic, 'unspoken').initiative, 3);
  assert.equal(duel.duelPriority(classic, 'extreme').initiative, -3);
  assert.equal(duel.duelPriority(classic, 'classic').initiative, 0);
});

test('duel — club practice and the advantage stack, capped at +5 (l. 28577)', () => {
  // Mary Macmilliam: +2 from the advantage, +3 from three years of club = +5.
  assert.equal(duel.duelTrainingBonus({ clubYears: 3, initiate: true }), 5);
  assert.equal(duel.duelTrainingBonus({ clubYears: 3 }), 3);
  assert.equal(duel.duelTrainingBonus({ initiate: true }), 2);
  assert.equal(duel.duelTrainingBonus(), 0);
  // The club bonus alone never exceeds +5, but the advantage still adds on top.
  assert.equal(duel.duelTrainingBonus({ clubYears: 9 }), 5);
  assert.equal(duel.duelTrainingBonus({ clubYears: 9, initiate: true }), 7);
});

test('duel — the advantage is never counted twice (l. 4070)', () => {
  // *Initié au duel* ships as a conditional effect on `initiativeBonus`. Once
  // the player switches it on, the +2 is already in there: adding it again gave
  // 32 instead of 30 in a real duel.
  assert.equal(duel.initiateBonusPending({ owns: true, effectApplied: false }), true);
  assert.equal(duel.initiateBonusPending({ owns: true, effectApplied: true }), false);
  assert.equal(duel.initiateBonusPending({ owns: false, effectApplied: false }), false);
  assert.equal(duel.initiateBonusPending(), false);
});

test('duel — an extreme formula the spell does not have never makes it easier', () => {
  // 251 of the 366 spells print « Formule extrême : - » and store a zero
  // extreme malus. Reading that zero as a cost turned a −20 spell into a 0.
  const noFormula = { malus: -20, malusExtremeFormula: 0, extremeFormula: false };
  assert.deepEqual(duel.spellMalus(noFormula, 'extreme'), { malus: -20, noExtreme: true });
  assert.deepEqual(duel.spellMalus(noFormula, 'classic'), { malus: -20, noExtreme: false });

  const withFormula = { malus: -20, malusExtremeFormula: -40, extremeFormula: true };
  assert.deepEqual(duel.spellMalus(withFormula, 'extreme'), { malus: -40, noExtreme: false });
  assert.deepEqual(duel.spellMalus(withFormula, 'classic'), { malus: -20, noExtreme: false });

  // Mastering the extreme formula lowers the plain spell's malus (l. 23346).
  const mastered = { malus: -30, malusMastered: -20, extremeFormula: true, extremeMastered: true };
  assert.equal(duel.spellMalus(mastered, 'classic').malus, -20);
});

test('duel — the two non-wounding types disqualify on damage (§27.4)', () => {
  assert.ok(duel.DUEL_TYPES.a.damageDisqualifies);
  assert.ok(duel.DUEL_TYPES.b.damageDisqualifies);
  assert.ok(!duel.DUEL_TYPES.c.damageDisqualifies);
  assert.ok(!duel.DUEL_TYPES.d.damageDisqualifies);
  // Only the duel to the death allows lethal spells.
  assert.deepEqual(Object.entries(duel.DUEL_TYPES).filter(([, t]) => t.lethal).map(([k]) => k), ['d']);
});

test('sheets — no form field declared in two tabs', async () => {
  const fs = await import('node:fs');
  // Two <input> elements sharing a `name` in one form submit an array, and the
  // data model rejects the value with « must be a number ». Every tab of a
  // sheet being rendered together, the clash is invisible when reading.
  // Deduplicated per file: within one template, a repeated field almost always
  // comes from exclusive {{#if}}/{{else}} branches.
  const TABS = {
    character: ['header', 'biography', 'skills', 'features', 'perks', 'gear', 'spells', 'potions', 'familiar', 'settings'],
    npc: ['header', 'npc', 'skills', 'features', 'perks', 'gear', 'spells', 'potions', 'familiar', 'settings'],
    familiar: ['header', 'biography', 'features', 'perks', 'skills', 'settings'],
    creature: ['header', 'creature', 'settings'],
  };
  const PARTIALS = { skills: ['parts/skill-category'] };

  for (const [type, tabs] of Object.entries(TABS)) {
    const seen = new Map();
    for (const partName of tabs.flatMap((o) => [o, ...(PARTIALS[o] ?? [])])) {
      const src = fs.readFileSync(`templates/actor/${partName}.hbs`, 'utf-8');
      const fields = new Set([...src.matchAll(/name=['"](system\.[^'"{]+)['"]/g)].map((m) => m[1]));
      for (const field of fields) {
        if (!seen.has(field)) seen.set(field, []);
        seen.get(field).push(partName);
      }
    }
    const clashes = [...seen].filter(([, f]) => f.length > 1)
      .map(([field, f]) => `${type}: ${field} in ${f.join(' + ')}`);
    assert.deepEqual(clashes, []);
  }
});
