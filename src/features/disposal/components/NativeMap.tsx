import { colors } from '@theme/index';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PixelRatio, Platform, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { boundsFor, fitKeyFor, fitPadding, NO_PATH, pointsToFit, ZOOM_OUT_FACTOR, type MapImplProps } from './mapGeometry';

const DEFAULT_INSETS = { top: 24, bottom: 24 };
/** Roughly a 1km-wide view: street level, like Google Maps' my-location zoom. */
const FOCUS_DELTA = 0.01;
// Whole of Australia, only seen for a moment before the first fit.
const FALLBACK_REGION: Region = { latitude: -27, longitude: 134, latitudeDelta: 35, longitudeDelta: 35 };

// FR-68/71: real tiles. Apple Maps on iOS; Openstreet Maps on Android dev builds.
// MapCanvas decides whether this or OsmMap is used.
export function NativeMap({ pins, here, path = NO_PATH, selectedId, onPinPress, insets = DEFAULT_INSETS, focus }: MapImplProps) {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const reduceMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion.current = v));
    return () => sub.remove();
  }, []);

  const points = useMemo(() => pointsToFit(pins, here, path), [pins, here, path]);
  const latestPoints = useRef(points);
  latestPoints.current = points;

  const [initialRegion] = useState<Region>(() => {
    const b = boundsFor(points);
    if (!b) return FALLBACK_REGION;
    return {
      latitude: (b.minLat + b.maxLat) / 2,
      longitude: (b.minLng + b.maxLng) / 2,
      latitudeDelta: (b.maxLat - b.minLat) * 1.6,
      longitudeDelta: (b.maxLng - b.minLng) * 1.6,
    };
  });

  const fitKey = fitKeyFor(pins, path, here);
  useEffect(() => {
    if (!ready) return;
    const b = boundsFor(latestPoints.current);
    if (!b) return;
    // Android takes edge padding in raw pixels, iOS in points.
    const px = (dp: number) => (Platform.OS === 'android' ? PixelRatio.getPixelSizeForLayoutSize(dp) : Math.round(dp));
    const pad = fitPadding(insets);
    mapRef.current?.fitToCoordinates(
      [
        { latitude: b.minLat, longitude: b.minLng },
        { latitude: b.maxLat, longitude: b.maxLng },
      ],
      { edgePadding: { top: px(pad.top), right: px(pad.right), bottom: px(pad.bottom), left: px(pad.left) }, animated: !reduceMotion.current }
    );
  }, [ready, fitKey, insets.top, insets.bottom]);

  // Recenter button: zoom in on the user, or out a step at a time. Declared after the fit so it wins if both fire.
  useEffect(() => {
    if (!ready || !focus) return;
    const delta = FOCUS_DELTA * ZOOM_OUT_FACTOR ** (focus.zoomOut ?? 0);
    mapRef.current?.animateToRegion(
      { ...focus.coordinate, latitudeDelta: delta, longitudeDelta: delta },
      reduceMotion.current ? 0 : 500
    );
  }, [ready, focus]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      onMapReady={() => setReady(true)}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {path.length > 1 && <Polyline coordinates={path} strokeColor={colors.primary} strokeWidth={5} />}
      {pins.map((pin) => {
        const selected = pin.id === selectedId;
        return (
          <Marker
            // Remount on selection: Android ignores pinColor changes on a live marker.
            key={`${pin.id}:${selected ? 1 : 0}`}
            coordinate={pin.coordinate}
            pinColor={selected ? colors.primary : colors.dark}
            onPress={() => onPinPress?.(pin.id)}
            accessibilityLabel={pin.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          />
        );
      })}
    </MapView>
  );
}
