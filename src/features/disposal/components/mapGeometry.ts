import { haversineKm, type Coordinates } from '@features/geolocation';

export interface MapPin {
  id: string;
  coordinate: Coordinates;
  label: string;
}

/** Shared by the native map and the OpenStreetMap one, so both frame the same things. */
export interface MapCanvasProps {
  pins: MapPin[];
  here: Coordinates | null;
  /** FR-71: walking route line, drawn under the pins. */
  path?: Coordinates[];
  selectedId?: string | null;
  onPinPress?: (id: string) => void;
  /** Space (px) covered by overlays at the top/bottom; fitting keeps pins clear of it. */
  insets?: { top: number; bottom: number };
}

/** A one-off "move the camera here" request from the recenter button; a new seq repeats it. */
export interface MapFocus {
  coordinate: Coordinates;
  seq: number;
  /** Steps out from street level (0): each step shows ~3× the width. */
  zoomOut?: number;
}

/** How much wider each recenter zoom-out step shows. */
export const ZOOM_OUT_FACTOR = 3;

/** What MapCanvas hands the map it picked. */
export type MapImplProps = MapCanvasProps & { focus: MapFocus | null };

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Stable default for `path`, so effects keyed on it don't re-run every render. */
export const NO_PATH: Coordinates[] = [];

const NEARBY_KM = 25;
const MIN_SPAN_DEG = 0.02;

// What the map should zoom to. The user's dot only counts when they're near the
// pins: with a manual zone override (GPS in Melbourne, browsing Sydney hubs)
// including it would zoom out to half the country.
export function pointsToFit(pins: MapPin[], here: Coordinates | null, path: Coordinates[] = []): Coordinates[] {
  const points = [...pins.map((p) => p.coordinate), ...path];
  if (here && (points.length === 0 || points.some((p) => haversineKm(here, p) < NEARBY_KM))) {
    points.push(here);
  }
  return points;
}

// Refit when what's on the map changes, not every time the user's dot moves
// a few metres (that would yank the map away while they're panning).
export function fitKeyFor(pins: MapPin[], path: Coordinates[], here: Coordinates | null): string {
  return `${pins.map((p) => p.id).join(',')}|${path.length}|${here ? 1 : 0}`;
}

/** Pin graphics stand ~42px above the point they mark. */
const PIN_HEADROOM = 44;

// Screen padding for a fit: clear of the overlays, with room for pins at the top edge.
export function fitPadding(insets: { top: number; bottom: number }) {
  return { top: insets.top + 16 + PIN_HEADROOM, right: 40, bottom: insets.bottom + 16, left: 40 };
}

// Bounding box with a minimum span, so a single pin still sits in a sensible neighbourhood.
export function boundsFor(points: Coordinates[]): Bounds | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  if (maxLat - minLat < MIN_SPAN_DEG) {
    const c = (maxLat + minLat) / 2;
    minLat = c - MIN_SPAN_DEG / 2;
    maxLat = c + MIN_SPAN_DEG / 2;
  }
  if (maxLng - minLng < MIN_SPAN_DEG) {
    const c = (maxLng + minLng) / 2;
    minLng = c - MIN_SPAN_DEG / 2;
    maxLng = c + MIN_SPAN_DEG / 2;
  }
  return { minLat, maxLat, minLng, maxLng };
}
