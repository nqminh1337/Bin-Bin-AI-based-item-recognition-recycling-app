import type { DropOffKind } from '../types';

/** FR-70: what each kind of drop-off point is and takes, for the hub details sheet. */
export const DROP_OFF_KINDS: Record<DropOffKind, { label: string; blurb: string }> = {
  return_and_earn: {
    label: 'Return and Earn',
    blurb: '10c back for each eligible drink container: most cans, bottles and cartons from 150ml to 3L. Bring them empty, uncrushed and with the label on.',
  },
  community_recycling_centre: {
    label: 'Community Recycling Centre',
    blurb: 'Free drop-off for household problem waste: paint, gas bottles, batteries, fluoro globes, oils, smoke detectors and fire extinguishers.',
  },
  council_recycling_station: {
    label: 'Council recycling station',
    blurb: 'Household batteries, light bulbs, empty blister packs and small electronics that fit through a 10cm hole.',
  },
  battery_drop_off: {
    label: 'B-cycle battery drop-off',
    blurb: 'Household batteries: AA, AAA, C, D, 9V and button cells. Tape the terminals before dropping them off.',
  },
};
