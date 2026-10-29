/**
 * FR-54: the 12-slot achievement catalog. Each entry's `isUnlocked` is a
 * pure predicate over stats already available elsewhere in the app
 * (PointsService, PetService), so there's no separate "achievements"
 * ledger to keep in sync.
 */
import type { PetState } from '@features/gamification/pet';
import { MATERIAL_ORDER, computeLevel } from '@features/gamification/pet';
import type { Streak, WeeklyActivityDay } from '@features/gamification/points';

export interface AchievementContext {
  itemsSorted: number;
  totalPoints: number;
  streak: Streak;
  weeklyActivity: WeeklyActivityDay[];
  pet: PetState;
}

export interface AchievementDef {
  achievementId: string;
  label: string;
  description: string;
  isUnlocked: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { achievementId: 'first-sort', label: 'First sort', description: 'Sort your first item', isUnlocked: (c) => c.itemsSorted >= 1 },
  { achievementId: 'ten-items', label: 'Getting started', description: 'Sort 10 items', isUnlocked: (c) => c.itemsSorted >= 10 },
  { achievementId: 'fifty-items', label: 'Bin there', description: 'Sort 50 items', isUnlocked: (c) => c.itemsSorted >= 50 },
  { achievementId: 'hundred-items', label: 'Century', description: 'Sort 100 items', isUnlocked: (c) => c.itemsSorted >= 100 },
  { achievementId: 'streak-seven', label: '7-day streak', description: 'Sort something for 7 days in a row', isUnlocked: (c) => c.streak.longestStreakDays >= 7 },
  { achievementId: 'glass-master', label: 'Glass master', description: 'Feed Bin Bin 250 glass items', isUnlocked: (c) => c.pet.diet.glass.fed >= 250 },
  { achievementId: 'recycle-hero', label: 'Recycle hero', description: 'Earn 2,500 points', isUnlocked: (c) => c.totalPoints >= 2500 },
  { achievementId: 'perfect-week', label: 'Perfect week', description: 'Sort every day for a week', isUnlocked: (c) => c.weeklyActivity.length === 7 && c.weeklyActivity.every((d) => d.completed) },
  { achievementId: 'bin-bin-friend', label: 'Bin Bin friend', description: 'Reach level 10', isUnlocked: (c) => computeLevel(c.pet) >= 10 },
  { achievementId: 'material-master', label: 'Material master', description: 'Fill every diet meter', isUnlocked: (c) => MATERIAL_ORDER.every((m) => c.pet.diet[m].fed >= c.pet.diet[m].goal) },
  { achievementId: 'eco-expert', label: 'Eco expert', description: 'Sort 250 items', isUnlocked: (c) => c.itemsSorted >= 250 },
  { achievementId: 'collector', label: 'Collector', description: 'Unlock three pet skins', isUnlocked: (c) => c.pet.unlockedSkinIds.length >= 3 },
];
