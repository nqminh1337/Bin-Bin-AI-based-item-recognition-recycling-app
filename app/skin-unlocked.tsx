import { PetPlaceholder, PetService, SKINS, type MaterialType } from '@features/gamification/pet';
import { useAuthSession } from '@services/useAuthSession';
import { colors, palette, radii, spacing, typography } from '@theme/index';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

// Skin Unlocked (proto screen 10). FR-48/49: shown automatically right after
// a correct sort crosses a diet meter's goal — see points-awarded.tsx, which
// forwards here when DisposalService's feed result reports a new skin.
// FR-50: equip. FR-51 (Could): share.
export default function SkinUnlockedScreen() {
  const { user } = useAuthSession();
  const { skinId } = useLocalSearchParams<{ skinId: MaterialType }>();
  const [busy, setBusy] = useState(false);
  const skin = SKINS[skinId];

  const handleEquip = async () => {
    if (!user || !skin) return;
    setBusy(true);
    try {
      await PetService.equipSkin(user.uid, skin.id);
      router.dismissTo('/(tabs)/pet');
    } catch {
      Alert.alert("Couldn't equip skin", 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = () => {
    if (!skin) return;
    Share.share({ message: `Bin Bin just unlocked the ${skin.name}! Sorting my waste properly with Bin Bin. ♻️` }).catch(() => {});
  };

  if (!skin) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Nothing to show.</Text>
        <Pressable style={[styles.primary, styles.primaryStretch]} onPress={() => router.dismissTo('/(tabs)/pet')} accessibilityRole="button" accessibilityLabel="Back to Bin Bin">
          <Text style={styles.primaryText}>Back to Bin Bin</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.stage}>
          <PetPlaceholder skinId={skin.id} size={140} />
        </View>
        <Text style={styles.title}>{skin.name}</Text>
        <Text style={styles.body}>{skin.blurb}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primary, busy && styles.disabled]}
          onPress={handleEquip}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Equip skin"
          accessibilityState={{ busy, disabled: busy }}
        >
          {busy ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryText}>Equip skin</Text>}
        </Pressable>
        <Pressable onPress={handleShare} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share to friends">
          <Text style={styles.secondaryText}>Share to friends</Text>
        </Pressable>
        <Pressable onPress={() => router.dismissTo('/(tabs)/pet')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Not now">
          <Text style={styles.secondaryText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark, justifyContent: 'space-between' },
  center: { flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  stage: { width: 220, height: 220, borderRadius: radii.xl, borderWidth: 1, borderColor: palette.gray600, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, fontSize: 30, color: colors.textOnDark, textAlign: 'center' },
  body: { ...typography.body, color: palette.gray400, textAlign: 'center', lineHeight: 22 },
  footer: { padding: spacing.xl, gap: spacing.sm },
  primary: { backgroundColor: colors.textOnDark, borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center' },
  primaryStretch: { alignSelf: 'stretch' },
  primaryText: { ...typography.body, fontWeight: '700', color: colors.dark },
  disabled: { opacity: 0.6 },
  secondaryText: { ...typography.body, color: palette.gray400, textAlign: 'center', paddingVertical: 6 },
});
