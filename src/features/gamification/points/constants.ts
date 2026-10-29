// Fixed point values used by the points feature.
export const POINT_VALUES = {
  CORRECT_SORT: 10,
} as const;

// Standard reasons stored in the points ledger.
export const POINT_REASONS = {
  CORRECT_SORT: "correct_sort",
} as const;

// FR-39: consecutive-day milestones (not point-balance thresholds).
export const STREAK_MILESTONE_DAYS = [3, 7, 14, 30] as const;
