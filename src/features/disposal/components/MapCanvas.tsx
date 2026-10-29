import { TabBarIcon } from '@components/TabBarIcon';
import { GeolocationService, haversineKm, type Coordinates } from '@features/geolocation';
import { colors, radii, spacing, typography } from '@theme/index';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { MapCanvasProps, MapFocus } from './mapGeometry';
import { NativeMap } from './NativeMap';
import { OsmMap } from './OsmMap';

/** A fresh fix this far from the last known one moves the camera again. */
const REFOCUS_M = 25;

// Recenter zoom steps: a tap goes back to street level, a double tap steps
// out once, and a double tap on the widest step comes back to street level.
const DOUBLE_TAP_MS = 280;
const ZOOM_STEPS = [
  { label: 'Street view', hint: 'Double-tap to zoom out', ringScale: 0 },
  { label: 'Neighbourhood', hint: 'Double-tap for wider, tap to zoom in', ringScale: 0.8 },
  { label: 'Wider area', hint: 'Tap to zoom back in', ringScale: 1.15 },
] as const;
const LABEL_MS = 1600;

// FR-68: which real map to draw.
//  - iOS: Apple Maps. Native, no key, works in Expo Go.
//  - Android: OpenStreetMap (OsmMap). Google Maps can't
//    authorise inside Expo Go (react-native-maps#5888).
const NATIVE_MAP_AVAILABLE = Platform.OS === 'ios';

interface Props extends MapCanvasProps {
  /** Ask the map to move somewhere (e.g. "Show nearest"); a new seq repeats it. */
  focusOn?: MapFocus | null;
}

// Also owns the "back to my location" button, so every map gets one.
export function MapCanvas({ focusOn, ...props }: Props) {
  const [focus, setFocus] = useState<MapFocus | null>(null);
  // A fix taken by the button. Dropped whenever the caller supplies a newer position.
  const [fresh, setFresh] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  // Which ZOOM_STEPS entry the button is on.
  const [zoomOut, setZoomOut] = useState(0);
  const [showStep, setShowStep] = useState(false);
  // Set while a first tap waits to see whether a second one follows.
  const singleTap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringScale = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: ringScale.value > 0 ? 1 : 0 }));

  useEffect(() => {
    ringScale.value = withSpring(ZOOM_STEPS[zoomOut].ringScale, { damping: 14 });
  }, [zoomOut, ringScale]);
  useEffect(() => {
    if (!showStep) return;
    const t = setTimeout(() => setShowStep(false), LABEL_MS);
    return () => clearTimeout(t);
  }, [showStep, zoomOut]);
  useEffect(() => () => {
    if (singleTap.current) clearTimeout(singleTap.current);
  }, []);

  useEffect(() => setFresh(null), [props.here]);
  useEffect(() => {
    if (focusOn) setFocus(focusOn);
  }, [focusOn]);
  const here = fresh ?? props.here;

  const handlePress = () => {
    if (singleTap.current) {
      clearTimeout(singleTap.current);
      singleTap.current = null;
      recenter((zoomOut + 1) % ZOOM_STEPS.length);
    } else {
      singleTap.current = setTimeout(() => {
        singleTap.current = null;
        recenter(0);
      }, DOUBLE_TAP_MS);
    }
  };

  const recenter = async (step: number) => {
    const seq = Date.now();
    if (step !== zoomOut) {
      setZoomOut(step);
      setShowStep(true);
    }

    if (here) {
      // Jump straight to the last known spot, like Google Maps, and refine quietly.
      setFocus({ coordinate: here, seq, zoomOut: step });
    } else {
      // Nothing to show yet: spin until the first fix arrives.
      setLocating(true);
    }
    try {
      const now = await GeolocationService.getCurrentCoordinates();
      setFresh(now);
      if (!here || haversineKm(here, now) * 1000 > REFOCUS_M) setFocus({ coordinate: now, seq: seq + 1, zoomOut: step });
    } catch {
      if (!here) Alert.alert('Location unavailable', 'Turn on location services to jump to where you are.');
    } finally {
      setLocating(false);
    }
  };

  const mapProps = { ...props, here, focus };

  return (
    <View style={styles.container}>
      {NATIVE_MAP_AVAILABLE ? <NativeMap {...mapProps} /> : <OsmMap {...mapProps} />}
      {showStep && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(250)}
          style={[styles.stepLabel, { bottom: (props.insets?.bottom ?? 24) + spacing.md + 8 }]}
          pointerEvents="none"
        >
          <Text style={styles.stepLabelText}>{ZOOM_STEPS[zoomOut].label}</Text>
          <Text style={styles.stepHint}>{ZOOM_STEPS[zoomOut].hint}</Text>
        </Animated.View>
      )}
      <Pressable
        style={[styles.locateButton, { bottom: (props.insets?.bottom ?? 24) + spacing.md }]}
        onPress={handlePress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Show my location"
        accessibilityHint="Double-tap quickly to zoom out"
        accessibilityValue={{ text: ZOOM_STEPS[zoomOut].label }}
        // Screen readers already use a double tap to press, so zooming out is a separate action.
        accessibilityActions={[{ name: 'zoomOut', label: 'Zoom out' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'zoomOut') recenter((zoomOut + 1) % ZOOM_STEPS.length);
        }}
      >
        {/* Wider ring = wider view. */}
        <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <TabBarIcon name={zoomOut === 0 ? 'locate' : 'locate-outline'} color={zoomOut === 0 ? colors.textPrimary : colors.primary} size={22} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locateButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  ring: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stepLabel: {
    position: 'absolute',
    right: spacing.lg + 44 + spacing.sm,
    backgroundColor: colors.dark,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepLabelText: { ...typography.label, color: colors.textOnDark },
  stepHint: { ...typography.small, color: colors.textOnDark, opacity: 0.75 },
});
