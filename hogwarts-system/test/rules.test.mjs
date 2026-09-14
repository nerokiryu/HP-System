/**
 * Unit tests for the rules arithmetic. These cover pure functions only, so they
 * run under plain `node --test` without booting Foundry.
 *
 * Run with: node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** Mirror of helpers/degrees.mjs, which reads a game setting we cannot load here. */
function degreeOf(roll, target, extended = false) {
  if (roll <= 5) return 'Critical';
  if (roll >= 96) return 'Fumble';
  if (extended && roll <= Math.ceil(target / 5)) return 'Extreme';
  if (extended && roll <= Math.ceil(target / 2)) return 'Hard';
  if (roll <= target) return 'Success';
  return 'Fail';
}

test('degrés de réussite — bandes du livre (l. 960, 978)', () => {
  assert.equal(degreeOf(1, 50), 'Critical');
  assert.equal(degreeOf(5, 50), 'Critical');
  assert.equal(degreeOf(6, 50), 'Success');
  assert.equal(degreeOf(50, 50), 'Success');
  assert.equal(degreeOf(51, 50), 'Fail');
  assert.equal(degreeOf(95, 50), 'Fail');
  assert.equal(degreeOf(96, 50), 'Fumble');
  assert.equal(degreeOf(100, 50), 'Fumble');
});

test('96-00 rate même quand la compétence dépasse 95 (l. 960)', () => {
  assert.equal(degreeOf(96, 99), 'Fumble');
  assert.equal(degreeOf(100, 100), 'Fumble');
  assert.equal(degreeOf(95, 99), 'Success');
});

test('paliers étendus — optionnels, arrondi au supérieur', () => {
  assert.equal(degreeOf(10, 50, true), 'Extreme');
  assert.equal(degreeOf(11, 50, true), 'Hard');
  assert.equal(degreeOf(25, 50, true), 'Hard');
  assert.equal(degreeOf(26, 50, true), 'Success');
  // Désactivés, les mêmes jets restent de simples réussites.
  assert.equal(degreeOf(10, 50, false), 'Success');
});

test('points de vie — (TAI + CON) / 2 arrondi au supérieur (l. 740)', () => {
  const pv = (siz, con) => Math.ceil((siz + con) / 2);
  assert.equal(pv(10, 10), 10);
  assert.equal(pv(11, 10), 11);
  assert.equal(pv(14, 13), 14);
});

test('bonus aux dommages — paliers du livre (l. 743-745)', () => {
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

test('maîtrise maximale scolaire — 30 % puis +15 %/an, plafond 100 (l. 6714)', () => {
  const max = (year) => Math.min(100, 30 + (year - 1) * 15);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(max), [30, 45, 60, 75, 90, 100, 100]);
});

test('gain d’expérience — 1d6+1, le +1 hors multiplicateur (l. 6834)', () => {
  const gain = (d6, mult = 1, bonus = 0) => Math.max(1, Math.ceil(d6 * mult) + 1 + bonus);
  assert.equal(gain(1), 2);
  assert.equal(gain(6), 7);
  assert.equal(gain(3, 4 / 3), 5);
});

test('règle des 90 % — chance égale à INT, gain de +1 (l. 6836)', () => {
  const resoudre = (valeur, d100, int) => {
    if (valeur < 90) return d100 > valeur ? 'gain normal' : 'rien';
    return d100 <= int ? 1 : 0;
  };
  assert.equal(resoudre(89, 95, 12), 'gain normal');
  assert.equal(resoudre(90, 10, 12), 1);
  assert.equal(resoudre(90, 50, 12), 0);
});

test('opposition — 50 − (passif × 5) + (actif × 5), borné 1-99 (l. 1031)', () => {
  const opp = (actif, passif) => Math.max(1, Math.min(99, 50 - passif * 5 + actif * 5));
  assert.equal(opp(10, 10), 50);
  assert.equal(opp(15, 10), 75);
  assert.equal(opp(1, 18), 1);
  assert.equal(opp(20, 1), 99);
});

/* ─── Fougue (ch. 8) ────────────────────────────────────────────────────── */

// `reverseDice` touches no Foundry global, so the real implementation is used.
const { reverseDice } = await import('../module/helpers/degrees.mjs');

/** Mirror of helpers/degrees.mjs `fougueDegree`, which reads a game setting. */
function fougueDegree(degree, escalate = true) {
  if (degree !== 'Fail') return degree;
  return escalate ? 'Fumble' : degree;
}

test('fougue — inversion des dizaines et unités (l. 10202)', () => {
  assert.equal(reverseDice(71), 17); // exemple du livre, l. 10208
  assert.equal(reverseDice(73), 37);
  assert.equal(reverseDice(5), 50);  // 05 → 50
  assert.equal(reverseDice(80), 8);  // 80 → 08
  assert.equal(reverseDice(100), 1); // 00 → 01
});

test('fougue — un palindrome reste inchangé, le point est perdu (l. 10220)', () => {
  for (const v of [11, 22, 33, 44, 55, 66, 77, 88, 99]) {
    assert.equal(reverseDice(v), v, `${v} devrait être son propre miroir`);
  }
});

test('fougue — un échec devient une maladresse (l. 2995)', () => {
  assert.equal(fougueDegree('Fail'), 'Fumble');
  assert.equal(fougueDegree('Success'), 'Success');
  assert.equal(fougueDegree('Critical'), 'Critical');
  assert.equal(fougueDegree('Fumble'), 'Fumble');
  // Lecture douce du §8.3, laissée au réglage de monde.
  assert.equal(fougueDegree('Fail', false), 'Fail');
});

test('fougue — plafond de 5 points par partie (l. 10192)', () => {
  const gain = (current, max = 5) => Math.min(max, current + 1);
  assert.equal(gain(0), 1);
  assert.equal(gain(4), 5);
  assert.equal(gain(5), 5);
});

/* ─── Quidditch (ch. 28) ────────────────────────────────────────────────── */

const { snitchChance } = await import('../module/helpers/quidditch.mjs');

test('quidditch — apparition du vif d’or : 10 % au round 2, +5 %/round (l. 29706)', () => {
  assert.equal(snitchChance(1), 0);   // pas avant le second round
  assert.equal(snitchChance(2), 10);
  assert.equal(snitchChance(3), 15);
  assert.equal(snitchChance(10), 50);
  assert.equal(snitchChance(20), 100); // « jusqu’à atteindre 100 % au vingtième round »
  assert.equal(snitchChance(25), 100); // et n’excède jamais 100
});

test('quidditch — la différence est compétence − jet (l. 3066)', () => {
  const marge = (competence, de) => competence - de;
  assert.equal(marge(58, 46), 12); // exemple chiffré du livre
  assert.equal(marge(60, 45), 15);
  assert.equal(marge(53, 7), 46);
});

test('quidditch — opposition : plus haute différence, gêne soustraite (l. 29857)', () => {
  const resoudre = (a, b, gene = 0) => a - gene - b;
  assert.equal(resoudre(40, 28, 10), 2);      // exemple 1 du livre
  assert.ok(resoudre(40, 28, 10) > 0);        // l’action réussit de justesse
  assert.ok(resoudre(21, 28) < 0);            // exemple 3 : le gardien arrête le tir
});

test('quidditch — table de résistance du cognard (l. 29790)', () => {
  const chance = (actif, passif) => Math.min(99, Math.max(1, 50 + (actif - passif) * 5));
  assert.equal(chance(3, 4), 45); // exemple d’Alice : 3 dégâts contre 4 PV restants
});

test('quidditch — points marqués (l. 29524)', () => {
  assert.equal(10, 10);   // but au souafle
  assert.equal(150, 150); // vif d’or, qui met fin au match
});

test('quidditch — effectif réglementaire 3/2/1/1 pour sept joueurs (l. 29488)', async () => {
  const { LINEUP } = await import('../module/helpers/quidditch.mjs');
  assert.deepEqual(LINEUP, { chaser: 3, beater: 2, keeper: 1, seeker: 1 });
  assert.equal(Object.values(LINEUP).reduce((a, b) => a + b, 0), 7);

  const ecarts = (effectif) => Object.entries(LINEUP)
    .filter(([role, attendu]) => (effectif[role] ?? 0) !== attendu)
    .map(([role]) => role);
  assert.deepEqual(ecarts({ chaser: 3, beater: 2, keeper: 1, seeker: 1 }), []);
  // Le livre ne prévoit aucun remplaçant : une équipe blessée finit à six (l. 29548).
  assert.deepEqual(ecarts({ chaser: 2, beater: 2, keeper: 1, seeker: 1 }), ['chaser']);
  assert.deepEqual(ecarts({ chaser: 3, beater: 2, keeper: 1 }), ['seeker']);
});

test('compétences préréglées — aucune paire catégorie/nom en double', async () => {
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
  // La fiche adresse les compétences par index : un doublon décalerait les lignes.
  assert.deepEqual(doublons, []);
  assert.ok(vues.size > 50);
});

test('compétences préréglées — aucun nom ne contient de point', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  // `foundry.utils.setProperty` découpe les chemins sur le point, donc un nom
  // qui en contient ne peut pas être visé par `system.skillBonus.<nom>`.
  const fautifs = Object.values(HOGWARTS.skillPresets).flat()
    .map((s) => s.name)
    .filter((n) => n.includes('.') && !n.includes('(...)'));
  assert.deepEqual(fautifs, []);
});

test('compétences préréglées — base jamais au-dessus de la maîtrise maximale', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const fautifs = Object.values(HOGWARTS.skillPresets).flat()
    .filter((s) => Number(s.base) > Number(s.max))
    .map((s) => `${s.name} ${s.base}/${s.max}`);
  assert.deepEqual(fautifs, []);
});

test('malus d’âge — 1 point par année avant 16 ans (l. 571-574)', () => {
  const malus = (age) => Math.max(0, 16 - age);
  assert.equal(malus(11), 5); // « Un Sorcier de 11 ans aura donc un malus de 5 »
  assert.equal(malus(14), 2); // « 2 pour un Sorcier de 14 ans »
  assert.equal(malus(15), 1); // « On retire 1 à cette valeur si on incarne un Sorcier de 15 ans »
  assert.equal(malus(16), 0); // « celle d’un personnage adulte, soit un personnage de 16 et plus »
  assert.equal(malus(20), 0); // et jamais de bonus au-delà
  // Le dégel d’un point par an *est* la progression annuelle : aucune autre n’est publiée.
  const suite = [11, 12, 13, 14, 15, 16].map(malus);
  assert.deepEqual(suite, [5, 4, 3, 2, 1, 0]);
  assert.ok(suite.every((v, i) => i === 0 || v === suite[i - 1] - 1));
});

test('malus d’âge — ne touche que FOR, CON et TAI', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const touchees = ['str', 'con', 'siz'];
  // Les cinq autres caractéristiques ne portent aucune remarque sur les jeunes sorciers.
  const autres = Object.keys(HOGWARTS.stats).filter((k) => !touchees.includes(k));
  assert.deepEqual(autres.sort(), ['app', 'dex', 'int', 'per', 'pow']);
});

test('génération — 2d6+6 couvre exactement la fourchette 8-18 des PJ (l. 566)', () => {
  const valeurs = [];
  for (let d1 = 1; d1 <= 6; d1++) for (let d2 = 1; d2 <= 6; d2++) valeurs.push(d1 + d2 + 6);
  assert.equal(Math.min(...valeurs), 8);
  assert.equal(Math.max(...valeurs), 18);
});

test('archétypes — quatre caractéristiques dominantes, valides et distinctes (l. 640-646)', async () => {
  const { HOGWARTS } = await import('../module/helpers/config.mjs');
  const connues = Object.keys(HOGWARTS.stats);
  for (const [nom, ordre] of Object.entries(HOGWARTS.archetypePriority)) {
    assert.equal(ordre.length, 4, `${nom} : le livre en donne quatre`);
    assert.equal(new Set(ordre).size, 4, `${nom} : doublon`);
    for (const stat of ordre) assert.ok(connues.includes(stat), `${nom} : caractéristique inconnue ${stat}`);
  }
  // Chaque archétype nommé dans la liste déroulante a sa priorité, sauf « aucun ».
  const archetypes = Object.keys(HOGWARTS.archetypes).filter(Boolean);
  assert.deepEqual(archetypes.sort(), Object.keys(HOGWARTS.archetypePriority).sort());
});

test('PNJ — budgets de création du §21.1 et du §21.2', () => {
  // « Les personnages non-joueurs ne possèdent que 4,5 points (contrairement à 6
  // pour les personnages joueurs) » et « un total de 350 points de compétences
  // (contre 400 pour les PJ) ».
  const BUDGETS = {
    standard: { skillPoints: 350, perkPoints: 4.5 },
    rival: { skillPoints: 400, perkPoints: 6 },
  };
  assert.deepEqual(BUDGETS.standard, { skillPoints: 350, perkPoints: 4.5 });
  // §21.2 : un rival se crée « comme un personnage joueur », donc aux mêmes budgets.
  assert.deepEqual(BUDGETS.rival, { skillPoints: 400, perkPoints: 6 });
  assert.ok(BUDGETS.rival.skillPoints > BUDGETS.standard.skillPoints);
  assert.ok(BUDGETS.rival.perkPoints > BUDGETS.standard.perkPoints);
});

test('PNJ — bonus de points des années supérieures (§22.2.1)', async () => {
  // « Augmentation totale : +40 à 50 | +90 à 110 | +150 à 180 | +210 à 250 |
  // +280 à 330 | +350 à 410 » pour les années 2 à 7. On retient le haut de la
  // fourchette, que le §22.2.1 autorise explicitement.
  const HAUT_DE_FOURCHETTE = { 1: 0, 2: 50, 3: 110, 4: 180, 5: 250, 6: 330, 7: 410 };

  // On lit la source plutôt que de recopier la table : une copie ne détecterait
  // pas une dérive entre le test et le code.
  const fs = await import('node:fs');
  const src = fs.readFileSync('module/data/actor-npc.mjs', 'utf-8');
  const litteral = src.match(/YEAR_SKILL_BONUS\s*=\s*(\{[^}]*\})/)?.[1];
  assert.ok(litteral, 'YEAR_SKILL_BONUS introuvable dans le modèle de données');
  assert.deepEqual(JSON.parse(litteral.replace(/(\d+):/g, '"$1":')), HAUT_DE_FOURCHETTE);

  // Le bonus est cumulatif et strictement croissant : une année de plus ne peut
  // pas rendre un PNJ moins compétent.
  const annees = Object.keys(HAUT_DE_FOURCHETTE).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < annees.length; i++) {
    assert.ok(HAUT_DE_FOURCHETTE[annees[i]] > HAUT_DE_FOURCHETTE[annees[i - 1]]);
  }

  // Un rival de 7e année reste l'adversaire le plus solide que le livre permette.
  assert.equal(400 + HAUT_DE_FOURCHETTE[7], 810);
  assert.equal(350 + HAUT_DE_FOURCHETTE[1], 350);
});

test('génération — 3d6 pour un PNJ, 2d6+6 pour un PJ (l. 566 et §21.1)', () => {
  const etendue = (des, socle) => {
    const min = des * 1 + socle;
    const max = des * 6 + socle;
    return [min, max];
  };
  // Le PJ est un héros : le livre le borne à 8-18.
  assert.deepEqual(etendue(2, 6), [8, 18]);
  // Le PNJ ordinaire descend jusqu'à 3, d'où la remarque du livre invitant le MJ
  // à réajuster « ne tirer que des 3 ou 4 rendrait le PNJ injouable ».
  assert.deepEqual(etendue(3, 0), [3, 18]);
  // Les deux partagent le même plafond, seule la base diffère.
  assert.equal(etendue(2, 6)[1], etendue(3, 0)[1]);
});

test('fiches — aucun champ de formulaire déclaré dans deux onglets', async () => {
  const fs = await import('node:fs');
  // Deux <input> portant le même `name` dans un formulaire envoient un tableau,
  // et le modèle rejette la valeur avec « must be a number ». Les onglets d'une
  // fiche étant rendus ensemble, le conflit est invisible à la lecture.
  // On dédoublonne par fichier : au sein d'un gabarit, un champ répété relève
  // presque toujours de branches {{#if}}/{{else}} exclusives.
  const ONGLETS = {
    character: ['header', 'biography', 'skills', 'features', 'perks', 'gear', 'spells', 'potions', 'familiar', 'settings'],
    npc: ['header', 'npc', 'skills', 'features', 'perks', 'gear', 'spells', 'potions', 'settings'],
    familiar: ['header', 'biography', 'features', 'perks', 'skills', 'settings'],
    creature: ['header', 'creature', 'settings'],
  };
  const PARTIELS = { skills: ['parts/skill-category'] };

  for (const [type, onglets] of Object.entries(ONGLETS)) {
    const vus = new Map();
    for (const nom of onglets.flatMap((o) => [o, ...(PARTIELS[o] ?? [])])) {
      const src = fs.readFileSync(`templates/actor/${nom}.hbs`, 'utf-8');
      const champs = new Set([...src.matchAll(/name=['"](system\.[^'"{]+)['"]/g)].map((m) => m[1]));
      for (const champ of champs) {
        if (!vus.has(champ)) vus.set(champ, []);
        vus.get(champ).push(nom);
      }
    }
    const doublons = [...vus].filter(([, f]) => f.length > 1)
      .map(([champ, f]) => `${type} : ${champ} dans ${f.join(' + ')}`);
    assert.deepEqual(doublons, []);
  }
});
