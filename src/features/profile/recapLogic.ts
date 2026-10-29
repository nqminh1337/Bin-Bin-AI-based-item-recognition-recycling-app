import { MATERIAL_ORDER, type MaterialType, type PetFeedEvent } from '@features/gamification/pet';
import { MATERIAL_LABEL } from '@features/gamification/pet';

const DAY_MS = 86_400_000;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** 'SEP 14 – SEP 20' from a 'YYYY-MM-DD' week-start date. */
export function formatWeekRange(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const endLabel = sameMonth ? `${end.getDate()}` : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}`;
}

/** 'YYYY-MM-DD' in local time, matching PointsService.getWeeklyActivity's date format. */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The most recent fully elapsed Mon-Sun week, as a [start, end) range (FR-56: "a 7-day period has elapsed"). */
export function getLastCompletedWeek(now: number = Date.now()): { start: Date; end: Date; weekStartDate: string } {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday - 7); // start of last Mon-Sun week
  const start = d;
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end, weekStartDate: toDateString(start) };
}

/** FR-57: count of events per material within [start, end). */
export function breakdownByMaterial(
  events: PetFeedEvent[],
  start: Date,
  end: Date,
): Partial<Record<MaterialType, number>> {
  const out: Partial<Record<MaterialType, number>> = {};
  for (const e of events) {
    const t = new Date(e.createdAt).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    out[e.material] = (out[e.material] ?? 0) + e.quantity;
  }
  return out;
}

export function topMaterial(byMaterial: Partial<Record<MaterialType, number>>): string | null {
  const top = MATERIAL_ORDER.filter((m) => (byMaterial[m] ?? 0) > 0).sort(
    (a, b) => (byMaterial[b] ?? 0) - (byMaterial[a] ?? 0),
  )[0];
  return top ? MATERIAL_LABEL[top] : null;
}

/** Positive = moved up the leaderboard (lower rank number). null if either rank is unknown. */
export function rankChange(rankStart: number | null, rankEnd: number | null): number | null {
  if (rankStart === null || rankEnd === null) return null;
  return rankStart - rankEnd;
}
