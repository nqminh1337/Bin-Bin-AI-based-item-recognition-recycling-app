import AsyncStorage from '@react-native-async-storage/async-storage';
// Reuses the scan feature's Gemini client and model; nothing there is changed.
import { genai, VISION_MODEL } from '@features/scan/geminiClient';
import type { IdentifiedItem } from '@features/scan';
import { ASYNC_STORAGE_KEYS } from '@utils/constants';
import { ITEM_CATALOG, resolveMaterial, type CatalogItem } from './data/materialCatalog';
import { askCatalogItem } from './itemAi';
import { normalize, searchItems } from './itemSearch';
import type { MaterialKey } from './types';

/** Past this, the scan carries on with the local matcher rather than keep the user waiting. */
const AI_TIMEOUT_MS = 6000;
/** Stored in place of an item id when Gemini said nothing fits, so it isn't asked again. */
const NO_MATCH = '';
const MAX_REMEMBERED = 300;

export interface MaterialMatch {
  material: MaterialKey;
  /** The catalog item it matched, when it matched one. */
  item: CatalogItem | null;
  source: 'catalog' | 'remembered' | 'ai' | 'keywords';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function readRemembered(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.ITEM_MATCHES);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function remember(key: string, itemId: string): Promise<void> {
  const all = await readRemembered();
  delete all[key]; // re-inserting moves it to the end, so the oldest are dropped first
  all[key] = itemId;
  const keys = Object.keys(all);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_REMEMBERED))) delete all[old];
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.ITEM_MATCHES, JSON.stringify(all)).catch(() => {});
}

/**
 * FR-24: which material a scanned or typed item is, from fastest to slowest:
 * an exact catalog name, an answer remembered from before, Gemini picking from
 * the catalog, then the offline keyword matcher. null = no rule can apply.
 */
export async function matchMaterial(item: Pick<IdentifiedItem, 'itemId' | 'label'>): Promise<MaterialMatch | null> {
  const exact = ITEM_CATALOG.find((i) => i.itemId === item.itemId) ?? searchItems(item.label, 1).find((s) => s.score >= 1);
  if (exact) return { material: exact.material, item: exact, source: 'catalog' };

  const key = normalize(item.label);
  const remembered = (await readRemembered())[key];
  if (remembered !== undefined) {
    const hit = ITEM_CATALOG.find((i) => i.itemId === remembered);
    if (hit) return { material: hit.material, item: hit, source: 'remembered' };
  } else {
    try {
      const hit = await withTimeout(askCatalogItem(genai, VISION_MODEL, item.label), AI_TIMEOUT_MS);
      await remember(key, hit?.itemId ?? NO_MATCH);
      if (hit) return { material: hit.material, item: hit, source: 'ai' };
    } catch {
      // Offline, slow or a bad response: the local matcher below still gives an answer.
    }
  }

  const material = resolveMaterial(item);
  return material ? { material, item: null, source: 'keywords' } : null;
}
