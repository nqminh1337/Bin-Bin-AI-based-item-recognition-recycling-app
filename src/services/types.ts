/**
 * The users/{uid} account record, created once at sign-up. Distinct from
 * UserStats (@features/profile), which is derived/aggregated from activity
 * rather than being its own source of truth.
 */
export interface UserProfile {
  userId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}
