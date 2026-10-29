/**
 * Uploads disposal rules, council guidelines and drop-off locations to Firestore.
 * Each location doc also carries its council's name and guideline links.
 * Idempotent: doc ids are ruleId / locationId, so re-running overwrites.
 * Drop-off locations no longer in the dataset are deleted, so stale pins don't linger.
 *
 *   npm run seed:disposal
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDocs, getFirestore, writeBatch, type WriteBatch } from 'firebase/firestore';
import { COUNCIL_GUIDELINES, getCouncilGuideline } from '../src/features/disposal/data/councilGuidelines';
import { DEFAULT_RULES } from './seedingFiles/defaultRules';
import { DROP_OFF_LOCATIONS } from './seedingFiles/dropOffLocations';
import { FIRESTORE_COLLECTIONS } from '../src/utils/constants';

// Firestore rejects batches over 500 writes.
const BATCH_SIZE = 400;

const env: Record<string, string> = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const db = getFirestore(
  initializeApp({
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  })
);

async function commitInBatches(writes: Array<(batch: WriteBatch) => void>) {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const write of writes.slice(i, i + BATCH_SIZE)) write(batch);
    await batch.commit();
  }
}

async function main() {
  const writes: Array<(batch: WriteBatch) => void> = [];
  for (const rule of DEFAULT_RULES) {
    writes.push((b) => b.set(doc(db, FIRESTORE_COLLECTIONS.DISPOSAL_RULES, rule.ruleId), rule));
  }
  for (const guideline of COUNCIL_GUIDELINES) {
    // Firestore rejects undefined fields; optional ones are simply left off.
    const data = JSON.parse(JSON.stringify(guideline));
    writes.push((b) => b.set(doc(db, FIRESTORE_COLLECTIONS.COUNCIL_GUIDELINES, guideline.zoneId), data));
  }
  const unlinked = new Set<string>();
  for (const location of DROP_OFF_LOCATIONS) {
    const guideline = getCouncilGuideline(location.zoneId);
    if (!guideline) unlinked.add(location.zoneId);
    const linked = guideline
      ? { ...location, councilName: guideline.councilName, guideUrl: guideline.guideUrl, binDayUrl: guideline.binDayUrl }
      : location;
    const data = Object.fromEntries(Object.entries(linked).filter(([, v]) => v !== undefined));
    writes.push((b) => b.set(doc(db, FIRESTORE_COLLECTIONS.DROP_OFF_LOCATIONS, location.locationId), data));
  }

  const keep = new Set(DROP_OFF_LOCATIONS.map((l) => l.locationId));
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.DROP_OFF_LOCATIONS));
  const stale = existing.docs.filter((d) => !keep.has(d.id));
  for (const d of stale) writes.push((b) => b.delete(d.ref));

  await commitInBatches(writes);
  if (unlinked.size) console.warn(`No council guidelines for: ${[...unlinked].join(', ')}`);
  console.log(
    `Seeded ${DEFAULT_RULES.length} rules → "${FIRESTORE_COLLECTIONS.DISPOSAL_RULES}", ` +
      `${COUNCIL_GUIDELINES.length} guidelines → "${FIRESTORE_COLLECTIONS.COUNCIL_GUIDELINES}", ` +
      `${DROP_OFF_LOCATIONS.length} locations → "${FIRESTORE_COLLECTIONS.DROP_OFF_LOCATIONS}", ` +
      `removed ${stale.length} stale locations (project ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}).`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
