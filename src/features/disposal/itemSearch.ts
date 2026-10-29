import { ITEM_CATALOG, type CatalogItem } from './data/materialCatalog';

/**
 * Typo-tolerant item search for manual entry (FR-04). Case, spacing and
 * punctuation don't matter ("Glass Jar", "glass-jar", "glassjar"), plurals
 * fold ("jars"), and small typos still match ("glas jarr", "cardbord").
 */

export interface ItemSuggestion extends CatalogItem {
  /** 0-1; 1 = exact. */
  score: number;
  /** The label or alias that matched, so the UI can show "milk jug → Milk bottle". */
  matched: string;
}

/** Below this a suggestion isn't shown. */
const MIN_SCORE = 0.6;
/** At or above this, a typed entry is treated as that catalog item. */
export const CONFIDENT_SCORE = 0.8;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(singular)
    .join(' ');
}

// Good enough for item names: batteries → battery, boxes → box, jars → jar.
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Optimal string alignment distance: Levenshtein plus adjacent swaps ("jra" → "jar"). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

/** How well a normalised query matches one normalised name. */
function scoreTerm(query: string, term: string): number {
  const q = query.replace(/ /g, '');
  const t = term.replace(/ /g, '');
  if (q === t) return 1;
  // Typing the start of a name: "glass j" → "Glass jar".
  const prefixScore = q.length >= 3 && t.startsWith(q) ? 0.9 - 0.2 * (1 - q.length / t.length) : 0;

  // Word by word, so word order and an extra word don't sink it ("jar glass").
  // A match on a name's first word ranks a little higher: "glass" → "Glass jar" before "Broken glass".
  const qWords = query.split(' ');
  const tWords = term.split(' ');
  const wordMatch = (w: string, tw: string) => Math.max(similarity(w, tw), tw.startsWith(w) && w.length >= 3 ? 0.95 : 0);
  const perWord = qWords.map((w) => Math.max(...tWords.map((tw, j) => wordMatch(w, tw) * (1 - 0.03 * j))));
  const wordScore = perWord.every((s) => s >= 0.6) ? (perWord.reduce((a, b) => a + b, 0) / perWord.length) * (qWords.length >= tWords.length ? 0.95 : 0.85) : 0;

  // A known name inside a longer label: scan labels often add a material,
  // brand or state ("paper coffee cup", "empty Coke Zero can").
  const containScore = tWords.every((tw) => qWords.includes(tw)) ? 0.8 + 0.15 * (tWords.length / qWords.length) : 0;

  // Whole thing with spaces squeezed out, which catches "glassjar" and "glas jarr".
  const compactScore = similarity(q, t);
  return Math.max(prefixScore, wordScore, containScore, compactScore >= 0.7 ? compactScore * 0.95 : 0);
}

interface IndexedItem {
  item: CatalogItem;
  terms: Array<{ text: string; normalized: string }>;
}

// Built on first use: ITEM_CATALOG comes from a module that imports this one.
let index: IndexedItem[] | null = null;
function getIndex(): IndexedItem[] {
  index ??= ITEM_CATALOG.map((item) => ({
    item,
    terms: [item.label, ...(item.aliases ?? [])].map((text) => ({ text, normalized: normalize(text) })),
  }));
  return index;
}

/** Best matches first, one per item. */
export function searchItems(query: string, limit = 5): ItemSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const results: ItemSuggestion[] = [];
  for (const { item, terms } of getIndex()) {
    let best = { score: 0, matched: item.label };
    for (const term of terms) {
      // The label is what we show, so it edges out an alias on a tie.
      const score = scoreTerm(q, term.normalized) - (term.text === item.label ? 0 : 0.01);
      if (score > best.score) best = { score, matched: term.text };
    }
    if (best.score >= MIN_SCORE) results.push({ ...item, score: Math.min(1, best.score), matched: best.matched });
  }
  return results.sort((a, b) => b.score - a.score || a.label.length - b.label.length).slice(0, limit);
}

/** The catalog item a typed entry almost certainly means, or null. */
export function bestItemMatch(query: string): ItemSuggestion | null {
  const [top] = searchItems(query, 1);
  return top && top.score >= CONFIDENT_SCORE ? top : null;
}
