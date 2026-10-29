import { haversineKm, type Coordinates } from '@features/geolocation';
import type { ManeuverIcon, RouteProgress, RouteStep, WalkingRoute } from './types';

// FR-71/72: walking directions from the FOSSGIS-hosted OSRM foot router
// (OpenStreetMap data, free, no API key). It's a fair-use community server:
// fine for the demo, swap ROUTER_URL for a self-hosted OSRM before going live.
const ROUTER_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
const TIMEOUT_MS = 10_000;
const ARRIVED_M = 25;
const M_PER_DEG_LAT = 111_320;

/** Typical walking pace (~4.7 km/h), for ETAs when there's no route to take one from. */
export const WALKING_SPEED_MPS = 1.3;

export class WalkingRouteService {
  static async getRoute(from: Coordinates, to: Coordinates, destinationName: string): Promise<WalkingRoute> {
    const url =
      `${ROUTER_URL}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      '?overview=false&steps=true&geometries=geojson';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Walking router responded ${res.status}`);
      const body = (await res.json()) as OsrmResponse;
      const route = body.code === 'Ok' ? body.routes?.[0] : undefined;
      if (!route || !route.legs.some((leg) => leg.steps.length > 0)) {
        throw new Error(`No walking route found (${body.code})`);
      }
      return toWalkingRoute(route, destinationName);
    } finally {
      clearTimeout(timer);
    }
  }
}

// FR-72: snap the user onto the route and work out what's left.
export function routeProgress(route: WalkingRoute, here: Coordinates): RouteProgress {
  const { path, cumulativeM, steps } = route;
  const totalM = cumulativeM[cumulativeM.length - 1] ?? 0;
  const { travelledM, offRouteM } = snapToPath(path, cumulativeM, here);
  const remainingM = Math.max(0, totalM - travelledM);
  const speed = route.durationS > 0 ? route.distanceM / route.durationS : WALKING_SPEED_MPS;

  // First maneuver still ahead. The final 'arrive' step sits at the end of the
  // path, so it qualifies until the user gets there.
  let nextStepIndex = steps.findIndex((s) => cumulativeM[s.pathIndex] > travelledM + 1);
  if (nextStepIndex === -1) nextStepIndex = steps.length - 1;
  const distanceToNextM = Math.max(0, cumulativeM[steps[nextStepIndex].pathIndex] - travelledM);

  const end = path[path.length - 1];
  const arrived =
    (end !== undefined && haversineKm(here, end) * 1000 < ARRIVED_M) ||
    (remainingM < ARRIVED_M && offRouteM < ARRIVED_M * 2);

  return { remainingM, etaS: remainingM / speed, offRouteM, nextStepIndex, distanceToNextM, arrived };
}

// Nearest point on the route line to the user: how far along it they are, and
// how far off it. Flat-earth metres around the user are plenty accurate at walking scale.
function snapToPath(path: Coordinates[], cumulativeM: number[], here: Coordinates) {
  if (path.length === 0) return { travelledM: 0, offRouteM: Infinity };
  if (path.length === 1) return { travelledM: 0, offRouteM: haversineKm(here, path[0]) * 1000 };

  const mPerDegLng = M_PER_DEG_LAT * Math.cos((here.latitude * Math.PI) / 180);
  const toXY = (p: Coordinates) => ({
    x: (p.longitude - here.longitude) * mPerDegLng,
    y: (p.latitude - here.latitude) * M_PER_DEG_LAT,
  });

  let best = { travelledM: 0, offRouteM: Infinity };
  let a = toXY(path[0]);
  for (let i = 0; i < path.length - 1; i++) {
    const b = toXY(path[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    // Project the user (the origin) onto segment a→b, clamped to the segment.
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / len2));
    const d = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (d < best.offRouteM) {
      best = { offRouteM: d, travelledM: cumulativeM[i] + t * (cumulativeM[i + 1] - cumulativeM[i]) };
    }
    a = b;
  }
  return best;
}

// ── OSRM response → WalkingRoute ─────────────────────────────────────────

interface OsrmManeuver {
  type: string;
  modifier?: string;
  bearing_after: number;
  exit?: number;
}

interface OsrmStep {
  distance: number;
  name: string;
  geometry: { coordinates: [number, number][] };
  maneuver: OsrmManeuver;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  legs: { steps: OsrmStep[] }[];
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

function toWalkingRoute(route: OsrmRoute, destinationName: string): WalkingRoute {
  const path: Coordinates[] = [];
  const steps: RouteStep[] = [];

  for (const step of route.legs.flatMap((leg) => leg.steps)) {
    const coords = step.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
    // Each step's line starts where the previous one ended; don't duplicate the joint.
    const last = path[path.length - 1];
    const first = coords[0];
    const joins = !!last && !!first && last.latitude === first.latitude && last.longitude === first.longitude;
    steps.push({
      instruction: describe(step, destinationName),
      icon: iconFor(step.maneuver),
      distanceM: step.distance,
      pathIndex: joins ? path.length - 1 : path.length,
    });
    path.push(...(joins ? coords.slice(1) : coords));
  }

  const cumulativeM = path.map(() => 0);
  for (let i = 1; i < path.length; i++) {
    cumulativeM[i] = cumulativeM[i - 1] + haversineKm(path[i - 1], path[i]) * 1000;
  }
  // A step with an empty line would point one past the end.
  const lastIndex = Math.max(0, path.length - 1);
  for (const step of steps) step.pathIndex = Math.min(step.pathIndex, lastIndex);

  return { distanceM: route.distance, durationS: route.duration, path, cumulativeM, steps };
}

const CARDINALS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

// OSRM gives maneuver types, not sentences. Footpaths are often unnamed, so
// every phrase has to read naturally without a street name.
function describe(step: OsrmStep, destinationName: string): string {
  const { type, modifier, bearing_after, exit } = step.maneuver;
  const name = step.name.trim();
  const onto = name ? ` onto ${name}` : '';

  switch (type) {
    case 'depart':
      return `Head ${CARDINALS[Math.round(bearing_after / 45) % 8]}${name ? ` on ${name}` : ''}`;
    case 'arrive':
      return `Arrive at ${destinationName}`;
    case 'roundabout':
    case 'rotary':
      return exit ? `At the roundabout, take exit ${exit}${onto}` : `Go through the roundabout${onto}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Leave the roundabout${onto}`;
    case 'fork':
      if (modifier?.includes('left')) return `Keep left${onto}`;
      if (modifier?.includes('right')) return `Keep right${onto}`;
      break; // straight through a fork reads like any other "continue"
    case 'new name':
      return name ? `Continue onto ${name}` : 'Continue straight';
  }

  switch (modifier) {
    case 'uturn':
      return `Turn around${onto}`;
    case 'slight left':
      return `Bear left${onto}`;
    case 'slight right':
      return `Bear right${onto}`;
    case 'left':
    case 'right':
    case 'sharp left':
    case 'sharp right':
      return `Turn ${modifier}${onto}`;
    default:
      return name ? `Continue on ${name}` : 'Continue straight';
  }
}

function iconFor({ type, modifier }: OsrmManeuver): ManeuverIcon {
  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';
  if (type.includes('roundabout') || type.includes('rotary')) return 'roundabout';
  if (modifier === 'uturn') return 'uturn';
  if (modifier?.includes('left')) return 'left';
  if (modifier?.includes('right')) return 'right';
  return 'straight';
}
