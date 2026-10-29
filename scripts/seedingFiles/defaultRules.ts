import type { DisposalRule, MaterialKey } from '../../src/features/disposal/types';
import { COUNCIL_GUIDELINES, LID } from '../../src/features/disposal/data/councilGuidelines';

/**
 * Baseline kerbside rules that hold across most Australian councils
 * (zoneId 'default'), plus council-specific overrides generated from
 * COUNCIL_GUIDELINES. Lookup order in DisposalService is zone-specific
 * first, then default.
 *
 * Source of truth for `npm run seed:disposal`.
 */
const rule = (
  zoneId: string,
  material: MaterialKey,
  r: Omit<DisposalRule, 'ruleId' | 'zoneId' | 'material'>
): DisposalRule => ({ ruleId: `${zoneId}__${material}`, zoneId, material, ...r });

export const DEFAULT_RULES: DisposalRule[] = [
  rule('default', 'glass', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: '#F2C300',
    reason: 'Glass bottles and jars are sorted and remelted into new glass. Lids are a different material and jam the sorter.',
    prepSteps: ['Empty and rinse, no soap needed', 'Remove the lid (metal lids go in loose)', 'Keep it whole, don’t crush'],
  }),
  rule('default', 'cardboard', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: '#F2C300',
    reason: 'Clean cardboard is pulped into new packaging. Grease and food soak into the fibres and contaminate the whole bale.',
    prepSteps: ['Remove tape, staples and plastic windows', 'Tear off any greasy or food-soaked sections (those go in general waste)', 'Flatten it'],
  }),
  rule('default', 'paper', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: '#F2C300',
    reason: 'Paper is one of the most valuable kerbside streams and is recycled up to seven times.',
    prepSteps: ['Keep it dry', 'No shredded paper loose, it falls through the sorter (bag it or compost it)'],
  }),
  rule('default', 'aluminium', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: '#F2C300',
    reason: 'Aluminium is infinitely recyclable and saves 95% of the energy of making new metal.',
    prepSteps: ['Empty it', 'Leave it uncrushed so the eddy-current sorter can catch it', 'Don’t put cans inside other cans'],
  }),
  rule('default', 'steel', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: '#F2C300',
    reason: 'Steel is pulled out by magnets at the sorting facility and remelted.',
    prepSteps: ['Empty and rinse', 'Push sharp lids inside the can and pinch it closed'],
  }),
  rule('default', 'hard_plastic', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: '#F2C300',
    reason: 'Rigid bottles and containers (codes 1, 2 and 5) are sorted by type and turned into new products.',
    prepSteps: ['Empty and rinse', 'Lids on is fine, they stay with the bottle', 'Don’t bag it, loose items only'],
  }),
  rule('default', 'soft_plastic', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Red general waste bin', binColor: '#C0392B',
    reason: 'Soft plastics wrap around the sorting machinery and shut the line down. Most councils have no kerbside soft-plastic collection since REDcycle paused.',
    prepSteps: ['Check for a local soft-plastics drop-off first', 'Otherwise place in general waste'],
  }),
  // Most Sydney councils (22 of 33) still have a garden-only green bin, so the
  // baseline sends food to landfill; FOGO councils override it below.
  rule('default', 'organics', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Red general waste bin', binColor: LID.red,
    reason: 'This council’s green bin takes garden waste only, so food scraps go to landfill for now. Every NSW council must offer food organics collection by 1 July 2030.',
    prepSteps: ['Put food scraps in the red general waste bin, or a home compost or worm farm', 'Wrap meat and fish scraps to keep smells down'],
  }),
  rule('default', 'garden', {
    kerbsideAccepted: true, category: 'compost', binLabel: 'Green garden bin', binColor: LID.green,
    reason: 'Garden clippings are shredded and composted into mulch and soil conditioner.',
    prepSteps: ['Leaves, grass, prunings and small branches only', 'No plastic bags, soil, rocks or treated timber', 'Make sure the lid closes'],
  }),
  rule('default', 'carton', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: LID.yellow,
    reason: 'Milk and juice cartons are paperboard lined with plastic (and foil, for long-life ones). Most councils sort them with containers.',
    prepSteps: ['Empty it and give it a quick rinse', 'Put it in loose, not inside another item'],
  }),
  rule('default', 'coffee_cup', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Red general waste bin', binColor: LID.red,
    reason: 'Takeaway cups are paper with a plastic lining that most recycling facilities can’t separate.',
    prepSteps: ['Empty it', 'Put the cup and lid in the red general waste bin'],
  }),
  rule('default', 'ewaste', {
    kerbsideAccepted: false, category: 'ewaste', binLabel: 'E-waste drop-off', binColor: '#555555',
    reason: 'Electronics contain lithium batteries and heavy metals. They cause fires in trucks and are banned from landfill in most states.',
    prepSteps: ['Wipe or factory-reset any personal data', 'Remove loose batteries if you can', 'Take to a council or retailer e-waste point'],
  }),
  rule('default', 'battery', {
    kerbsideAccepted: false, category: 'hazardous', binLabel: 'Battery drop-off (B-cycle)', binColor: '#555555',
    reason: 'Batteries start fires in bins and trucks. Never put them in any kerbside bin.',
    prepSteps: ['Tape the terminals of lithium and 9V batteries', 'Drop at a supermarket or council B-cycle bin'],
  }),
  rule('default', 'textiles', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Charity bin or general waste', binColor: '#C0392B',
    reason: 'Textiles jam sorting machinery. Wearable clothing should go to charity; damaged textiles go in general waste.',
    prepSteps: ['Wearable? Donate it', 'Damaged? Red general waste bin'],
  }),
  rule('default', 'general_waste', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Red general waste bin', binColor: '#C0392B',
    reason: 'Items made of mixed or lined materials can’t be separated for recycling.',
    prepSteps: ['Place in general waste'],
  }),
  rule('default', 'uncategorized', {
    kerbsideAccepted: true, category: 'landfill', binLabel: 'Red general waste bin', binColor: '#C0392B',
    reason: 'We couldn’t confidently identify what this is made of, so general waste is the safe default.',
    prepSteps: ['If you know the material, check your council’s A-Z guide for a more specific bin'],
  }),

];

// ── Council overrides, generated from COUNCIL_GUIDELINES ──────────────────
/** The default rule for a material, minus its ids, to copy into an override. */
function baseOf(material: MaterialKey): Omit<DisposalRule, 'ruleId' | 'zoneId' | 'material'> {
  const { ruleId: _ruleId, zoneId: _zoneId, material: _material, ...base } = DEFAULT_RULES.find((r) => r.material === material)!;
  return base;
}

/** FOGO councils: food goes in the organics bin (a separate maroon bin in some). */
const fogoRules = COUNCIL_GUIDELINES.filter((g) => g.organics === 'fogo').map((g) => {
  const foodBin = g.bins.find((b) => b.stream === 'food') ?? g.bins.find((b) => b.stream === 'fogo')!;
  return rule(g.zoneId, 'organics', {
    kerbsideAccepted: true, category: 'compost', binLabel: foodBin.label, binColor: foodBin.lidColor,
    reason: ['Food scraps are composted instead of rotting into methane in landfill.', g.organicsNote].filter(Boolean).join(' '),
    prepSteps: foodBin.stream === 'food'
      ? ['Put food scraps in the maroon food scraps bin', 'Only use certified compostable liners, never plastic bags']
      : ['Food scraps go in the green bin with your garden clippings', 'Only use certified compostable liners, never plastic bags'],
  });
});

/** Garden waste shares the FOGO bin where there is one; North Sydney collects it by booking. */
const gardenRules = [
  ...COUNCIL_GUIDELINES.filter((g) => g.bins.some((b) => b.stream === 'fogo')).map((g) =>
    rule(g.zoneId, 'garden', { ...baseOf('garden'), binLabel: 'Green FOGO bin', reason: 'Garden clippings go in the FOGO bin with food scraps and are composted together.' })
  ),
  rule('nsw-north-sydney', 'garden', {
    ...baseOf('garden'),
    binLabel: 'Booked garden waste pick-up',
    prepSteps: ['Book a pick-up by 4pm Sunday on 1300 799 019', 'Leaves, grass, prunings and small branches only'],
  }),
];

/** Councils with a separate blue-lid bin for paper and cardboard. */
const blueBinRules = COUNCIL_GUIDELINES.filter((g) => g.paperBin === 'blue').flatMap((g) =>
  (['paper', 'cardboard'] as const).map((material) =>
    rule(g.zoneId, material, { ...baseOf(material), binLabel: 'Blue paper & cardboard bin', binColor: LID.blue })
  )
);

// Council lists that put fresh milk cartons in the paper bin rather than with containers
// (Recycling Near You, checked 27 Oct 2026). Mosman and Northern Beaches use yellow.
const cartonRules = ['nsw-waverley', 'nsw-hunters-hill', 'nsw-lane-cove', 'nsw-ku-ring-gai'].map((zoneId) =>
  rule(zoneId, 'carton', { ...baseOf('carton'), binLabel: 'Blue paper & cardboard bin', binColor: LID.blue })
);

const coffeeCupRules = [
  rule('nsw-willoughby', 'coffee_cup', {
    kerbsideAccepted: true, category: 'recycle', binLabel: 'Yellow recycling bin', binColor: LID.yellow,
    reason: 'Willoughby’s recycling facility can process plastic-lined paper cups, which most councils can’t.',
    prepSteps: ['Empty it and give it a quick rinse', 'Put it in loose, not stacked inside other cups'],
  }),
];

/** Councils that ask for lids off plastic containers (small lids jam the sorter). */
const lidsOffRules = ['nsw-sydney', 'nsw-hornsby', 'nsw-mosman'].map((zoneId) =>
  rule(zoneId, 'hard_plastic', {
    ...baseOf('hard_plastic'),
    prepSteps: ['Empty and rinse', 'Take the lid off: small plastic lids go in the red bin', 'Don’t bag it, loose items only'],
  })
);

const softPlasticRules = [
  rule('nsw-inner-west', 'soft_plastic', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Red general waste bin', binColor: LID.red,
    reason: 'Inner West Council asks for soft plastics to stay out of the yellow bin, because they wrap around the sorting machinery. It runs free doorstep pickups instead.',
    prepSteps: ['Never put soft plastics in the yellow bin', 'Book a free HomeCycle pickup (up to three a year)', 'Or drop them at an Inner West Woolworths soft-plastics bin', 'Otherwise, red general waste bin'],
  }),
  rule('nsw-sydney', 'soft_plastic', {
    kerbsideAccepted: false, category: 'landfill', binLabel: 'Red general waste bin', binColor: LID.red,
    reason: 'City of Sydney no longer accepts soft plastics in any of its recycling services.',
    prepSteps: ['Place in the red general waste bin', 'Check supermarkets for a soft-plastics drop-off'],
  }),
];

DEFAULT_RULES.push(...fogoRules, ...gardenRules, ...blueBinRules, ...cartonRules, ...coffeeCupRules, ...lidsOffRules, ...softPlasticRules);
