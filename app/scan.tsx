import { TabBarIcon } from '@components/TabBarIcon';
import { bestItemMatch, MATERIAL_LABELS, searchItems, type ItemSuggestion } from '@features/disposal';
import { canAutoConfirm, confidenceLevel, ScanService, type IdentifiedItem, type ScanMethod } from '@features/scan';
import { colors, radii, spacing, typography } from '@theme/index';
import { slugify } from '@utils/slugify';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeSettings } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Where the capture -> Gemini identification flow is in its lifecycle.
// The preview is frozen for every phase except 'idle', so the user sees
// exactly the frame that is being (or was) identified.
type Phase =
  | { kind: 'idle' }
  | { kind: 'analyzing' }
  | { kind: 'result'; item: IdentifiedItem }
  | { kind: 'failed'; reason: 'unidentified' | 'capture' | 'error' | 'barcode' };

type ScanMode = 'item' | 'barcode';

const SCAN_MODES: { mode: ScanMode; icon: ComponentProps<typeof TabBarIcon>['name']; label: string }[] = [
  { mode: 'item', icon: 'scan-outline', label: 'Item' },
  { mode: 'barcode', icon: 'barcode-outline', label: 'Barcode' },
];

const METHOD_LABEL: Record<ScanMethod, string> = {
  barcode: 'BARCODE',
  ocr: 'LABEL TEXT',
  vision: 'PHOTO MATCH',
};

const BARCODE_SETTINGS: BarcodeSettings = { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] };

const FAILURE_COPY: Record<Extract<Phase, { kind: 'failed' }>['reason'], [string, string]> = {
  unidentified: ['Couldn’t identify that', 'Fill the frame with one item, with any label facing the camera.'],
  capture: ['Capture failed', 'The camera didn’t return a photo. Try taking it again.'],
  error: ['Something went wrong', 'Check your connection and try again, or type the item in.'],
  barcode: ['Barcode not found', 'That product isn’t in the barcode database. Take a photo of the item instead.'],
};

// FR-01/02: camera viewfinder with reticle overlay, opened from the Home tab. The user can either capture a photo or type the item in manually.
// FR-03/07-14: capture control takes a photo, sends it to Gemini, and handles the result (or failure).
// FR-04: "Type it" opens manual entry
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhaseState] = useState<Phase>({ kind: 'idle' });
  // The handlers read this ref (updated straight away, unlike state) so a double
  // tap or a barcode seen mid-lookup can't start a second scan.
  const phaseRef = useRef<Phase>(phase);
  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [mode, setMode] = useState<ScanMode>('item');
  const cameraRef = useRef<CameraView>(null);
  // Bumped on cancel/retake so a late Gemini response for an abandoned capture is ignored.
  const scanToken = useRef(0);

  const goToDisposal = (itemId: string, label: string) => {
    router.replace({ pathname: '/disposal', params: { itemId, label } });
  };

  const pickSuggestion = (suggestion: ItemSuggestion) => {
    setManualOpen(false);
    setManualText('');
    goToDisposal(suggestion.itemId, suggestion.label);
  };

  const submitManual = () => {
    const label = manualText.trim();
    if (!label) return;
    // "glassjar" / "glas jar" → the Glass jar entry; anything unrecognised goes through as typed.
    const match = bestItemMatch(label);
    if (match) return pickSuggestion(match);
    setManualOpen(false);
    setManualText('');
    // Slug doubles as itemId so exact catalog matches still hit.
    goToDisposal(slugify(label), label);
  };

  const openManual = (prefill = '') => {
    setManualText(prefill);
    setManualOpen(true);
  };

  const resetToCamera = () => {
    scanToken.current += 1;
    setPhase({ kind: 'idle' });
    cameraRef.current?.resumePreview().catch(() => {});
  };

  const switchToItemScan = () => {
    setMode('item');
    resetToCamera();
  };

  // Capture is ignored unless idle (avoids multiple captures).
  const handleCapture = async () => {
    if (phaseRef.current.kind !== 'idle') return;
    const token = ++scanToken.current;
    setPhase({ kind: 'analyzing' });
    try {
      const photo = await cameraRef.current?.takePictureAsync({ skipProcessing: true, base64: true });
      if (token !== scanToken.current) return;
      cameraRef.current?.pausePreview().catch(() => {});
      if (!photo?.base64) {
        setPhase({ kind: 'failed', reason: 'capture' });
        return;
      }
      const { item } = await ScanService.identifyItem({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        base64: photo.base64,
      });
      if (token !== scanToken.current) return;
      setPhase(item ? { kind: 'result', item } : { kind: 'failed', reason: 'unidentified' });
    } catch (error) {
      console.error('Scan capture failed:', error);
      if (token === scanToken.current) setPhase({ kind: 'failed', reason: 'error' });
    }
  };

  // FR-07: a live barcode hit skips capture and goes straight to lookup.
  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (phaseRef.current.kind !== 'idle' || !data) return;
    const token = ++scanToken.current;
    setPhase({ kind: 'analyzing' });
    try {
      const item = await ScanService.identifyByBarcodeValue(data);
      if (token !== scanToken.current) return;
      setPhase(item ? { kind: 'result', item } : { kind: 'failed', reason: 'barcode' });
    } catch {
      if (token === scanToken.current) setPhase({ kind: 'failed', reason: 'error' });
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.permissionIcon}>
          <TabBarIcon name="camera-outline" color={colors.primary} size={32} />
        </View>
        <Text style={styles.permissionTitle}>Allow camera access</Text>
        <Text style={styles.permissionText}>
          Bin Bin uses the camera to read labels and recognise items so it can tell you which bin they go in.
        </Text>
        <Pressable style={styles.primary} onPress={requestPermission} accessibilityRole="button">
          <Text style={styles.primaryText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => openManual()} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>Type the item instead</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text style={styles.linkMuted}>Not now</Text>
        </Pressable>
        {renderManualSheet()}
      </View>
    );
  }

  const isIdle = phase.kind === 'idle';
  const isAnalyzing = phase.kind === 'analyzing';
  const isBarcodeMode = mode === 'barcode';
  const barcodeMissed = phase.kind === 'failed' && phase.reason === 'barcode';

  return (
    <View style={styles.container}>
      {/* Barcode scanning follows the mode, never the phase: Android rebuilds the
          camera whenever it's switched on or off, which kills a photo mid-capture. */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={isBarcodeMode ? BARCODE_SETTINGS : undefined}
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      />
      {!isIdle && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.dim} pointerEvents="none" />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.modeToggle} accessibilityRole="tablist">
            {SCAN_MODES.map((option) => {
              const selected = mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  style={[styles.modeOption, selected && styles.modeOptionSelected]}
                  onPress={() => setMode(option.mode)}
                  disabled={!isIdle}
                  hitSlop={4}
                  accessibilityRole="tab"
                  accessibilityLabel={`${option.label} scan`}
                  accessibilityState={{ selected, disabled: !isIdle }}
                >
                  <TabBarIcon name={option.icon} color={selected ? colors.textPrimary : colors.textOnDark} size={16} />
                  <Text style={[styles.modeOptionText, selected && styles.modeOptionTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.topBarActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() => setTorchOn((on) => !on)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={torchOn ? 'Turn flash off' : 'Turn flash on'}
              accessibilityState={{ selected: torchOn }}
            >
              <TabBarIcon name={torchOn ? 'flash' : 'flash-off'} color={colors.textOnDark} size={22} />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
            >
              <TabBarIcon name="close" color={colors.textOnDark} size={24} />
            </Pressable>
          </View>
        </View>

        <View style={styles.reticleWrap} pointerEvents="none">
          <Reticle active={isAnalyzing} />
          <View style={styles.hintPill}>
            {isAnalyzing ? <ActivityIndicator size="small" color={colors.textOnDark} /> : null}
            <Text style={styles.hintText} accessibilityLiveRegion="polite">
              {isBarcodeMode
                ? isAnalyzing ? 'Looking up barcode…' : 'Line the barcode up in the frame'
                : isAnalyzing ? 'Reading label and shape…' : 'Fill the frame with one item'}
            </Text>
          </View>
        </View>

        {isIdle || isAnalyzing ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <View style={styles.bottomSlot}>
              <Pressable
                style={[styles.sideButton, isAnalyzing && styles.hidden]}
                onPress={() => openManual()}
                disabled={isAnalyzing}
                accessibilityRole="button"
                accessibilityLabel="Type the item instead"
              >
                <TabBarIcon name="create-outline" color={colors.textOnDark} size={20} />
                <Text style={styles.sideButtonText}>Type it</Text>
              </Pressable>
            </View>
            {isBarcodeMode ? (
              // Barcodes scan on their own; the spacer keeps the side buttons in place.
              <View style={styles.captureSpacer} />
            ) : (
              <Pressable
                style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}
                onPress={handleCapture}
                disabled={!isIdle}
                accessibilityRole="button"
                accessibilityLabel="Scan item"
                accessibilityState={{ busy: isAnalyzing, disabled: !isIdle }}
              >
                <View style={[styles.captureButtonInner, isAnalyzing && styles.captureButtonInnerBusy]} />
              </Pressable>
            )}
            <View style={styles.bottomSlot}>
              {isAnalyzing ? (
                <Pressable style={styles.sideButton} onPress={resetToCamera} accessibilityRole="button">
                  <TabBarIcon name="close-circle-outline" color={colors.textOnDark} size={20} />
                  <Text style={styles.sideButtonText}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {phase.kind === 'result' ? (
        <ResultSheet
          item={phase.item}
          bottomInset={insets.bottom}
          onConfirm={() => goToDisposal(phase.item.itemId, phase.item.label)}
          onEdit={() => openManual(phase.item.label)}
          onRetake={resetToCamera}
        />
      ) : null}

      {phase.kind === 'failed' ? (
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
        >
          <View style={styles.failIcon}>
            <TabBarIcon name="help" color={colors.textPrimary} size={22} />
          </View>
          <Text style={styles.sheetTitle}>{FAILURE_COPY[phase.reason][0]}</Text>
          <Text style={styles.sheetBody}>{FAILURE_COPY[phase.reason][1]}</Text>
          <Pressable style={styles.primary} onPress={barcodeMissed ? switchToItemScan : resetToCamera} accessibilityRole="button">
            <Text style={styles.primaryText}>{barcodeMissed ? 'Scan the item instead' : 'Try again'}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={barcodeMissed ? resetToCamera : () => openManual()} accessibilityRole="button">
            <Text style={styles.secondaryText}>{barcodeMissed ? 'Try another barcode' : 'Type it instead'}</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {renderManualSheet()}
    </View>
  );

  function renderManualSheet() {
    const canSubmit = manualText.trim().length > 0;
    const suggestions = searchItems(manualText, 4);
    return (
      <Modal visible={manualOpen} transparent animationType="slide" onRequestClose={() => setManualOpen(false)}>
        <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setManualOpen(false)} accessibilityLabel="Dismiss" />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.grabber} />
            <Text style={styles.eyebrow}>MANUAL ENTRY</Text>
            <Text style={styles.sheetTitle}>What is the item?</Text>
            <View style={styles.inputRow}>
              <TabBarIcon name="search" color={colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                placeholder="e.g. glass jar, chip packet, old phone"
                placeholderTextColor={colors.textMuted}
                value={manualText}
                onChangeText={setManualText}
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={submitManual}
                accessibilityLabel="Item name"
              />
              {canSubmit ? (
                <Pressable onPress={() => setManualText('')} hitSlop={8} accessibilityLabel="Clear">
                  <TabBarIcon name="close-circle" color={colors.textMuted} size={18} />
                </Pressable>
              ) : null}
            </View>
            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion.itemId}
                    style={styles.suggestion}
                    onPress={() => pickSuggestion(suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={`${suggestion.label}, ${MATERIAL_LABELS[suggestion.material]}`}
                  >
                    <View style={styles.suggestionBody}>
                      <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                      <Text style={styles.suggestionMeta}>
                        {suggestion.matched !== suggestion.label ? `“${suggestion.matched}” · ` : ''}
                        {MATERIAL_LABELS[suggestion.material]}
                      </Text>
                    </View>
                    <TabBarIcon name="arrow-forward" color={colors.textMuted} size={16} />
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              style={[styles.primary, !canSubmit && styles.disabled]}
              onPress={submitManual}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
            >
              <Text style={styles.primaryText}>Find disposal rule</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
}

const RETICLE_SIZE = 248;
const CORNER = 36;

// Corner-bracket frame; while analyzing it turns accent green and a scan
// line sweeps through it (transform-only animation, runs on the UI thread).
function Reticle({ active }: { active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [active, progress]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * (RETICLE_SIZE - 4) }],
  }));

  const tint = active ? colors.primary : colors.textOnDark;
  return (
    <View style={styles.reticle}>
      <View style={[styles.corner, styles.cornerTL, { borderColor: tint }]} />
      <View style={[styles.corner, styles.cornerTR, { borderColor: tint }]} />
      <View style={[styles.corner, styles.cornerBL, { borderColor: tint }]} />
      <View style={[styles.corner, styles.cornerBR, { borderColor: tint }]} />
      {active ? <Animated.View style={[styles.scanLine, lineStyle]} /> : null}
    </View>
  );
}

function ResultSheet({
  item,
  bottomInset,
  onConfirm,
  onEdit,
  onRetake,
}: {
  item: IdentifiedItem;
  bottomInset: number;
  onConfirm: () => void;
  onEdit: () => void;
  onRetake: () => void;
}) {
  const level = confidenceLevel(item.confidence);
  const isLow = !canAutoConfirm(item.confidence);
  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.sheet, { paddingBottom: bottomInset + spacing.lg }]}
    >
      <View style={styles.grabber} />
      <Text style={styles.eyebrow}>IDENTIFIED · {METHOD_LABEL[item.method]}</Text>
      <View style={styles.resultRow}>
        <View style={styles.resultIcon}>
          <TabBarIcon name="checkmark" color={colors.textOnDark} size={22} />
        </View>
        <Text style={styles.resultLabel} numberOfLines={2}>
          {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
        </Text>
        <Pressable style={styles.editChip} onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit item name">
          <TabBarIcon name="pencil" color={colors.textPrimary} size={14} />
          <Text style={styles.editChipText}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.confidenceRow} accessibilityLabel={`${level.label}, ${Math.round(item.confidence * 100)} percent`}>
        <View style={styles.bars}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={[styles.bar, { height: 6 + n * 4 }, n <= level.bars && (isLow ? styles.barLow : styles.barOn)]}
            />
          ))}
        </View>
        <Text style={styles.confidenceText}>
          {level.label} · {Math.round(item.confidence * 100)}%
        </Text>
      </View>

      {isLow ? (
        <View style={styles.notice}>
          <TabBarIcon name="information-circle-outline" color={colors.textSecondary} size={16} />
          <Text style={styles.noticeText}>
            Too unsure to confirm automatically — rescan or enter the item manually.
          </Text>
        </View>
      ) : (
        <Pressable style={styles.primary} onPress={onConfirm} accessibilityRole="button">
          <Text style={styles.primaryText}>Find disposal rule</Text>
        </Pressable>
      )}
      {isLow ? (
        <Pressable style={styles.primary} onPress={onEdit} accessibilityRole="button">
          <Text style={styles.primaryText}>Enter manually</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.secondary} onPress={onRetake} accessibilityRole="button">
        <TabBarIcon name="refresh" color={colors.textPrimary} size={16} />
        <Text style={styles.secondaryText}>Scan again</Text>
      </Pressable>
    </Animated.View>
  );
}

const SCRIM = 'rgba(0,0,0,0.45)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  overlay: { flex: 1, justifyContent: 'space-between' },

  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  permissionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  permissionText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  link: { ...typography.label, fontSize: 15, color: colors.primary, paddingVertical: spacing.xs },
  linkMuted: { ...typography.label, color: colors.textSecondary, paddingVertical: spacing.xs },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  modeToggle: { flexDirection: 'row', padding: 3, gap: 2, borderRadius: radii.pill, backgroundColor: SCRIM },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  modeOptionSelected: { backgroundColor: colors.textOnDark },
  modeOptionText: { ...typography.label, fontSize: 12, color: colors.textOnDark },
  modeOptionTextSelected: { color: colors.textPrimary },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SCRIM,
  },

  reticleWrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  reticle: { width: RETICLE_SIZE, height: RETICLE_SIZE, overflow: 'hidden' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.textOnDark },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radii.lg },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radii.lg },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radii.lg },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radii.lg },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: SCRIM,
  },
  hintText: { ...typography.label, color: colors.textOnDark },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
  },
  bottomSlot: { width: 80, alignItems: 'center' },
  sideButton: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: SCRIM,
  },
  sideButtonText: { ...typography.label, fontSize: 12, color: colors.textOnDark },
  hidden: { opacity: 0 },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: radii.pill,
    borderWidth: 4,
    borderColor: colors.textOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonPressed: { transform: [{ scale: 0.94 }] },
  captureSpacer: { width: 78, height: 78 },
  captureButtonInner: { width: 60, height: 60, borderRadius: radii.pill, backgroundColor: colors.textOnDark },
  captureButtonInnerBusy: { width: 28, height: 28, borderRadius: radii.sm, backgroundColor: colors.primary },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  eyebrow: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted },
  sheetTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  sheetBody: { ...typography.body, fontSize: 15, lineHeight: 21, color: colors.textSecondary },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  resultLabel: { flex: 1, ...typography.title, fontSize: 24, color: colors.textPrimary },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editChipText: { ...typography.label, color: colors.textPrimary },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 5, borderRadius: 2, backgroundColor: colors.border },
  barOn: { backgroundColor: colors.primary },
  barLow: { backgroundColor: colors.textSecondary },
  confidenceText: { ...typography.caption, fontSize: 13, color: colors.textSecondary },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  noticeText: { flex: 1, ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary },

  failIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, ...typography.body, paddingVertical: spacing.md, color: colors.textPrimary },
  suggestions: { gap: spacing.xs },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  suggestionBody: { flex: 1, gap: 2 },
  suggestionLabel: { ...typography.label, color: colors.textPrimary },
  suggestionMeta: { ...typography.small, color: colors.textSecondary },

  primary: {
    alignSelf: 'stretch',
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { ...typography.body, fontWeight: '600', color: colors.textOnDark },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  disabled: { opacity: 0.4 },
});
