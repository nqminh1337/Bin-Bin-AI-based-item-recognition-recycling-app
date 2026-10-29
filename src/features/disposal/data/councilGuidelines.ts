import type { BinService, CouncilGuideline } from '../types';

/**
 * Kerbside systems and official guideline links for all 33 Greater Sydney
 * councils. Source of truth for `npm run seed:disposal` (collection
 * `councilGuidelines`), and bundled so the guidelines sheet works offline.
 *
 * Compiled 27 Oct 2026 from:
 *  - NSW EPA FOGO services council list (updated 13 Oct 2026): `organics`
 *    epa.nsw.gov.au/Your-environment/Recycling-and-reuse/business-government-recycling/Food-organics-and-garden-organics/nsw-fogo-services
 *  - Planet Ark Recycling Near You kerbside pages: which councils run a
 *    separate paper bin (recyclingnearyou.com.au/kerbside/<Council>NSW)
 *  - Each council's own waste pages: lid colours, frequencies, tips, links
 *
 * Frequencies are for a standard house; units often differ. `frequency: null`
 * means no council source confirmed it. Collection days are set per street,
 * so we link to each council's lookup (`binDayUrl`) instead of storing them.
 */

export const LID = {
  red: '#C0392B',
  yellow: '#F2C300',
  green: '#2E8B57',
  blue: '#1F5FAD',
  maroon: '#7A1F3D',
} as const;

type Freq = BinService['frequency'];
const general = (frequency: Freq, note?: string): BinService => ({ stream: 'general', label: 'Red general waste bin', lidColor: LID.red, frequency, note });
const recycling = (frequency: Freq, note?: string): BinService => ({ stream: 'recycling', label: 'Yellow recycling bin', lidColor: LID.yellow, frequency, note });
const containers = (frequency: Freq, note?: string): BinService => ({ stream: 'recycling', label: 'Yellow containers bin', lidColor: LID.yellow, frequency, note });
const paper = (frequency: Freq, note?: string): BinService => ({ stream: 'paper', label: 'Blue paper & cardboard bin', lidColor: LID.blue, frequency, note });
const garden = (frequency: Freq, note?: string): BinService => ({ stream: 'garden', label: 'Green garden bin', lidColor: LID.green, frequency, note });
const fogo = (frequency: Freq, note?: string): BinService => ({ stream: 'fogo', label: 'Green FOGO bin', lidColor: LID.green, frequency, note });
const food = (frequency: Freq, note?: string): BinService => ({ stream: 'food', label: 'Maroon food scraps bin', lidColor: LID.maroon, frequency, note });

const EPA_FOGO = 'https://www.epa.nsw.gov.au/Your-environment/Recycling-and-reuse/business-government-recycling/Food-organics-and-garden-organics/nsw-fogo-services';
const rny = (slug: string) => `https://recyclingnearyou.com.au/kerbside/${slug}NSW`;
const CHECKED = '2026-10-27';

export const COUNCIL_GUIDELINES: CouncilGuideline[] = [
  {
    zoneId: 'nsw-sydney', councilName: 'City of Sydney', organics: 'fogo', paperBin: 'yellow',
    organicsNote: 'Food scraps go in a separate maroon-lid bin, being rolled out to every household by 2030. The green bin is garden only.',
    bins: [general('weekly'), recycling('weekly'), garden('fortnightly'), food('weekly', 'Houses weekly; apartment buildings twice a week')],
    tips: [
      'Take lids off and empty out food before recycling.',
      'Soft plastics aren’t accepted in any City of Sydney service, so they go in the red bin.',
      'Library and community-centre recycling stations take batteries, small electronics, blister packs and light globes.',
    ],
    guideUrl: 'https://www.cityofsydney.nsw.gov.au/waste-recycling-services',
    binDayUrl: 'https://www.cityofsydney.nsw.gov.au/waste-recycling-services/find-my-bin-collection-day',
    sources: [EPA_FOGO, rny('Sydney'), 'https://www.cityofsydney.nsw.gov.au/waste-recycling-services/drop-off-household-items-for-recycling'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-inner-west', councilName: 'Inner West Council', organics: 'fogo', paperBin: 'yellow',
    organicsNote: 'All food scraps, including meat, dairy and bones, go in the green FOGO bin.',
    bins: [general('fortnightly'), recycling('fortnightly'), fogo('weekly', 'Some FOGO bins still have burgundy lids; they’re being swapped to green')],
    tips: [
      'Soft plastics go in the red bin, not the yellow bin.',
      'Book a free HomeCycle pickup for soft plastics and other tricky items, up to three a year.',
      'Woolworths takes soft plastics in store at Balmain, Ashfield Mall, Ashfield North and Marrickville Metro.',
    ],
    guideUrl: 'https://www.innerwest.nsw.gov.au/waste-and-recycling',
    binDayUrl: 'https://www.innerwest.nsw.gov.au/live/waste-and-recycling/waste-calendar',
    sources: [EPA_FOGO, rny('InnerWest'), 'https://www.innerwest.nsw.gov.au/live/waste-and-recycling/household-bins/recycling', 'https://www.innerwest.nsw.gov.au/about/news/media-releases/2025-media-releases/council-brings-soft-plastic-recycling-back-to-inner-west-supermarkets'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-randwick', councilName: 'Randwick City Council', organics: 'fogo', paperBin: 'yellow',
    organicsNote: 'Food scraps and garden clippings only. Paper towel, compostable packaging and pet waste go in the red bin.',
    bins: [general('fortnightly', 'Apartment buildings: weekly'), recycling('fortnightly'), fogo('weekly')],
    tips: ['Use certified compostable liners only; “biodegradable” bags contaminate FOGO.', 'Extra green and yellow bins are free; extra red bins cost more.'],
    guideUrl: 'https://www.randwick.nsw.gov.au/services/rubbish-and-recycling/household-rubbish',
    binDayUrl: 'https://www.randwick.nsw.gov.au/services/rubbish-and-recycling/household-rubbish/rubbish-collection-calendar',
    sources: [EPA_FOGO, rny('Randwick'), 'https://www.randwick.nsw.gov.au/services/rubbish-and-recycling/food-organics-and-garden-organics-fogo/fogo-faqs'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-waverley', councilName: 'Waverley Council', organics: 'fogo_planned', paperBin: 'blue',
    bins: [general('weekly'), containers('fortnightly'), paper('fortnightly'), garden('fortnightly')],
    tips: ['Paper and cardboard go in their own bin, separate from containers.', 'Book up to two “Your Call” clean-ups a year for bulky items.'],
    guideUrl: 'https://www.waverley.nsw.gov.au/residents/waste_and_recycling',
    binDayUrl: 'https://www.waverley.nsw.gov.au/residents/waste_and_recycling/bins_and_collection_days',
    sources: [EPA_FOGO, rny('Waverley'), 'https://www.waverley.nsw.gov.au/residents/waste_and_recycling/bins_and_collection_days'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-woollahra', councilName: 'Woollahra Municipal Council', organics: 'fogo', paperBin: 'yellow',
    bins: [general('weekly'), recycling(null), fogo('weekly', 'Collected on the same day as your red and yellow bins')],
    tips: ['The Monday zone (Paddington, West Woollahra, part of Edgecliff) uses green crates. Food scraps can’t go in a crate, so ask council for a 60L lidded bin.'],
    guideUrl: 'https://www.woollahra.nsw.gov.au/Services/Waste-and-Recycling',
    binDayUrl: 'https://www.woollahra.nsw.gov.au/Services/Waste-and-Recycling/Green-Bin-Organics-Collection',
    sources: [EPA_FOGO, rny('Woollahra'), 'https://www.woollahra.nsw.gov.au/Services/Waste-and-Recycling/Green-Bin-Organics-Collection'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-bayside', councilName: 'Bayside Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly')],
    tips: ['Food scraps go in the red bin; the green bin is garden only.', 'Units: garbage twice a week, recycling and garden weekly.', 'Bin days are in the Bayside Waste Services app.'],
    guideUrl: 'https://www.bayside.nsw.gov.au/services/waste-recycling',
    binDayUrl: 'https://www.bayside.nsw.gov.au/services/waste-recycling',
    sources: [EPA_FOGO, rny('Bayside'), 'https://www.bayside.nsw.gov.au/sites/default/files/2025-07/2025_Waste_Services_Guide.pdf'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-georges-river', councilName: 'Georges River Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Don’t bag your recycling. If you’re unsure, put it in the red bin.', 'Food scraps go in the red bin.'],
    guideUrl: 'https://www.georgesriver.nsw.gov.au/Services/Waste/A-Z-Recycling-Guide',
    binDayUrl: 'https://www.georgesriver.nsw.gov.au/Services/Waste/Bin-Services',
    sources: [EPA_FOGO, rny('GeorgesRiver'), 'https://www.georgesriver.nsw.gov.au/Services/Waste/Bin-Services'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-sutherland', councilName: 'Sutherland Shire Council', organics: 'fogo_planned', paperBin: 'yellow',
    organicsNote: 'FOGO starts 2 November 2026 for stage-one properties: food scraps go in the green bin, which becomes weekly. Units follow from late 2027.',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Weekly once FOGO starts')],
    tips: ['Put bins out before 4am on collection day.'],
    guideUrl: 'https://www.sutherlandshire.nsw.gov.au/living-here/waste-and-recycling/what-goes-in-my-bins',
    binDayUrl: 'https://www.sutherlandshire.nsw.gov.au/living-here/waste-and-recycling/bin-collection-day',
    sources: [EPA_FOGO, rny('Sutherland'), 'https://www.sutherlandshire.nsw.gov.au/living-here/waste-and-recycling/fogo-coming-soon'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-canterbury-bankstown', councilName: 'Canterbury-Bankstown Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Plastic bags and wrap go in the red bin.'],
    guideUrl: 'https://www.cbcity.nsw.gov.au/residents/waste-and-recycling/which-rubbish-goes-where',
    binDayUrl: 'https://www.cbcity.nsw.gov.au/residents/bin-collection-days',
    sources: [EPA_FOGO, rny('CanterburyBankstown'), 'https://www.cbcity.nsw.gov.au/residents/bin-collection-day/my-household-bin'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-burwood', councilName: 'Burwood Council', organics: 'garden_only', paperBin: 'yellow',
    organicsNote: 'A FOGO trial runs in one area: there the green bin is weekly and the red and yellow bins fortnightly.',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly')],
    tips: ['Outside the trial area, food scraps go in the red bin.'],
    guideUrl: 'https://www.burwood.nsw.gov.au/For-Residents/Bins-and-Waste',
    binDayUrl: 'https://www.burwood.nsw.gov.au/For-Residents/Bins-and-Waste/Waste-Collection-Days',
    sources: [EPA_FOGO, rny('Burwood'), 'https://www.burwood.nsw.gov.au/For-Residents/Bins-and-Waste/Waste-Collection-Days'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-strathfield', councilName: 'Strathfield Municipal Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Put bins out the night before and bring them in within 12 hours.'],
    guideUrl: 'https://www.strathfield.nsw.gov.au/Live/Waste/Residential-Bin-Collection',
    binDayUrl: 'https://www.strathfield.nsw.gov.au/Live/Waste/Residential-Bin-Collection',
    sources: [EPA_FOGO, rny('Strathfield'), 'https://www.strathfield.nsw.gov.au/Live/Waste/Residential-Bin-Collection'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-canada-bay', councilName: 'City of Canada Bay', organics: 'fogo_planned', paperBin: 'yellow',
    organicsNote: 'FOGO from July 2027; the green bin then becomes weekly.',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Optional; alternate weeks to recycling')],
    tips: ['Food scraps go in the red bin until FOGO starts.'],
    guideUrl: 'https://www.canadabay.nsw.gov.au/residents/waste-and-recycling/my-bins/what-goes-my-bin',
    binDayUrl: 'https://www.canadabay.nsw.gov.au/residents/waste-and-recycling/my-bins/my-bin-collection',
    sources: [EPA_FOGO, rny('CanadaBay'), 'https://www.canadabay.nsw.gov.au/residents/waste-and-recycling/my-bins/my-bin-collection'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-cumberland', councilName: 'Cumberland City Council', organics: 'fogo_planned', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Units and apartments: call council on 8757 9000 for your bin days.'],
    guideUrl: 'https://www.cumberland.nsw.gov.au/bins-waste-and-recycling',
    binDayUrl: 'https://www.cumberland.nsw.gov.au/when-my-bin-collection-day',
    sources: [EPA_FOGO, rny('Cumberland'), 'https://www.cumberland.nsw.gov.au/when-my-bin-collection-day'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-parramatta', councilName: 'City of Parramatta', organics: 'fogo', paperBin: 'yellow',
    bins: [general('weekly', '80L bin for houses'), recycling('fortnightly'), fogo('weekly')],
    tips: ['Unit buildings with more than 30 dwellings are joining FOGO in stages.', 'Bins over 70kg may not be collected.'],
    guideUrl: 'https://www.cityofparramatta.nsw.gov.au/residents/bins-waste-and-recycling/your-bins',
    binDayUrl: 'https://www.cityofparramatta.nsw.gov.au/residents/bins-waste-and-recycling/bin-collection-days',
    sources: [EPA_FOGO, rny('Parramatta'), 'https://www.cityofparramatta.nsw.gov.au/residents/bins-waste-and-recycling/bin-collection-days'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-ryde', councilName: 'City of Ryde', organics: 'fogo_planned', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly')],
    tips: ['Plastic meat trays, takeaway containers, fruit punnets and aluminium trays go in yellow.', 'Five free booked clean-ups a year.'],
    guideUrl: 'https://www.ryde.nsw.gov.au/Environment-and-Waste/Waste-and-Recycling',
    binDayUrl: 'https://www.ryde.nsw.gov.au/Environment-and-Waste/Waste-and-Recycling/Household-Waste-Services/Waste-Calendar',
    sources: [EPA_FOGO, rny('Ryde'), 'https://www.ryde.nsw.gov.au/Environment-and-Waste/Waste-and-Recycling/Household-Waste-Services/Waste-Calendar'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-hunters-hill', councilName: 'Hunters Hill Council', organics: 'fogo', paperBin: 'blue',
    organicsNote: 'Weekly FOGO started in July 2026.',
    bins: [general('weekly'), containers('fortnightly'), paper('fortnightly'), fogo('weekly')],
    tips: ['Paper and cardboard go in the blue bin; containers in the yellow bin.'],
    guideUrl: 'https://www.huntershill.nsw.gov.au/Waste',
    binDayUrl: 'https://www.huntershill.nsw.gov.au/Waste',
    sources: [EPA_FOGO, rny('HuntersHill'), 'https://www.huntershill.nsw.gov.au/Waste/FOGO'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-lane-cove', councilName: 'Lane Cove Council', organics: 'fogo', paperBin: 'blue',
    organicsNote: 'Stand-alone houses put food scraps in a maroon-lid food bin, collected weekly since 16 March 2026. Townhouses and units can opt in from February 2027.',
    bins: [general(null), containers('fortnightly', 'Units: weekly'), paper('fortnightly', 'Units: weekly'), garden('fortnightly', 'Goes out with your yellow or blue bin'), food('weekly')],
    tips: ['Paper and cardboard go in the blue bin; containers in the yellow bin.'],
    guideUrl: 'https://www.lanecove.nsw.gov.au/Services/Waste-and-Recycling',
    binDayUrl: 'https://www.lanecove.nsw.gov.au/Services/Waste-and-Recycling/Waste-Collection-Calendar',
    sources: [EPA_FOGO, rny('LaneCove'), 'https://www.lanecove.nsw.gov.au/Services/Waste-and-Recycling/Food-Waste'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-north-sydney', councilName: 'North Sydney Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('weekly'), garden('fortnightly', 'Booked pick-up, every second Monday')],
    tips: ['Book garden waste pick-ups by 4pm Sunday on 1300 799 019.'],
    guideUrl: 'https://www.northsydney.nsw.gov.au/waste-recycling/household-waste-information',
    binDayUrl: 'https://www.northsydney.nsw.gov.au/homepage/95/check-your-bin-collection-day',
    sources: [EPA_FOGO, rny('NorthSydney'), 'https://www.northsydney.nsw.gov.au/waste-recycling/household-waste-information'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-mosman', councilName: 'Mosman Municipal Council', organics: 'garden_only', paperBin: 'blue',
    bins: [general(null), containers(null, 'Council runs a weekly recycling collection; check the calendar for which bin goes out'), paper(null), garden(null)],
    tips: ['Lids over 5cm can be recycled if they go in separately from the container. Smaller plastic lids go in the red bin.', 'Milk and juice cartons go in the yellow bin, not the blue one.'],
    guideUrl: 'https://mosman.nsw.gov.au/residents/waste-and-recycling/a-z-waste-disposal',
    binDayUrl: 'https://mosman.nsw.gov.au/residents/waste-and-recycling/collection-dates',
    sources: [EPA_FOGO, rny('Mosman'), 'https://mosman.nsw.gov.au/residents/waste-and-recycling/recycling'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-willoughby', councilName: 'Willoughby City Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('weekly'), garden('weekly', 'Called the vegetation bin')],
    tips: ['Bins must be under 80kg with the lid fully closed.', 'Three free bulky clean-ups a year.'],
    guideUrl: 'https://www.willoughby.nsw.gov.au/Residents/Waste-and-recycling',
    binDayUrl: 'https://www.willoughby.nsw.gov.au/Residents/Waste-and-recycling/Household-bin-services/Waste-and-street-sweeping-services',
    sources: [EPA_FOGO, rny('Willoughby'), 'https://www.willoughby.nsw.gov.au/Residents/Waste-and-recycling/Household-bin-services'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-ku-ring-gai', councilName: 'Ku-ring-gai Council', organics: 'garden_only', paperBin: 'blue',
    bins: [general('weekly'), containers('fortnightly', 'Same day as the blue bin'), paper('fortnightly'), garden('weekly')],
    tips: ['Plastic bags and polystyrene go in neither recycling bin, even with a recycling symbol.'],
    guideUrl: 'https://www.krg.nsw.gov.au/Community/Waste-and-recycling/Reduce-reuse-recycle/Recycling-in-Ku-ring-gai',
    binDayUrl: 'https://www.krg.nsw.gov.au/collection',
    sources: [EPA_FOGO, rny('Kuringgai'), 'https://www.krg.nsw.gov.au/Community/Waste-and-recycling/Your-waste-service/Waste-services-for-houses'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-hornsby', councilName: 'Hornsby Shire Council', organics: 'fogo_planned', paperBin: 'yellow',
    bins: [general('weekly', '140L bin'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Take lids off plastic containers before recycling.', 'Missed bin? Waste Hotline 13 70 30.'],
    guideUrl: 'https://www.hornsby.nsw.gov.au/Property/Waste-and-recycling/Recycling',
    binDayUrl: 'https://www.hornsby.nsw.gov.au/Property/Waste-and-recycling/Your-weekly-collection/What-waste-and-recycling-services-do-I-receive',
    sources: [EPA_FOGO, rny('Hornsby'), 'https://www.hornsby.nsw.gov.au/__data/assets/pdf_file/0010/255277/HSC6479-Common-Recycling-Questions-DL.pdf'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-northern-beaches', councilName: 'Northern Beaches Council', organics: 'garden_only', paperBin: 'blue',
    bins: [general(null), containers(null), paper(null), garden(null)],
    tips: ['Containers go in yellow, paper and cardboard in blue.', 'There’s no food organics service yet, so food scraps go in the red bin.'],
    guideUrl: 'https://www.northernbeaches.nsw.gov.au/services/rubbish-and-recycling/bin-guide',
    binDayUrl: 'https://www.northernbeaches.nsw.gov.au/services/rubbish-and-recycling/bins/bin-collection-days',
    sources: [EPA_FOGO, rny('NorthernBeaches'), 'https://www.northernbeaches.nsw.gov.au/services/rubbish-and-recycling/bins/bin-it-right/bin-it-blue'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-the-hills', councilName: 'The Hills Shire Council', organics: 'fogo_planned', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Collections continue on public holidays.', 'Unit complexes: search the complex’s address, not your unit.'],
    guideUrl: 'https://www.thehills.nsw.gov.au/Residents/Waste-Recycling/What-can-I-put-into-my-bins',
    binDayUrl: 'https://www.thehills.nsw.gov.au/Residents/Waste-Recycling/When-is-my-bin-day/Check-which-bin-to-put-out-and-when',
    sources: [EPA_FOGO, 'https://www.thehills.nsw.gov.au/Residents/Waste-Recycling/When-is-my-bin-day/Your-Waste-Recycling-Calendar'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-blacktown', councilName: 'Blacktown City Council', organics: 'fogo', paperBin: 'yellow',
    organicsNote: 'Weekly food and garden service since June 2025; households can’t opt out.',
    bins: [general('weekly'), recycling('fortnightly'), fogo('weekly', 'Lid colour not confirmed from a council source')],
    tips: ['A wide range of rigid plastics go in yellow, including takeaway containers and small plant pots.', 'The B informed app sends bin-day reminders.'],
    guideUrl: 'https://www.blacktown.nsw.gov.au/Services/Waste-services-and-collection',
    binDayUrl: 'https://www.blacktown.nsw.gov.au/Services/Waste-services-and-collection/Bin-collection-days',
    sources: [EPA_FOGO, rny('Blacktown'), 'https://www.blacktown.nsw.gov.au/Services/Waste-services-and-collection/Commence-a-new-waste-service-Landing-Page'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-penrith', councilName: 'Penrith City Council', organics: 'fogo', paperBin: 'yellow',
    bins: [general('fortnightly', 'Most homes; a weekly red-bin option exists'), recycling(null), fogo('weekly')],
    tips: ['85% of homes chose a fortnightly red bin with weekly FOGO.'],
    guideUrl: 'https://www.penrithcity.nsw.gov.au/waste-environment/waste',
    binDayUrl: 'https://www.penrithcity.nsw.gov.au/waste-environment/waste',
    sources: [EPA_FOGO, rny('Penrith'), 'https://www.penrithcity.nsw.gov.au/waste-environment/waste/choosing-your-3-bin-service'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-fairfield', councilName: 'Fairfield City Council', organics: 'fogo', paperBin: 'yellow',
    organicsNote: 'FOGO started 3 June 2024 for houses, duplexes and townhouses. The green FOGO bin is fortnightly here, not weekly.',
    bins: [general('weekly'), recycling('fortnightly'), fogo('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Only council-supplied compostable liners can go in the green bin.', 'Units keep a two-bin service for now.'],
    guideUrl: 'https://www.fairfieldcity.nsw.gov.au/Services/Waste-and-Recycling/Recycling-Bin-Collection',
    binDayUrl: 'https://www.fairfieldcity.nsw.gov.au/Services/Waste-and-Recycling/Recycling-Bin-Collection',
    sources: [EPA_FOGO, rny('Fairfield'), 'https://www.fairfieldcity.nsw.gov.au/Services/Waste-Services/FOGO-like-a-Pro'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-liverpool', councilName: 'Liverpool City Council', organics: 'fogo', paperBin: 'yellow',
    organicsNote: 'FOGO is for houses and rural properties; multi-unit dwellings keep their existing service.',
    bins: [general(null), recycling(null), fogo('weekly')],
    tips: ['Pet waste goes in the red bin, not FOGO.', 'Don’t use bin liners in the yellow bin.'],
    guideUrl: 'https://www.liverpool.nsw.gov.au/services/waste-and-recycling/Kerbside-Bins',
    binDayUrl: 'https://www.liverpool.nsw.gov.au/services/waste-and-recycling',
    sources: [EPA_FOGO, rny('Liverpool'), 'https://www.liverpool.nsw.gov.au/services/waste-and-recycling/food-organics-garden-organics/fogo-faq'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-camden', councilName: 'Camden Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly', 'Choice of 80L, 120L or 240L'), recycling('weekly'), garden('weekly', 'Urban residential areas')],
    tips: ['Food scraps go in the red bin.'],
    guideUrl: 'https://www.camden.nsw.gov.au/waste/residential-waste-bin-services',
    binDayUrl: 'https://www.camden.nsw.gov.au/waste',
    sources: [EPA_FOGO, rny('Camden'), 'https://www.camden.nsw.gov.au/waste/residential-waste-bin-services'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-campbelltown', councilName: 'Campbelltown City Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Take lids and caps off glass and give it a quick rinse.', 'Bins out by 6am, ideally the night before.'],
    guideUrl: 'https://www.campbelltown.nsw.gov.au/Services-and-Facilities/Waste-and-Recycling',
    binDayUrl: 'https://www.campbelltown.nsw.gov.au/Services-and-Facilities/Waste-and-Recycling',
    sources: [EPA_FOGO, rny('Campbelltown'), 'https://www.campbelltown.nsw.gov.au/Services-and-Facilities/Waste-and-Recycling/FAQs'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-wollondilly', councilName: 'Wollondilly Shire Council', organics: 'garden_only', paperBin: 'yellow',
    organicsNote: 'No FOGO yet; council plans to start it with its next waste contract, around 2029.',
    bins: [general(null), recycling(null), garden('fortnightly')],
    tips: ['Food scraps go in the red bin.'],
    guideUrl: 'https://www.wollondilly.nsw.gov.au/waste-services/red-yellow-and-green-bins',
    binDayUrl: 'https://www.wollondilly.nsw.gov.au/waste-services/bin-days-and-calendar',
    sources: [EPA_FOGO, rny('Wollondilly'), 'https://www.wollondilly.nsw.gov.au/waste-services/fogo'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-blue-mountains', councilName: 'Blue Mountains City Council', organics: 'fogo_planned', paperBin: 'yellow',
    organicsNote: 'FOGO from July 2027; the green bin then becomes weekly.',
    bins: [general('weekly', '140L bin'), recycling('fortnightly'), garden('fortnightly', 'Alternate weeks to recycling')],
    tips: ['Each week: red bin plus either yellow or green.'],
    guideUrl: 'https://www.bmcc.nsw.gov.au/bin-collection-service',
    binDayUrl: 'https://www.bmcc.nsw.gov.au/waste',
    sources: [EPA_FOGO, rny('BlueMountains'), 'https://www.bmcc.nsw.gov.au/green-organics-bin'],
    checkedAt: CHECKED,
  },
  {
    zoneId: 'nsw-hawkesbury', councilName: 'Hawkesbury City Council', organics: 'garden_only', paperBin: 'yellow',
    bins: [general('weekly', 'Fortnightly in selected areas'), recycling('fortnightly'), garden('fortnightly', 'Selected urban areas only')],
    tips: ['Extra household recycling can be dropped off free at the Waste Management Facility, 1 The Driftway, South Windsor (8am–4pm daily).'],
    guideUrl: 'https://www.hawkesbury.nsw.gov.au/for-residents/waste-and-recycling/household-bins',
    binDayUrl: 'https://data.hawkesbury.nsw.gov.au/pages/waste-dashboard/',
    sources: [EPA_FOGO, rny('Hawkesbury'), 'https://www.hawkesbury.nsw.gov.au/for-residents/waste-and-recycling/household-bins'],
    checkedAt: CHECKED,
  },
];

const BY_ZONE = new Map(COUNCIL_GUIDELINES.map((g) => [g.zoneId, g]));

export function getCouncilGuideline(zoneId: string): CouncilGuideline | null {
  return BY_ZONE.get(zoneId) ?? null;
}
