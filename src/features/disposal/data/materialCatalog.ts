import type { IdentifiedItem } from '@features/scan';
import { bestItemMatch } from '../itemSearch';
import type { MaterialKey } from '../types';

export interface CatalogItem {
  itemId: string;
  label: string;
  material: MaterialKey;
  /** Other names people type for it; itemSearch matches these too. */
  aliases?: string[];
}

/** Everyday items, searchable by name (itemSearch) and matched exactly by itemId. */
export const ITEM_CATALOG: CatalogItem[] = [
  { itemId: 'glass-jar', label: 'Glass jar', material: 'glass', aliases: ['jam jar', 'pasta sauce jar', 'jar'] },
  { itemId: 'glass-bottle', label: 'Glass bottle', material: 'glass', aliases: ['wine bottle', 'beer bottle', 'sauce bottle'] },
  { itemId: 'cardboard-box', label: 'Cardboard box', material: 'cardboard', aliases: ['shipping box', 'delivery box', 'cereal box', 'amazon package', 'parcel', 'package', 'moving box'] },
  { itemId: 'pizza-box', label: 'Pizza box', material: 'cardboard' },
  { itemId: 'egg-carton', label: 'Egg carton', material: 'cardboard' },
  { itemId: 'toilet-roll', label: 'Toilet roll', material: 'cardboard', aliases: ['toilet paper roll', 'paper towel roll'] },
  { itemId: 'newspaper', label: 'Newspaper', material: 'paper', aliases: ['news paper'] },
  { itemId: 'magazine', label: 'Magazine', material: 'paper' },
  { itemId: 'office-paper', label: 'Office paper', material: 'paper', aliases: ['printer paper', 'a4 paper', 'paper'] },
  { itemId: 'envelope', label: 'Envelope', material: 'paper' },
  { itemId: 'junk-mail', label: 'Junk mail', material: 'paper', aliases: ['catalogue', 'flyer', 'brochure'] },
  { itemId: 'paper-bag', label: 'Paper bag', material: 'paper' },
  { itemId: 'sticky-note', label: 'Sticky note', material: 'paper', aliases: ['post-it', 'post it note'] },
  { itemId: 'milk-carton', label: 'Milk carton', material: 'carton', aliases: ['juice carton', 'juice box', 'long life milk', 'oat milk carton', 'tetra pak', 'popper', 'carton'] },
  { itemId: 'aluminium-can', label: 'Aluminium can', material: 'aluminium', aliases: ['aluminum can', 'soft drink can', 'soda can', 'coke can', 'beer can', 'drink can'] },
  { itemId: 'aluminium-foil', label: 'Aluminium foil', material: 'aluminium', aliases: ['alfoil', 'tin foil', 'foil', 'foil tray'] },
  { itemId: 'aerosol-can', label: 'Aerosol can', material: 'aluminium', aliases: ['spray can', 'deodorant can'] },
  { itemId: 'steel-can', label: 'Steel can', material: 'steel', aliases: ['tin can', 'food can', 'soup can', 'tuna can', 'baked beans can'] },
  { itemId: 'plastic-bottle', label: 'Plastic bottle', material: 'hard_plastic', aliases: ['water bottle', 'plastic water bottle', 'soft drink bottle', 'drink bottle', 'pet bottle', 'juice bottle', 'water jug', 'plastic jug'] },
  { itemId: 'milk-bottle', label: 'Milk bottle', material: 'hard_plastic', aliases: ['milk jug'] },
  { itemId: 'yoghurt-tub', label: 'Yoghurt tub', material: 'hard_plastic', aliases: ['yogurt tub', 'yoghurt container', 'margarine tub', 'ice cream container'] },
  { itemId: 'takeaway-container', label: 'Takeaway container', material: 'hard_plastic', aliases: ['take away container', 'plastic container', 'food container'] },
  { itemId: 'shampoo-bottle', label: 'Shampoo bottle', material: 'hard_plastic', aliases: ['conditioner bottle', 'detergent bottle', 'cleaning spray bottle'] },
  { itemId: 'plastic-bag', label: 'Plastic bag', material: 'soft_plastic', aliases: ['shopping bag', 'grocery bag'] },
  { itemId: 'chip-packet', label: 'Chip packet', material: 'soft_plastic', aliases: ['chips', 'chips bag', 'chips packet', 'crisp packet', 'snack packet', 'snack wrapper', 'doritos'] },
  { itemId: 'lolly-wrapper', label: 'Lolly wrapper', material: 'soft_plastic', aliases: ['candy wrapper', 'chocolate wrapper', 'mentos', 'mentos roll', 'muesli bar wrapper', 'kit kat wrapper', 'lolly bag'] },
  { itemId: 'cling-wrap', label: 'Cling wrap', material: 'soft_plastic', aliases: ['glad wrap', 'plastic wrap', 'cling film'] },
  { itemId: 'bread-bag', label: 'Bread bag', material: 'soft_plastic' },
  { itemId: 'bubble-wrap', label: 'Bubble wrap', material: 'soft_plastic' },
  { itemId: 'food-scraps', label: 'Food scraps', material: 'organics', aliases: ['leftovers', 'leftover food', 'food waste', 'food'] },
  { itemId: 'leftover-pizza', label: 'Leftover pizza', material: 'organics', aliases: ['pizza', 'pizza slice', 'pizza crust'] },
  { itemId: 'sandwich', label: 'Sandwich', material: 'organics', aliases: ['burger', 'sushi', 'kebab'] },
  { itemId: 'bread', label: 'Bread', material: 'organics', aliases: ['toast', 'bread crust', 'bun'] },
  { itemId: 'rice-pasta', label: 'Rice or pasta', material: 'organics', aliases: ['rice', 'pasta', 'noodles'] },
  { itemId: 'meat-bones', label: 'Meat and bones', material: 'organics', aliases: ['meat', 'bones', 'chicken bones', 'chicken', 'fish', 'steak'] },
  { itemId: 'eggshells', label: 'Eggshells', material: 'organics', aliases: ['egg shell', 'eggs'] },
  { itemId: 'fruit', label: 'Fruit', material: 'organics', aliases: ['apple', 'banana', 'orange', 'grapes', 'vegetables', 'salad'] },
  { itemId: 'snack-food', label: 'Snack food', material: 'organics', aliases: ['snack', 'biscuit', 'cookie', 'cake', 'lollies', 'candy', 'chocolate'] },
  { itemId: 'fruit-peel', label: 'Fruit peel', material: 'organics', aliases: ['banana peel', 'orange peel', 'apple core', 'vegetable scraps'] },
  { itemId: 'coffee-grounds', label: 'Coffee grounds', material: 'organics', aliases: ['tea bag', 'tea leaves'] },
  { itemId: 'garden-clippings', label: 'Garden clippings', material: 'garden', aliases: ['grass clippings', 'grass', 'leaves', 'garden waste', 'prunings', 'weeds', 'branches', 'twigs', 'flowers'] },
  { itemId: 'phone', label: 'Phone', material: 'ewaste', aliases: ['mobile phone', 'mobile', 'smartphone', 'iphone'] },
  { itemId: 'laptop', label: 'Laptop', material: 'ewaste', aliases: ['computer', 'tablet', 'ipad'] },
  { itemId: 'charger', label: 'Charger', material: 'ewaste', aliases: ['cable', 'usb cable', 'phone charger'] },
  { itemId: 'headphones', label: 'Headphones', material: 'ewaste', aliases: ['earbuds', 'earphones'] },
  { itemId: 'computer-mouse', label: 'Computer mouse', material: 'ewaste', aliases: ['mouse', 'wireless mouse'] },
  { itemId: 'keyboard', label: 'Keyboard', material: 'ewaste', aliases: ['computer keyboard'] },
  { itemId: 'remote-control', label: 'Remote control', material: 'ewaste', aliases: ['tv remote', 'remote'] },
  { itemId: 'light-globe', label: 'Light globe', material: 'ewaste', aliases: ['light bulb', 'globe', 'led bulb', 'fluorescent tube'] },
  { itemId: 'printer-cartridge', label: 'Printer cartridge', material: 'ewaste', aliases: ['ink cartridge', 'toner cartridge', 'toner'] },
  { itemId: 'aa-battery', label: 'AA battery', material: 'battery', aliases: ['battery', 'batteries', 'aaa battery', 'lithium battery', 'button battery'] },
  // Lithium inside: a fire risk in any kerbside bin.
  { itemId: 'power-bank', label: 'Power bank', material: 'battery', aliases: ['portable charger', 'battery pack'] },
  { itemId: 'vape', label: 'Vape', material: 'battery', aliases: ['e-cigarette', 'e cig', 'disposable vape'] },
  { itemId: 'clothing', label: 'Clothing', material: 'textiles', aliases: ['clothes', 't-shirt', 'tshirt', 'jeans', 'shoes', 'towel', 'sheets'] },
  { itemId: 'coffee-cup', label: 'Coffee cup', material: 'coffee_cup', aliases: ['takeaway cup', 'takeaway coffee cup', 'disposable cup', 'paper cup'] },
  { itemId: 'polystyrene', label: 'Polystyrene', material: 'general_waste', aliases: ['styrofoam', 'foam box', 'foam tray'] },
  { itemId: 'nappy', label: 'Nappy', material: 'general_waste', aliases: ['diaper'] },
  { itemId: 'tissue', label: 'Tissue', material: 'general_waste', aliases: ['napkin', 'serviette', 'paper towel'] },
  { itemId: 'broken-glass', label: 'Broken glass', material: 'general_waste', aliases: ['drinking glass', 'mirror', 'broken mirror', 'ceramic', 'ceramic mug', 'mug', 'plate', 'bowl', 'crockery', 'pyrex'] },
  // Too small or mixed for the sorter; they jam it or fall through.
  { itemId: 'bottle-cap', label: 'Bottle cap', material: 'general_waste', aliases: ['bottle lid', 'bottle top', 'plastic lid'] },
  { itemId: 'plastic-cutlery', label: 'Plastic cutlery', material: 'general_waste', aliases: ['plastic fork', 'plastic spoon', 'plastic knife', 'cutlery'] },
  { itemId: 'straw', label: 'Straw', material: 'general_waste', aliases: ['plastic straw'] },
  { itemId: 'toothbrush', label: 'Toothbrush', material: 'general_waste', aliases: ['tooth brush'] },
  { itemId: 'toothpaste-tube', label: 'Toothpaste tube', material: 'general_waste', aliases: ['toothpaste'] },
  { itemId: 'face-mask', label: 'Face mask', material: 'general_waste', aliases: ['mask', 'surgical mask'] },
  { itemId: 'receipt', label: 'Receipt', material: 'general_waste', aliases: ['docket', 'till receipt'] },
  { itemId: 'chip-tube', label: 'Chip tube', material: 'general_waste', aliases: ['pringles', 'pringles can'] },
  { itemId: 'plant-pot', label: 'Plant pot', material: 'general_waste', aliases: ['plastic plant pot', 'seedling pot'] },
];

const ITEM_MATERIALS: Record<string, MaterialKey> = Object.fromEntries(ITEM_CATALOG.map((i) => [i.itemId, i.material]));

const KEYWORDS: Array<[RegExp, MaterialKey]> = [
  // Specific before broad: "paper coffee cup" is a cup, "plastic shopping bag" a bag.
  [/\b(coffee|takeaway|paper) cup\b/i, 'coffee_cup'],
  [/\b(bag|wrapper|packet|cling|film|bubble wrap)\b/i, 'soft_plastic'],
  [/\b(glass|jar|wine bottle|beer bottle)\b/i, 'glass'],
  [/\b((milk|juice|long[- ]life) carton|tetra ?pak|juice box)\b/i, 'carton'],
  [/\b(cardboard|carton|box)\b/i, 'cardboard'],
  [/\b(paper|newspaper|magazine|envelope)\b/i, 'paper'],
  [/\b(aluminium|aluminum|alu|soft ?drink can|beer can)\b/i, 'aluminium'],
  [/\b(steel|tin|food can)\b/i, 'steel'],
  [/\b(plastic|pet|hdpe|bottle|tub|container)\b/i, 'hard_plastic'],
  [/\b(grass|leaves|garden|prunings?|weeds|branch(es)?|twigs?)\b/i, 'garden'],
  [/\b(food|scraps|peel|compost|leftovers?|pizza|bread|fruit|vegetables?|meat|bones)\b/i, 'organics'],
  [/\b(battery|batteries|power ?bank|vape)\b/i, 'battery'],
  [/\b(phone|laptop|charger|cable|tv|electronic|e-?waste|mouse|keyboard|remote|cartridge|bulb)\b/i, 'ewaste'],
  [/\b(clothes|clothing|shirt|textile|fabric)\b/i, 'textiles'],
  [/\b(polystyrene|nappy)\b/i, 'general_waste'],
];

/** Display names, shared by the disposal screen, route screen and hub details. */
export const MATERIAL_LABELS: Record<MaterialKey, string> = {
  glass: 'Glass', cardboard: 'Cardboard', paper: 'Paper', aluminium: 'Aluminium', steel: 'Steel',
  hard_plastic: 'Hard plastic', soft_plastic: 'Soft plastic', organics: 'Food scraps', garden: 'Garden waste',
  carton: 'Carton', coffee_cup: 'Coffee cup', ewaste: 'E-waste', battery: 'Battery', textiles: 'Textiles',
  general_waste: 'General waste', uncategorized: 'Uncategorized',
};

/**
 * Maps an identified item to the material its disposal rule is keyed by.
 * Known itemIds resolve exactly, then a confident catalog match on the label
 * (typo-tolerant: "glassjar", "plastik bottle"), then broad keywords. Specific
 * names go first so "paper towel" isn't caught by "paper", or "pizza" by
 * "pizza box". Falls back to 'uncategorized' when we genuinely can't tell.
 */
export function resolveMaterial(item: Pick<IdentifiedItem, 'itemId' | 'label'>): MaterialKey {
  const exact = ITEM_MATERIALS[item.itemId];
  if (exact) return exact;
  const match = bestItemMatch(item.label);
  if (match) return match.material;
  for (const [pattern, material] of KEYWORDS) {
    if (pattern.test(item.label)) return material;
  }
  return 'uncategorized';
}
