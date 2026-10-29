/**
 * Uploads the bundled Australian LGA dataset to the Firestore `zones`
 * collection (doc id = zoneId). Idempotent: re-running overwrites in place.
 *
 *   npm run seed:zones
 *
 * Reads Firebase config from .env. Runs in plain Node, so it talks to
 * Firestore directly rather than through the app's firebaseConfig (which
 * expects a React Native runtime).
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';
import { AUSTRALIAN_LGAS } from '../src/features/geolocation/data/australianLgas';
import { FIRESTORE_COLLECTIONS } from '../src/utils/constants';

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

async function main() {
  // Firestore batches cap at 500 writes; chunk defensively.
  const CHUNK = 400;
  for (let i = 0; i < AUSTRALIAN_LGAS.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const zone of AUSTRALIAN_LGAS.slice(i, i + CHUNK)) {
      batch.set(doc(db, FIRESTORE_COLLECTIONS.ZONES, zone.zoneId), zone);
    }
    await batch.commit();
  }
  console.log(`Seeded ${AUSTRALIAN_LGAS.length} zones into "${FIRESTORE_COLLECTIONS.ZONES}" (project ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
