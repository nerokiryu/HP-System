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
