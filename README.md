# Bin Bin (COMP5216-2026-GP-28)

**Bin Bin** is a mobile app for iOS and Android that tells you how to dispose of an item according to your own council's rules. Scan or type an item, and Bin Bin works out your council from your location, then shows which bin it goes in and how to prepare it, or the nearest drop-off point if no bin will take it. Correct sorting earns points and feeds Bin Bin, a virtual pet, to keep the habit going. Ultimately, the app targets UN SDG 12 (responsible consumption and production). Bin Bin aims to make correct recycling easier and more engaging while promoting long-term behavioural change towards sustainable waste disposal.

> **New to Bin Bin?** The [User Guide](userguide/README.md) walks through
> signing up, checking your council, scanning an item and following its
> disposal instructions, with screenshots.

## Key features

- **Identify any item three ways.** Scan its barcode live (looked up on Open
  Food Facts), take a photo (Google Gemini reads the label text, then
  recognises the item itself if the text isn't enough), or type its name
  with suggestions. Every result shows a confidence level, and results under
  70% have to be rescanned or edited before they're used.
- **Automatic council detection.** GPS identifies your local government council, that will be
  remembered between sessions. You can switch at any time by searching for
  a council or suburb from the main page.
- **Council-specific disposal rules.** Displays instructions about which bin the item goes in, why, and
  the steps to prepare it, for all 33 Greater Sydney councils. For example,
  a glass jar keeps its metal lid on in Inner West but has it taken off in
  Parramatta. Where a council has no rule of its own, a general rule applies.
- **Council guidelines and sources.** Each council's bins, food-waste (FOGO)
  service and tips, with links to its official waste guide and bin-day
  lookup. Users can report a rule that looks wrong.
- **Drop-off points with walking directions.** Items that can't go in a
  kerbside bin, like batteries and e-waste, get the nearest drop-off point.
  "Show me the bin" gives in-app turn-by-turn walking directions with a live
  ETA, or hands off to Apple Maps or Google Maps. Items can be saved for
  later: a bag button on the Home map shows how many are waiting, and opens
  the list so you can reopen each route and confirm the drop-off.
- **Map of drop-off hubs.** The Home map shows 314 real drop-off points
  (Return and Earn, B-cycle battery bins, City of Sydney recycling stations
  and NSW EPA Community Recycling Centres), with the nearest hub, search, and
  each hub's hours and accepted materials.
- **Points and streaks.** Each correct sort earns 10 points. Drop-off items
  earn them only after you confirm the drop-off. A daily streak has
  milestones at 3, 7, 14 and 30 days.
- **Bin Bin, the virtual pet.** Every correct sort feeds Bin Bin that
  material. Filling a material's diet meter (500 items) unlocks its skin, out
  of 13, and the pet levels up as it eats.
- **Council leaderboard.** Ranks you against other users in your council.
- **Profile, achievements and weekly recap.** Totals, a 7-day activity strip,
  12 achievements, and a recap of last week with your rank change and what
  you fed Bin Bin.
- **Collection reminders.** Local notifications that remind you the evening
  before collection, which you can view and cancel.

## Known limitations

| Limitation | Workaround or next step |
|------------|-------------------------|
| Collection reminders are scheduled by hand from the Notifications screen. Bin days are set per street, so the app links to each council's bin-day lookup rather than storing schedules. | Next: load per-address collection schedules from council data and schedule reminders automatically. |
| Notifications are local only (no push server), and they don't work in Android Expo Go, because Expo removed the native modules they need from Expo Go on Android. | Use iOS Expo Go or a development build. Next: a push backend so rule updates reach every affected user. |
| Drop-off points cover 16 councils in and around the Sydney CBD. Hence, for some councils the app will display no listed drop-off point yet. | Next: extend the dataset from the same sources (Return and Earn, NSW EPA, B-cycle, council sites). |
| Councils outside Greater Sydney can be detected, but they only get the general rules and no council guidelines. | Next: add their rules and guidelines in the seed data. |
| Scanning needs internet: barcode lookup uses Open Food Facts and photo recognition uses Gemini. Products missing from Open Food Facts aren't found for barcode reading. | Take a photo or type the item instead. Matching an item to a material still works offline through a keyword matcher. |
| Hub cards show a "2× points" label for Community Recycling Centres, but every sort currently earns a flat 10 points. | Next: apply the multiplier when a drop-off is confirmed. |
| The leaderboard covers your council only; there are no friends or global rankings. | Next: a friends model in Firestore. |
| Google Maps can't authorise inside Expo Go on Android ([react-native-maps#5888](https://github.com/react-native-maps/react-native-maps/issues/5888)). | Android uses an OpenStreetMap map (MapLibre in a WebView) instead; iOS uses Apple Maps. |
| Walking routes come from a free community routing server (OSRM) with fair-use limits. | Next: self-host OSRM for production. |
| Saved-for-later items are stored on the phone, not the account, so they don't follow you to another phone and are shared by accounts on the same phone. | Next: store them in Firestore per user. |
| Rules and guidelines were compiled from council websites and the NSW EPA (checked October 2026) and can go out of date. The seeded data cannot autoupdate due to lack of public api's from the NSW government | Users can report a wrong rule from the disposal screen. Next: Collaborate with NSW government to get rules directly from councils, allowing for automated updated rule and guidelinedatasets. |

## Getting started

Tested with Node.js 22.23, npm 10.9 and Expo SDK 58.

**You need**

- Node.js 22 and npm 10 (check with `node -v` and `npm -v`)
- Git
- A phone with **Expo Go** from the App Store or Google Play, updated so it
  supports SDK 58. Scanning and GPS need a real phone; an emulator can only
  test typed items.
- The phone and computer on the same Wi-Fi, or the `--tunnel` option in step 5

**Steps**

1. Clone the repository and check out the submitted version:
   ```
   git clone https://github.sydney.edu.au/COMP5216-2026-S2/COMP5216-2026-GP-28.git
   cd COMP5216-2026-GP-28
   git checkout v2.0
   ```
2. Put the `.env` file in the repository root (see [Secrets](#secrets)).
3. Install dependencies: `npm install`
4. Start the dev server: `npm start`
5. Scan the QR code in the terminal: with the Camera app on iPhone, or from
   Expo Go on Android. If the phone can't reach the server (common on uni
   Wi-Fi), stop it and run `npx expo start --tunnel` instead.
6. When the app opens, allow location and camera access, then sign in with
   the [demo account](#demo-account-and-testing) or create a new one.

**If something goes wrong**

| Problem | Fix |
|---------|-----|
| "Firebase config is missing" on launch | `.env` isn't in the repository root, or the server started before it was added. Fix the location and run `npx expo start -c`. |
| The phone can't connect to the dev server | Run `npx expo start --tunnel`. |
| Scanning fails with a quota or rate-limit error | Switch to the backup Gemini key (see [Secrets](#secrets)). |
| The Notifications screen says they're unavailable | Expected in Expo Go on Android. Test notifications on an iPhone. |

## Secrets

The app needs one secret file, `.env`. It's submitted separately as
`bin-bin-secrets.zip`, which contains `secrets.env` and a copy of these
instructions (`Secrets-README.md`).

1. Unzip `bin-bin-secrets.zip`.
2. Move `secrets.env` into the repository root COMP5216-2026-GP-28/ (the folder with `package.json`).
3. Rename it back to `.env`. Finder hides files starting with a dot, so the
   Terminal is easiest: `mv secrets.env .env`
4. Start the app with `npm start`. Expo reads `.env` when the dev server
   starts, so if it was already running, restart it with `npx expo start -c`.

What `.env` contains and how the app uses it:

| Variable | Read in | Used for |
|----------|---------|----------|
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID` | `src/services/firebaseConfig.ts` | Connects to our Firebase project: Authentication (email/password sign-in) and Firestore (council zones, disposal rules, drop-off points, council guidelines, points, pet, leaderboard). The seed scripts in `scripts/` read the same values. |
| `EXPO_PUBLIC_GEMINI_API_KEY` | `src/features/scan/geminiClient.ts` | Google Gemini: reads packaging text (OCR), recognises items from photos, and matches item names to materials. |

**Backup Gemini key:** `.env` contains two Gemini keys. The first one is
active, and the second, under `# FallBack Key:`, is commented out as a
backup. If Gemini scanning doesn't work (for example, it fails with a quota
or rate-limit error), switch keys: comment out the current
`EXPO_PUBLIC_GEMINI_API_KEY` line, uncomment the backup one, then restart
with `npx expo start -c`.

If a variable is missing, the app stops at launch with an error naming it.
`.env.example` lists the same variables with empty values.

Our Firebase project already holds all the data, so you don't need to run
the seed scripts.

## Demo account and testing

| | |
|---|---|
| Email | `superuser100x@binbin.test` |
| Password | `password` |

The demo account has 30 days of sorting history in Inner West Council: all
13 pet skins unlocked, every diet meter full, achievements, a streak and a
weekly recap. A new account starts empty and a skin takes 500 items, so use
this account to see the pet and profile features. The streak and recap count
from the last day the history was seeded, so they can show 0 if that was
more than a day ago.

Features that depend on location or data:

| Feature | How to test |
|---------|-------------|
| Council detection | Allow location on first launch. Outside Greater Sydney, tap the council chip on the Map tab and search for a council, e.g. "Inner West". |
| Council-specific rules | With the council set to Inner West, tap the camera button, choose **Type it** and enter "glass jar": the lid goes back on. Tap **I'm somewhere else, change location**, pick City of Parramatta: the lid comes off. |
| Barcode scan | Switch to **Barcode** and scan a supermarket product. Products that aren't in Open Food Facts show "Barcode not found". |
| Photo scan | Switch to **Item** and take a photo. A label that names its material (glass, PET 1, HDPE) is read as text; otherwise Gemini recognises the item from the image. |
| Drop-off route | Set the council to City of Sydney and type "battery". Tap **Show me the bin** for the walking route, then **I dropped it off** to earn the points. |
| Points and pet | Tap **Got it** on a kerbside item. The points screen appears, and that material's diet meter on the Pet tab goes up. |
| Leaderboard | Set the council to Inner West to see the demo account on the Ranks tab. |
| Notifications | iPhone (Expo Go doesn't support them on Android). Profile → gear icon → Notifications → turn on, then **Schedule tomorrow's collection reminder**. It's set for 1 pm today, so after 1 pm it fires within a few seconds. |
| Saved for later | On a drop-off route, tap **Save for later · add to my stash**. The bag above the locate button on the Map tab now shows a count; tap it to see the list and reopen the route. |
| Reporting a rule | On any disposal screen, tap **Report an issue with this guidance**. |

## Services and backend

| Service | Used for | Setup |
|---------|----------|-------|
| Firebase Authentication | Email and password accounts | Enable the Email/Password provider |
| Cloud Firestore | All app data (collections below) | Create a database, deploy `firestore.rules` |
| Google Gemini API (`gemini-3.5-flash-lite`) | OCR, photo recognition, matching item names to materials | API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| Open Food Facts API | Barcode → product name | None, public API |
| OSRM foot router (`routing.openstreetmap.de`) | Walking routes | None |
| OpenFreeMap tiles with MapLibre | The map on Android | None |
| Apple Maps (`react-native-maps`) | The map on iOS | None |
| Expo Notifications | Local reminders | None; asks permission on the phone |

### Firestore collections

| Collection | Document ID | Fields | Written by |
|------------|-------------|--------|------------|
| `zones` | council id, e.g. `nsw-inner-west` | `zoneId`, `councilName`, `state` (strings), `suburbs` (string[]) | `seed:zones` |
| `disposalRules` | `{zoneId}__{material}`, e.g. `default__glass` | `ruleId`, `zoneId` (`default` or a council id), `material`, `category`, `binLabel`, `binColor` (strings), `kerbsideAccepted` (boolean), `reason` (string), `prepSteps` (string[]) | `seed:disposal` |
| `councilGuidelines` | council id | `zoneId`, `councilName`, `organics` (`fogo`, `fogo_planned` or `garden_only`), `paperBin` (`yellow` or `blue`), `bins` (array of `{stream, label, lidColor, frequency}`), `tips`, `sources` (string[]), `guideUrl`, `binDayUrl`, `checkedAt` (strings) | `seed:disposal` |
| `dropOffLocations` | location id | `locationId`, `zoneId`, `kind`, `name`, `address`, `hours` (strings), `latitude`, `longitude` (numbers), `acceptedMaterials` (string[]), optional `pointsMultiplier` (number) and `note` | `seed:disposal` |
| `users` | user uid | `userId`, `email`, `createdAt` (strings), `displayName` (string or null) | the app, at sign-up |
| `pointsLedger` | generated id | `entryId`, `userId`, `reason` (`correct_sort`), `createdAt` (strings), `points` (number) | the app, once per correct sort |
| `leaderboard` | user uid | `userId`, `displayName`, `zoneId` (strings), `points`, `rank` (numbers) | the app, from the Ranks tab |
| `petState` | user uid | `petId`, `userId` (strings), `level` (number), `equippedSkinId` (string or null), `unlockedSkinIds` (string[]), `diet` (map of material → `{fed, goal}`), `lastFedAt` (epoch ms or null) | the app |
| `petFeedEvents` | generated id | `eventId`, `userId`, `material`, `createdAt` (strings), `quantity` (number) | the app, once per feed |
| `profileWeeklySnapshots` | `{uid}_{weekStartDate}` | `userId`, `weekStartDate` (`YYYY-MM-DD`), `rank` (number or null) | the app, from the weekly recap |
| `guidanceReports` | generated id | `reportId`, `itemId`, `zoneId`, `note`, `createdAt` (strings), `userId`, `ruleId` (string or null) | the app, from "Report an issue" |

Dates are ISO 8601 strings. Materials are the 16 keys in
`src/features/disposal/types.ts` (`glass`, `hard_plastic`, `battery`, ...).
An example rule, `disposalRules/nsw-inner-west__glass`:

```json
{
  "ruleId": "nsw-inner-west__glass",
  "zoneId": "nsw-inner-west",
  "material": "glass",
  "kerbsideAccepted": true,
  "category": "recycle",
  "binLabel": "Yellow recycling bin",
  "binColor": "#F2C300",
  "reason": "Inner West Council asks for metal lids to be screwed back onto glass jars, so the sorting facility catches both the glass and the lid.",
  "prepSteps": ["Empty and rinse, no soap needed", "Screw the metal lid back on", "Put it in loose, never in a bag"]
}
```

The app asks for the council's rule for a material first, then falls back to
the `default` rule.

**Security rules** (`firestore.rules`):

- `zones`, `disposalRules`, `dropOffLocations`, `councilGuidelines`: anyone can read; the app can't write.
- `users`, `petState`, `profileWeeklySnapshots`: each user reads and writes only their own.
- `pointsLedger`, `petFeedEvents`: each user reads and creates only their own entries, and entries can't be edited or deleted.
- `leaderboard`: any signed-in user can read; each user writes only their own row.
- `guidanceReports`: create only, anonymous allowed; nobody can read them from the app.

**Indexes:** none needed. Every query filters by equality (`userId`,
`zoneId`, `material`) or by `array-contains` (`acceptedMaterials`), which
Firestore's automatic single-field indexes cover.

### Recreating the backend

1. Create a Firebase project and add a Web app. Copy its config into `.env`
   (variable names are in `.env.example`).
2. In Authentication, enable the Email/Password provider.
3. Create a Firestore database in test mode. The seed scripts write the
   reference data without signing in, which the final rules block.
4. Create a Gemini API key in Google AI Studio and add it to `.env`.
5. Seed the reference data: `npm run seed:zones`, then `npm run seed:disposal`.
6. Deploy the rules: `npx firebase-tools login`, then
   `npx firebase-tools deploy --only firestore:rules --project <your-project-id>`.
7. Optional: `npm run seed:superuser` creates the demo account with 30 days
   of history and prints its password.

## Architecture

Screens are in `app/`: Expo Router turns each file into a route. The logic
is in `src/features/`, one folder per feature, and screens use a feature
through its `index.ts`. Each feature keeps its data in Firestore or
AsyncStorage through its own service, so there's no global store.

```
app/
  _layout.tsx          root stack; shows sign-in until Firebase restores the session
  (tabs)/              Map (index), Ranks, Pet, Profile, and the centre camera button
  scan.tsx             camera: barcode and photo modes, manual entry
  disposal.tsx         the council's rule for an item, guidelines sheet, report button
  route-to-bin.tsx     walking directions to a drop-off point, drop-off confirmation
  points-awarded.tsx, skin-unlocked.tsx, weekly-recap.tsx
  stash.tsx            items saved for a later drop-off, opened from the bag on the map
  settings.tsx, notifications.tsx, sign-in.tsx
src/
  features/
    scan/              barcode lookup, OCR and photo recognition with Gemini, confidence levels
    geolocation/       GPS → council, council search, the saved council (useZone)
    disposal/          item → material → council rule; drop-off points, walking routes, maps
    gamification/
      points/          points ledger, streaks, milestones
      pet/             Bin Bin: diet meters, skins, levels
      leaderboard/     council rankings
    notifications/     scheduling local reminders
    profile/           stats, achievements, weekly recap
  services/            Firebase setup, AuthService, FirestoreClient
  components/, theme/, utils/    shared UI, design tokens, helpers
scripts/               seed scripts and their data, the mapping evaluation
```

### How a scan becomes an instruction

1. `app/scan.tsx` reads a barcode live, or takes a photo.
2. `ScanService` identifies the item. A barcode is looked up on Open Food
   Facts. A photo goes to Gemini: `OcrService` reads the label text, and if no
   material is named, `VisionService` recognises the item.
3. `itemMatcher.ts` maps the name to a material: an exact catalog match, then
   an answer cached on the phone, then Gemini choosing from the catalog, then
   an offline keyword matcher.
4. `DisposalService.getRule` loads the council's rule from Firestore. If no
   kerbside bin takes the item, `findNearestDropOff` finds the closest drop-off
   point in the council that accepts it.
5. **Got it** (kerbside) or **I dropped it off** (drop-off) calls
   `completeGuidance` or `confirmDropOff`: `PointsService.addPoints` writes the
   ledger entry, and `PetService.feed` fills the diet meter and unlocks a skin
   at 500.

### Where state lives

| State | Stored in | Read through |
|-------|-----------|--------------|
| Signed-in user | Firebase Auth (session kept on the phone) | `useAuthSession` |
| Current council | AsyncStorage | `useZone` |
| Points, streak, items sorted | Firestore `pointsLedger` | `PointsService`, reloaded when a tab is opened |
| Pet | Firestore `petState` | `usePet`; `PetService` tells every screen showing the pet to reload after a change |
| Saved-for-later items, notification setting, cached scan matches | AsyncStorage | each feature's service |

### Mobile technologies

| Technology | Library | How it's used |
|------------|---------|---------------|
| Camera | `expo-camera` | `CameraView` decodes barcodes live (EAN, UPC, Code 128, QR). Photos are taken as base64 JPEG for Gemini. |
| Location | `expo-location` | A coarse fix is reverse-geocoded to a suburb and matched to a council. On the route screen, the position is tracked every 10 m for the live ETA and arrival. |
| Maps | `react-native-maps`, `react-native-webview` | Apple Maps on iOS; MapLibre GL with OpenFreeMap tiles in a WebView on Android. |
| Notifications | `expo-notifications` | Scheduled local notifications, with separate Android channels for reminders and rule updates. |
| Local storage | `@react-native-async-storage/async-storage` | The council, the Firebase session, saved items and cached scan matches. |

### Extending the app

| To add | Edit | Then |
|--------|------|------|
| A council-specific rule | `scripts/seedingFiles/defaultRules.ts` | `npm run seed:disposal` |
| A drop-off point | `scripts/seedingFiles/dropOffLocations.ts` | `npm run seed:disposal` |
| A council's bins and links | `src/features/disposal/data/councilGuidelines.ts` | `npm run seed:disposal` |
| A council or suburb | `src/features/geolocation/data/australianLgas.ts` | `npm run seed:zones` |
| An item name or alias | `src/features/disposal/data/materialCatalog.ts` | `npm run eval:mapping` to check matching |
| A material with its own pet skin | `MaterialKey` in `src/features/disposal/types.ts`; `MaterialType`, `MATERIAL_ORDER` and `SKINS` in `src/features/gamification/pet/` | add its rules, then seed |
| A screen | a new file in `app/` | list it in `app/_layout.tsx` with the signed-in screens |

Path aliases from `tsconfig.json`: `@features/*`, `@components/*`,
`@services/*`, `@utils/*`, `@theme/*` and `@/*` for the repository root.

## Libraries

| Library | Version | Used for |
|---------|---------|----------|
| `expo` | 58 | build tooling and native modules |
| `react-native` / `react` | 0.88 / 19.3 | UI |
| `expo-router` | 58.0 | file-based navigation |
| `firebase` | 12.19 | Authentication and Firestore |
| `@google/genai` | 2.27 | Gemini (OCR, photo recognition, item matching) |
| `expo-camera` | 58.0 | camera and barcode scanning |
| `expo-location` | 58.0 | GPS and geocoding |
| `expo-notifications` | 58.0 | local notifications |
| `react-native-maps` | 1.29 | Apple Maps on iOS |
| `react-native-webview` | 14.0 | the MapLibre map on Android |
| `@react-native-async-storage/async-storage` | 2.2 | on-device storage |
| `react-native-reanimated` | 4.7 | animations |
| `@expo/vector-icons` | 15.0 | icons |
| `vitest` | 5.0 | unit tests |
| `typescript` | 6.0 | type checking |
| `tsx` | 4.19 | running the seed scripts |

Exact versions of every package are pinned in `package-lock.json`.

## Testing

- `npm test` runs the Vitest unit tests: confidence levels, OCR keyword
  parsing, barcode lookup, the scan fallback order, item search,
  item-to-material matching and bin mapping.
- `npm run eval:mapping` scores item-to-material matching with real Gemini
  calls (`npm run eval:mapping -- --local` runs the offline matcher only).
- The camera, GPS, maps and notifications need a real phone, so they're
  tested by hand with the steps in [Demo account and testing](#demo-account-and-testing).

## Members

| SID       | Name                 |
|-----------|----------------------|
| 520637528 | David Cedric Chan Tan|
| 530176655 | Edbert Suwandi       |
| 530657486 | Quang Minh Nguyen    |
| 530322861 | Eli Shaw             |
