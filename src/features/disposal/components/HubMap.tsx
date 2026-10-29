import { TabBarIcon } from '@components/TabBarIcon';
import { formatDistance, GeolocationService, haversineKm, type Coordinates } from '@features/geolocation';
import { colors, radii, spacing, typography } from '@theme/index';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DisposalService } from '../DisposalService';
import type { DropOffLocation } from '../types';
import { HubDetailSheet } from './HubDetailSheet';
import { MapCanvas } from './MapCanvas';
import type { MapFocus, MapPin } from './mapGeometry';

interface HubMapProps {
  zoneId: string | null;
  /** Rendered inside the search bar, e.g. the council chip (FR-21). */
  searchAccessory?: React.ReactNode;
  /** FR-74/75: items saved for a later drop-off, shown as a badge on the bag button. */
  stashCount?: number;
  onStashPress?: () => void;
}

// The search bar and hub card float over the map; fitting keeps pins clear of them.
const MAP_INSETS = { top: 84, bottom: 110 };
// MapCanvas puts its 44px locate button at MAP_INSETS.bottom + spacing.md; the bag sits just above it.
const STASH_BOTTOM = MAP_INSETS.bottom + spacing.md + 44 + spacing.sm;

// FR-68: one pin per known hub in the resolved zone.
// FR-67: search box filters pins by name.
// FR-69: nearest hub card: name, distance, bin count, multiplier. Tapping a
// pin features that hub instead; "Show nearest" switches back.
// FR-70: tapping a pin or the card opens the hub's details.
export function HubMap({ zoneId, searchAccessory, stashCount = 0, onStashPress }: HubMapProps) {
  const [hubs, setHubs] = useState<DropOffLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [here, setHere] = useState<Coordinates | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [focusOn, setFocusOn] = useState<MapFocus | null>(null);

  useEffect(() => {
    if (!zoneId) {
      setHubs([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSelectedId(null);
    setDetailId(null);
    DisposalService.getHubsForZone(zoneId)
      .then((h) => !cancelled && setHubs(h))
      .catch(() => !cancelled && setHubs([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [zoneId]);

  // Live position (every ~50m) so distances and "nearest" stay right as you
  // move. Re-subscribes when the zone resolves: on first launch, that's when
  // location permission has just been granted.
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    GeolocationService.getCurrentCoordinates()
      .then((c) => !cancelled && setHere((prev) => prev ?? c))
      .catch(() => {});
    GeolocationService.watchCoordinates((c) => !cancelled && setHere(c), { precise: false })
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [zoneId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? hubs.filter((h) => h.name.toLowerCase().includes(q)) : hubs;
  }, [hubs, search]);

  const ranked = useMemo(
    () =>
      visible
        .map((hub) => ({ hub, distanceKm: here ? haversineKm(here, hub) : null }))
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)),
    [visible, here]
  );

  const pins = useMemo<MapPin[]>(
    () =>
      visible.map((hub) => ({
        id: hub.locationId,
        coordinate: { latitude: hub.latitude, longitude: hub.longitude },
        label: hub.name,
      })),
    [visible]
  );

  const nearest = ranked[0] ?? null;
  const featured = ranked.find((r) => r.hub.locationId === selectedId) ?? nearest;
  const isNearest = !!featured && featured === nearest;
  const detailHub = hubs.find((h) => h.locationId === detailId) ?? null;

  const showNearest = () => {
    if (!nearest) return;
    setSelectedId(null);
    setFocusOn({ coordinate: { latitude: nearest.hub.latitude, longitude: nearest.hub.longitude }, seq: Date.now() });
  };

  return (
    <View style={styles.container}>
      <MapCanvas
        pins={pins}
        here={here}
        selectedId={featured?.hub.locationId ?? null}
        onPinPress={(id) => {
          setSelectedId(id);
          setDetailId(id);
        }}
        insets={MAP_INSETS}
        focusOn={focusOn}
      />

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search hubs nearby"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search hubs nearby"
        />
        {searchAccessory}
      </View>

      {onStashPress && (
        <Pressable
          style={styles.stashButton}
          onPress={onStashPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            stashCount > 0
              ? `Saved for later: ${stashCount} ${stashCount === 1 ? 'item' : 'items'} to drop off`
              : 'Saved for later: nothing saved'
          }
        >
          <TabBarIcon name="bag-handle-outline" color={colors.textPrimary} size={22} />
          {stashCount > 0 && (
            <View style={styles.stashBadge}>
              <Text style={styles.stashBadgeText}>{stashCount > 9 ? '9+' : stashCount}</Text>
            </View>
          )}
        </Pressable>
      )}

      {loading && (
        <View style={styles.badge}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {featured ? (
        <Pressable
          style={styles.hubCard}
          onPress={() => setDetailId(featured.hub.locationId)}
          accessibilityRole="button"
          accessibilityLabel={`${featured.hub.name}. View details`}
        >
          <View style={styles.hubThumb}>
            <TabBarIcon name="business-outline" color={colors.textSecondary} size={20} />
          </View>
          <View style={styles.hubBody}>
            {/* "Nearest" needs a position; without one the order is arbitrary. */}
            <Text style={styles.hubEyebrow}>
              {!isNearest ? 'SELECTED HUB' : here ? 'NEAREST HUB' : 'RECYCLING HUB'}
            </Text>
            <Text style={styles.hubName} numberOfLines={1}>{featured.hub.name}</Text>
            <Text style={styles.hubMeta} numberOfLines={1}>
              {featured.distanceKm !== null ? `${formatDistance(featured.distanceKm * 1000)} away · ` : ''}
              {featured.hub.acceptedMaterials.length} {featured.hub.acceptedMaterials.length === 1 ? 'bin' : 'bins'} · {featured.hub.pointsMultiplier ?? 1}× points today
            </Text>
          </View>
          {!isNearest ? (
            <Pressable style={styles.nearestPill} onPress={showNearest} hitSlop={6} accessibilityRole="button" accessibilityLabel="Show nearest hub">
              <TabBarIcon name="navigate-outline" color={colors.textPrimary} size={13} />
              <Text style={styles.nearestPillText}>Show nearest</Text>
            </Pressable>
          ) : (
            <TabBarIcon name="chevron-forward" color={colors.textMuted} size={18} />
          )}
        </Pressable>
      ) : (
        !loading && zoneId && (
          <View style={styles.hubCard}>
            <Text style={styles.hubMeta}>
              {hubs.length === 0 ? 'No hubs listed for this council yet' : `No hubs match “${search}”`}
            </Text>
          </View>
        )
      )}

      <HubDetailSheet
        hub={detailHub}
        distanceKm={detailHub && here ? haversineKm(here, detailHub) : null}
        onClose={() => setDetailId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchBar: {
    position: 'absolute', top: spacing.md, left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.pill,
    paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 2 },
  badge: { position: 'absolute', top: 64, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, padding: spacing.sm },

  stashButton: {
    position: 'absolute', right: spacing.lg, bottom: STASH_BOTTOM,
    width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  stashBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stashBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textOnDark },

  hubCard: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  hubThumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  hubBody: { flex: 1, gap: 2 },
  hubEyebrow: { ...typography.eyebrow, fontSize: 9, letterSpacing: 1.2, color: colors.primary },
  hubName: { ...typography.label, fontSize: 15, color: colors.textPrimary },
  nearestPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  nearestPillText: { ...typography.small, fontWeight: '600', color: colors.textPrimary },
  hubMeta: { ...typography.caption, color: colors.textSecondary },
});
