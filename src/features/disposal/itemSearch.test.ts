import { describe, expect, it } from 'vitest';
import { resolveMaterial } from './data/materialCatalog';
import { bestItemMatch, editDistance, normalize, searchItems } from './itemSearch';

const top = (q: string) => searchItems(q, 1)[0]?.itemId;

describe('normalize', () => {
  it('ignores case, punctuation and plurals', () => {
    expect(normalize('  Glass-JARS! ')).toBe('glass jar');
    expect(normalize('Batteries')).toBe('battery');
    expect(normalize('boxes')).toBe('box');
    expect(normalize('glass')).toBe('glass');
  });
});

describe('editDistance', () => {
  it('counts an adjacent swap as one edit', () => {
    expect(editDistance('jar', 'jra')).toBe(1);
    expect(editDistance('cardboard', 'cardbord')).toBe(1);
    expect(editDistance('', 'abc')).toBe(3);
  });
});

describe('searchItems', () => {
  it.each(['glass jar', 'Glass Jar', 'glass Jar', 'GLASS JAR', 'glassjar', 'glass-jar', 'glass jars'])('finds the glass jar from %j', (q) => {
    expect(top(q)).toBe('glass-jar');
    expect(searchItems(q)[0].score).toBe(1);
  });

  it.each([
    ['glas jar', 'glass-jar'],
    ['glass jarr', 'glass-jar'],
    ['jar glass', 'glass-jar'],
    ['cardbord box', 'cardboard-box'],
    ['alumnium can', 'aluminium-can'],
    ['plastik bottle', 'plastic-bottle'],
    ['battry', 'aa-battery'],
    ['iphon', 'phone'],
  ])('tolerates the typo %j', (q, itemId) => {
    expect(top(q)).toBe(itemId);
  });

  it('matches other names people use', () => {
    expect(searchItems('milk jug')[0]).toMatchObject({ itemId: 'milk-bottle', matched: 'milk jug' });
    expect(top('styrofoam')).toBe('polystyrene');
    expect(top('aluminum can')).toBe('aluminium-can');
    expect(top('tin foil')).toBe('aluminium-foil');
  });

  it('suggests while typing, best first', () => {
    expect(top('glass j')).toBe('glass-jar');
    expect(top('glass')).toBe('glass-jar');
    expect(searchItems('can').map((s) => s.material)).toEqual(expect.arrayContaining(['aluminium', 'steel']));
  });

  it('returns nothing for gibberish or a single letter', () => {
    expect(searchItems('zzzz')).toEqual([]);
    expect(searchItems('g')).toEqual([]);
  });
});

describe('resolveMaterial', () => {
  it('falls back to fuzzy search when keywords miss', () => {
    expect(resolveMaterial({ itemId: 'glassjar', label: 'glassjar' })).toBe('glass');
    expect(resolveMaterial({ itemId: 'styrofoam', label: 'Styrofoam' })).toBe('general_waste');
  });

  it('falls back to uncategorized for unrecognisable items', () => {
    expect(bestItemMatch('xylophone mallet')).toBeNull();
    expect(resolveMaterial({ itemId: 'xyz', label: 'xyzzy' })).toBe('uncategorized');
  });
});
