import type { GoogleGenAI } from '@google/genai';
import { ITEM_CATALOG, type CatalogItem } from './data/materialCatalog';

const UNKNOWN = 'unknown';

// The menu Gemini picks from: id, name and a few other names, one per line.
const CATALOG_LIST = ITEM_CATALOG.map(
  (i) => `${i.itemId}: ${i.label}${i.aliases?.length ? ` (${i.aliases.slice(0, 4).join(', ')})` : ''}`
).join('\n');

const SCHEMA = {
  type: 'object',
  properties: { itemId: { type: 'string', enum: [...ITEM_CATALOG.map((i) => i.itemId), UNKNOWN] } },
  required: ['itemId'],
};

/**
 * Asks Gemini which catalog item a scan label is ("half-eaten slice of
 * pepperoni pizza" → Leftover pizza). The schema limits the answer to our own
 * item ids, so it can't invent one. null = Gemini said none fit.
 * Takes the client as a parameter so scripts can run it outside the app.
 */
export async function askCatalogItem(genai: GoogleGenAI, model: string, label: string): Promise<CatalogItem | null> {
  const interaction = await genai.interactions.create({
    model,
    input: [
      {
        type: 'text',
        text:
          `A recycling app scanned an item and labelled it: "${label}". Pick the catalog item it is, ` +
          `judging by what the object is made of and how it is thrown away. If none fit, answer ${UNKNOWN}.\n\n` +
          `Catalog:\n${CATALOG_LIST}`,
      },
    ],
    response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
  });
  const { itemId } = JSON.parse(interaction.output_text ?? '{}') as { itemId?: string };
  return ITEM_CATALOG.find((i) => i.itemId === itemId) ?? null;
}
