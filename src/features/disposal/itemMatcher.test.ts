import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ITEM_CATALOG } from './data/materialCatalog';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));
vi.mock('@features/scan/geminiClient', () => ({ genai: {}, VISION_MODEL: 'test-model' }));
const askCatalogItem = vi.fn();
vi.mock('./itemAi', () => ({ askCatalogItem: (...args: unknown[]) => askCatalogItem(...args) }));

const { matchMaterial } = await import('./itemMatcher');
const item = (id: string) => ITEM_CATALOG.find((i) => i.itemId === id)!;
const scan = (label: string) => matchMaterial({ itemId: label.toLowerCase().replace(/\W+/g, '-'), label });

beforeEach(() => {
  store.clear();
  askCatalogItem.mockReset();
});

describe('matchMaterial', () => {
  it('uses an exact catalog name without asking Gemini', async () => {
    expect(await scan('Coffee cup')).toMatchObject({ material: 'coffee_cup', source: 'catalog' });
    expect(askCatalogItem).not.toHaveBeenCalled();
  });

  it('asks Gemini for anything else, and remembers the answer', async () => {
    askCatalogItem.mockResolvedValue(item('garden-clippings'));
    expect(await scan('bunch of dead roses')).toMatchObject({ material: 'garden', source: 'ai' });
    expect(await scan('Bunch of dead roses')).toMatchObject({ material: 'garden', source: 'remembered' });
    expect(askCatalogItem).toHaveBeenCalledTimes(1);
  });

  it('falls back to the local matcher when Gemini fails', async () => {
    askCatalogItem.mockRejectedValue(new Error('offline'));
    expect(await scan('paper coffee cup')).toMatchObject({ material: 'coffee_cup', source: 'keywords' });
  });

  it('falls back to the local matcher when Gemini says nothing fits, and does not ask again', async () => {
    askCatalogItem.mockResolvedValue(null);
    expect(await scan('glass kombucha bottle')).toMatchObject({ material: 'glass', source: 'keywords' });
    expect(await scan('glass kombucha bottle')).toMatchObject({ source: 'keywords' });
    expect(askCatalogItem).toHaveBeenCalledTimes(1);
  });

  it('falls back to uncategorized when nothing can place it', async () => {
    askCatalogItem.mockResolvedValue(null);
    expect(await scan('xyzzy')).toMatchObject({ material: 'uncategorized', source: 'keywords' });
  });
});
