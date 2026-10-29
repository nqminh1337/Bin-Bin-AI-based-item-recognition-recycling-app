/**
 * Scores how well scan labels are mapped to a disposal material: the offline
 * matcher (resolveMaterial) and Gemini picking from the catalog (askCatalogItem).
 * The labels read like what the scanner returns: brands, states, extra words.
 *
 *   npm run eval:mapping            # both
 *   npm run eval:mapping -- --local # offline matcher only, no API calls
 */
import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { resolveMaterial } from '../src/features/disposal/data/materialCatalog';
import { askCatalogItem } from '../src/features/disposal/itemAi';
import type { MaterialKey } from '../src/features/disposal/types';
import { slugify } from '../src/utils/slugify';

const CASES: Array<[label: string, expected: MaterialKey]> = [
  ['paper coffee cup', 'coffee_cup'], ['takeaway coffee cup with lid', 'coffee_cup'],
  ['crumpled aluminium foil ball', 'aluminium'], ['empty Coke Zero can', 'aluminium'], ['aerosol deodorant can', 'aluminium'],
  ['empty tin of baked beans', 'steel'],
  ['glass kombucha bottle', 'glass'], ['wine bottle', 'glass'], ['jam jar', 'glass'],
  ['Mount Franklin water bottle', 'hard_plastic'], ['empty shampoo bottle', 'hard_plastic'], ['yoghurt tub', 'hard_plastic'],
  ['clear plastic clamshell fruit punnet', 'hard_plastic'],
  ['plastic shopping bag from Coles', 'soft_plastic'], ['chip packet', 'soft_plastic'], ['Cadbury chocolate wrapper', 'soft_plastic'],
  ['Mentos mint roll', 'soft_plastic'], ['bubble wrap', 'soft_plastic'], ['cling wrap', 'soft_plastic'], ['bread bag', 'soft_plastic'],
  ['oat milk carton', 'carton'], ['Woolworths full cream milk carton', 'carton'], ['long life UHT milk carton', 'carton'], ['juice box', 'carton'],
  ['IKEA cardboard packaging', 'cardboard'], ['Amazon delivery box', 'cardboard'], ['cereal box', 'cardboard'], ['egg carton', 'cardboard'],
  ['greasy pizza box lid', 'cardboard'],
  ['newspaper', 'paper'], ['glossy magazine', 'paper'], ['envelope with plastic window', 'paper'], ['sticky note', 'paper'],
  ['half-eaten slice of pepperoni pizza', 'organics'], ['banana peel', 'organics'], ['apple core', 'organics'],
  ['leftover fried rice', 'organics'], ['chicken drumstick bones', 'organics'],
  ['bunch of dead roses', 'garden'], ['grass clippings', 'garden'], ['pile of autumn leaves', 'garden'],
  ['old Samsung Galaxy phone', 'ewaste'], ['wireless Logitech mouse', 'ewaste'], ['iPhone charger cable', 'ewaste'], ['old laptop', 'ewaste'],
  ['LED light bulb', 'ewaste'], ['printer ink cartridge', 'ewaste'],
  ['AA Duracell batteries', 'battery'], ['disposable vape pen', 'battery'], ['portable power bank', 'battery'], ['button battery', 'battery'],
  ['old t-shirt', 'textiles'], ['pair of sneakers', 'textiles'],
  ['used surgical face mask', 'general_waste'], ['broken wine glass', 'general_waste'], ['Pringles tube', 'general_waste'],
  ['toothpaste tube', 'general_waste'], ['polystyrene foam box', 'general_waste'], ['used tissue', 'general_waste'],
  ['paper towel', 'general_waste'], ['plastic bottle cap', 'general_waste'], ['plastic straw', 'general_waste'],
  ['broken ceramic plate', 'general_waste'], ['nappy', 'general_waste'], ['plastic fork', 'general_waste'], ['receipt', 'general_waste'],
];

function report(name: string, results: Array<{ label: string; expected: MaterialKey; got: string | null }>, extra = '') {
  const misses = results.filter((r) => r.got !== r.expected);
  console.log(`\n${name}: ${results.length - misses.length}/${results.length} right${extra}`);
  for (const m of misses) console.log(`  ✗ ${m.label.padEnd(38)} got ${String(m.got ?? 'no rule').padEnd(14)} want ${m.expected}`);
}

async function main() {
  report(
    'Offline matcher',
    CASES.map(([label, expected]) => ({ label, expected, got: resolveMaterial({ itemId: slugify(label), label }) }))
  );
  if (process.argv.includes('--local')) return;

  const line = readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('EXPO_PUBLIC_GEMINI_API_KEY='));
  const apiKey = line?.slice(line.indexOf('=') + 1).trim();
  if (!apiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is missing from .env');
  const genai = new GoogleGenAI({ apiKey });
  // Same model the app uses; read from source so this can't drift from geminiClient.ts.
  const model = readFileSync('src/features/scan/geminiClient.ts', 'utf8').match(/VISION_MODEL = '([^']+)'/)![1];

  const results: Array<{ label: string; expected: MaterialKey; got: string | null }> = [];
  const times: number[] = [];
  for (const [label, expected] of CASES) {
    const start = Date.now();
    const item = await askCatalogItem(genai, model, label).catch(() => null);
    times.push(Date.now() - start);
    results.push({ label, expected, got: item?.material ?? null });
    process.stdout.write('.');
  }
  times.sort((a, b) => a - b);
  report(`Gemini (${model})`, results, ` · median ${times[Math.floor(times.length / 2)]} ms, slowest ${times[times.length - 1]} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
