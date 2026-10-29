/**
 * RFC4122 v4-ish UUID, no dependency on the global `crypto` object.
 *
 * `crypto.randomUUID()` isn't guaranteed to exist across every RN/Expo
 * runtime (Expo Go, older Hermes builds, some simulators); it threw
 * "Property 'crypto' doesn't exist" for at least one teammate. This is
 * only used for Firestore document IDs, not for anything security-
 * sensitive, so Math.random-based generation is fine here.
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
