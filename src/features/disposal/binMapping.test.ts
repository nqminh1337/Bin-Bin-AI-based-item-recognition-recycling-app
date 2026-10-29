import { slugify } from '@utils/slugify';
import { describe, expect, it } from 'vitest';
import { COUNCIL_GUIDELINES } from './data/councilGuidelines';
import { DEFAULT_RULES } from '../../../scripts/seedingFiles/defaultRules';
import { ITEM_CATALOG, resolveMaterial } from './data/materialCatalog';
import type { MaterialKey } from './types';

// Same lookup order as DisposalService.getRule: council rule, then the default.
const ruleFor = (zoneId: string, material: MaterialKey) =>
  DEFAULT_RULES.find((r) => r.zoneId === zoneId && r.material === material) ??
  DEFAULT_RULES.find((r) => r.zoneId === 'default' && r.material === material);

// What a scanned label ends up as on the disposal screen.
const binFor = (label: string, zoneId: string) => {
  const material = resolveMaterial({ itemId: slugify(label), label });
  return material ? ruleFor(zoneId, material)?.binLabel : undefined;
};

const RED = 'Red general waste bin';
const YELLOW = 'Yellow recycling bin';
const BLUE = 'Blue paper & cardboard bin';

describe('scanned item → bin, per council', () => {
  it.each([
    // Recycling, and the six councils with a separate paper bin
    ['soda can', 'nsw-inner-west', YELLOW],
    ['plastic water bottle', 'nsw-canterbury-bankstown', YELLOW],
    ['newspaper', 'nsw-inner-west', YELLOW],
    ['newspaper', 'nsw-mosman', BLUE],
    ['pizza box', 'nsw-ku-ring-gai', BLUE],
    ['milk carton', 'nsw-mosman', YELLOW],
    ['milk carton', 'nsw-lane-cove', BLUE], // some paper bins take cartons, some don't
    ['juice box', 'nsw-northern-beaches', YELLOW],
    // Food: FOGO bin, City of Sydney's maroon bin, or red where food isn't collected
    ['pizza', 'nsw-inner-west', 'Green FOGO bin'],
    ['pizza', 'nsw-sydney', 'Maroon food scraps bin'],
    ['pizza', 'nsw-canterbury-bankstown', RED],
    ['snack', 'nsw-randwick', 'Green FOGO bin'],
    ['banana peel', 'nsw-mosman', RED],
    // Garden: always green, in the FOGO bin where there is one
    ['grass clippings', 'nsw-mosman', 'Green garden bin'],
    ['grass clippings', 'nsw-sydney', 'Green garden bin'],
    ['grass clippings', 'nsw-inner-west', 'Green FOGO bin'],
    ['grass clippings', 'nsw-north-sydney', 'Booked garden waste pick-up'],
    // Things that look recyclable but aren't
    ['paper towel', 'nsw-inner-west', RED],
    ['bottle cap', 'nsw-parramatta', RED],
    ['plastic cutlery', 'nsw-ryde', RED],
    ['coffee cup', 'nsw-sydney', RED],
    ['coffee cup', 'nsw-willoughby', YELLOW],
    ['chip packet', 'nsw-inner-west', RED],
    ['mentos', 'nsw-burwood', RED],
    ['ceramic mug', 'nsw-waverley', RED],
    // Drop-off only
    ['power bank', 'nsw-sydney', 'Battery drop-off (B-cycle)'],
    ['vape', 'nsw-inner-west', 'Battery drop-off (B-cycle)'],
    ['computer mouse', 'nsw-sydney', 'E-waste drop-off'],
    ['printer cartridge', 'nsw-ryde', 'E-waste drop-off'],
  ])('%s in %s → %s', (label, zoneId, bin) => {
    expect(binFor(label, zoneId)).toBe(bin);
  });

  it('every catalog item has a rule in every council', () => {
    const missing = COUNCIL_GUIDELINES.flatMap((g) =>
      ITEM_CATALOG.filter((item) => !ruleFor(g.zoneId, item.material)).map((item) => `${g.zoneId}: ${item.label}`)
    );
    expect(missing).toEqual([]);
  });

  // Scan labels add materials, brands and states; the offline matcher still has to see the item.
  it.each([
    ['paper coffee cup', 'coffee_cup'],
    ['empty Coke Zero can', 'aluminium'],
    ['used surgical face mask', 'general_waste'],
    ['broken wine glass', 'general_waste'],
    ['Pringles tube', 'general_waste'],
    ['plastic shopping bag from Coles', 'soft_plastic'],
    ['glass kombucha bottle', 'glass'],
  ])('offline: %j → %s', (label, material) => {
    expect(resolveMaterial({ itemId: slugify(label), label })).toBe(material);
  });

  it.each([
    'computer mouse', 'mouse', 'keyboard', 'water jug', 'light bulb', 'printer cartridge', 'power bank', 'vape',
    'toothbrush', 'toothpaste tube', 'face mask', 'straw', 'amazon package', 'receipt', 'sticky note',
    'plant pot', 'broken mirror', 'ceramic mug', 'food', 'snack', 'pizza', 'mentos', 'chips', 'pringles',
  ])('%j resolves to a material', (label) => {
    expect(resolveMaterial({ itemId: slugify(label), label })).not.toBeNull();
  });
});
