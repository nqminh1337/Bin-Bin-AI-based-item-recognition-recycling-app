import type { MaterialType } from './types';

/** Every disposal material has a corresponding Bin Bin skin and diet meter. */
export const MATERIAL_ORDER: MaterialType[] = [
  'glass',
  'cardboard',
  'paper',
  'aluminium',
  'steel',
  'hard_plastic',
  'soft_plastic',
  'organics',
  'ewaste',
  'battery',
  'textiles',
  'general_waste',
  'uncategorized',
];

export const MATERIAL_LABEL: Record<MaterialType, string> = {
  glass: 'Glass',
  cardboard: 'Cardboard',
  paper: 'Paper',
  aluminium: 'Aluminium',
  steel: 'Steel',
  hard_plastic: 'Hard plastic',
  soft_plastic: 'Soft plastic',
  organics: 'Organics',
  ewaste: 'E-waste',
  battery: 'Batteries',
  textiles: 'Textiles',
  general_waste: 'General waste',
  uncategorized: 'Uncategorized',
};

/** Matches the wireframes: every material maxes out at 500 fed items. */
export const DIET_GOAL = 500;

export const LEVELS_PER_SKIN = 2;
export const ITEMS_PER_LEVEL = 300;

/** Bin Bin is shown as "hungry" after a day with no feed. */
export const HUNGRY_AFTER_MS = 24 * 60 * 60 * 1000;

export interface SkinInfo {
  id: MaterialType;
  name: string;
  blurb: string;
}

/** Keep skin metadata keyed by the same material ID used by disposal. */
export const SKINS: Record<MaterialType, SkinInfo> = {
  glass: {
    id: 'glass',
    name: 'Glass skin',
    blurb: 'See-through and shiny. Keep feeding glass to fill the meter.',
  },
  cardboard: {
    id: 'cardboard',
    name: 'Cardboard skin',
    blurb: 'A corrugated shell. Keep feeding cardboard to fill the meter.',
  },
  paper: {
    id: 'paper',
    name: 'Paper skin',
    blurb: 'A lightweight paper coat. Keep feeding paper to fill the meter.',
  },
  aluminium: {
    id: 'aluminium',
    name: 'Aluminium skin',
    blurb: 'A brushed-metal coat. Keep feeding aluminium to fill the meter.',
  },
  steel: {
    id: 'steel',
    name: 'Steel skin',
    blurb: 'A sturdy steel finish. Keep feeding steel items to fill the meter.',
  },
  hard_plastic: {
    id: 'hard_plastic',
    name: 'Hard plastic skin',
    blurb: 'A smooth, durable plastic coat. Keep feeding hard plastics to fill the meter.',
  },
  soft_plastic: {
    id: 'soft_plastic',
    name: 'Soft plastic skin',
    blurb: 'Squishy and translucent. Keep feeding soft plastics to fill the meter.',
  },
  organics: {
    id: 'organics',
    name: 'Organics skin',
    blurb: 'A leafy, earthy look. Keep feeding organic waste to fill the meter.',
  },
  ewaste: {
    id: 'ewaste',
    name: 'E-waste skin',
    blurb: 'A tech-inspired finish. Keep feeding e-waste to fill the meter.',
  },
  battery: {
    id: 'battery',
    name: 'Battery skin',
    blurb: 'A charged-up look. Keep feeding batteries to fill the meter.',
  },
  textiles: {
    id: 'textiles',
    name: 'Textiles skin',
    blurb: 'A cosy fabric-inspired coat. Keep feeding textiles to fill the meter.',
  },
  general_waste: {
    id: 'general_waste',
    name: 'General waste skin',
    blurb: 'A mixed-material look. Keep sorting general waste to fill the meter.',
  },
  uncategorized: {
    id: 'uncategorized',
    name: 'Uncategorized skin',
    blurb: 'A plain, unmarked coat for items that don’t fit a known material yet.',
  },
};
