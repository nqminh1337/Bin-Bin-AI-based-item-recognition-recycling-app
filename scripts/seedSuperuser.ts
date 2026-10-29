// Creates a Super user
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, query, where, writeBatch, type WriteBatch } from 'firebase/firestore';
import { DIET_GOAL, MATERIAL_ORDER } from '../src/features/gamification/pet/constants';
import { computeLevel, createInitialPet } from '../src/features/gamification/pet/petLogic';
import { POINT_REASONS, POINT_VALUES } from '../src/features/gamification/points/constants';
import { calculateStreakProgress } from '../src/features/gamification/points/streakLogic';
import type { PointsLedgerEntry } from '../src/features/gamification/points/types';
import { FIRESTORE_COLLECTIONS } from '../src/utils/constants';

const DISPLAY_NAME = 'superuser100x';
const EMAIL = process.env.SUPERUSER_EMAIL ?? 'superuser100x@binbin.test';
const ZONE_ID = process.env.SUPERUSER_ZONE ?? 'nsw-inner-west';
const DAYS = 30; // covers every streak milestone (3, 7, 14, 30)
const SORTS_PER_DAY = MATERIAL_ORDER.length; // one of each material a day
const BATCH_SIZE = 400;

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;


function sortTimes(now: Date): Array<{ date: string; times: Date[] }> {
  return Array.from({ length: DAYS }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (DAYS - 1 - i));
    day.setHours(12, 0, 0, 0);
    let start = day.getTime();
    if (start + SORTS_PER_DAY * 10_000 > now.getTime()) start = now.getTime() - (SORTS_PER_DAY + 1) * 10_000;
    return { date: localDate(day), times: Array.from({ length: SORTS_PER_DAY }, (_, k) => new Date(start + k * 10_000)) };
  });
}

async function signIn(): Promise<{ uid: string; password: string | null }> {
  const given = process.env.SUPERUSER_PASSWORD;
  const password = given ?? `Binbin-${randomBytes(3).toString('hex')}-${randomBytes(3).toString('hex')}`;
  try {
    const { user } = await createUserWithEmailAndPassword(auth, EMAIL, password);
    return { uid: user.uid, password: given ? null : password };
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/email-already-in-use') throw e;
    if (!given) throw new Error(`${EMAIL} already exists. Re-run with SUPERUSER_PASSWORD set to its password.`);
    const { user } = await signInWithEmailAndPassword(auth, EMAIL, given);
    return { uid: user.uid, password: null };
  }
}

async function commitInBatches(writes: Array<(batch: WriteBatch) => void>) {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const write of writes.slice(i, i + BATCH_SIZE)) write(batch);
    await batch.commit();
  }
}

async function main() {
  const { uid, password: generated } = await signIn();
  await updateProfile(auth.currentUser!, { displayName: DISPLAY_NAME });
  const now = new Date();

  const existing = await getDocs(query(collection(db, FIRESTORE_COLLECTIONS.POINTS_LEDGER), where('userId', '==', uid)));
  const have = new Set(existing.docs.map((d) => d.id));
  const ledger: PointsLedgerEntry[] = existing.docs.map((d) => d.data() as PointsLedgerEntry);

  const writes: Array<(batch: WriteBatch) => void> = [];
  for (const { date, times } of sortTimes(now)) {
    times.forEach((at, k) => {
      const entryId = `superuser-${date}-${k}`;
      if (have.has(entryId)) return; // ledger entries can't be updated, only created
      const entry: PointsLedgerEntry = {
        entryId, userId: uid, points: POINT_VALUES.CORRECT_SORT, reason: POINT_REASONS.CORRECT_SORT, createdAt: at.toISOString(),
      };
      ledger.push(entry);
      writes.push((b) => b.set(doc(db, FIRESTORE_COLLECTIONS.POINTS_LEDGER, entryId), entry));
      // FR-57: the weekly recap's per-material breakdown reads these.
      const eventId = `superuser-feed-${date}-${k}`;
      writes.push((b) =>
        b.set(doc(db, FIRESTORE_COLLECTIONS.PET_FEED_EVENTS, eventId), {
          eventId, userId: uid, material: MATERIAL_ORDER[k], quantity: 1, createdAt: at.toISOString(),
        })
      );
    });
  }

  const pet = createInitialPet(uid);
  for (const m of MATERIAL_ORDER) pet.diet[m] = { fed: DIET_GOAL, goal: DIET_GOAL };
  pet.unlockedSkinIds = [...MATERIAL_ORDER];
  pet.equippedSkinId = 'glass';
  pet.lastFedAt = now.getTime();
  pet.level = computeLevel(pet);

  const points = ledger.reduce((sum, e) => sum + e.points, 0);
  writes.push((b) =>
    b.set(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), { userId: uid, email: EMAIL, displayName: DISPLAY_NAME, createdAt: now.toISOString() }, { merge: true })
  );
  writes.push((b) => b.set(doc(db, FIRESTORE_COLLECTIONS.PET_STATE, uid), pet));
  writes.push((b) =>
    b.set(doc(db, FIRESTORE_COLLECTIONS.LEADERBOARD, uid), { userId: uid, displayName: DISPLAY_NAME, points, rank: 0, zoneId: ZONE_ID })
  );

  await commitInBatches(writes);

  const { streak } = calculateStreakProgress(ledger, now.getTime());
  const sorts = ledger.filter((e) => e.reason === POINT_REASONS.CORRECT_SORT).length;
  console.log(`Seeded ${DISPLAY_NAME} (${EMAIL}, uid ${uid}) in project ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}:`);
  console.log(`  ${sorts} sorts, ${points} points, streak ${streak.currentStreakDays} days (longest ${streak.longestStreakDays})`);
  console.log(`  pet level ${pet.level}, ${pet.unlockedSkinIds.length}/${MATERIAL_ORDER.length} skins, every diet meter full`);
  if (generated) console.log(`  Password (save it, it isn't stored anywhere): ${generated}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
