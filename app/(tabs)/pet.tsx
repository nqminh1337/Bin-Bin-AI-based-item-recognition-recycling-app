import {
  DietMeterRow,
  MATERIAL_ORDER,
  PetPlaceholder,
  PetService,
  SKINS,
  SkinPicker,
  type MaterialType,
  computeLevel,
  isHungry,
  usePet,
} from '@features/gamification/pet';
import { useRouter } from 'expo-router';
import { border, colors, palette, radii, spacing, typography } from '@theme/index';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Trash Pet (proto screen 09): FR-45-52. Diet meters feed from PetService,
// which DisposalService.completeGuidance / confirmDropOff call into after
// every correctly-sorted item (see those files for the FR-45 wiring).
export default function PetScreen() {
  const router = useRouter();
  const { pet, userId, loading, error, refresh } = usePet();
  const [equipping, setEquipping] = useState(false);

  const handleEquip = async (skinId: MaterialType | null) => {
    if (!userId) return;
    setEquipping(true);
    try {
      await PetService.equipSkin(userId, skinId);
      await refresh();
    } catch {
      Alert.alert("Couldn't equip skin", 'Check your connection and try again.');
    } finally {
      setEquipping(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!pet || error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Couldn’t load Bin Bin. Check your connection and try again.</Text>
        <Pressable style={styles.retry} onPress={refresh} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const level = computeLevel(pet);
  const hungry = isHungry(pet);
  const equippedSkin = pet.equippedSkinId ? SKINS[pet.equippedSkinId] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>BIN BIN</Text>
          <Text style={styles.title}>Your pet</Text>
        </View>
        <View style={styles.levelPill}>
          <Text style={styles.levelLabel}>LVL</Text>
          <Text style={styles.levelValue}>{level}</Text>
        </View>
      </View>


      <View style={styles.petCard}>
        <View style={styles.petStage}>
          <PetPlaceholder skinId={pet.equippedSkinId} size={120} />
        </View>
        <View style={styles.petInfo}>
          <View>
            <Text style={styles.cardTitle}>Bin Bin</Text>
            <Text style={styles.muted}>{equippedSkin ? `Equipped: ${equippedSkin.name}` : 'No skin equipped'}</Text>
          </View>
          <View style={[styles.statusBadge, hungry && styles.statusBadgeHungry]}>
            <Text style={[styles.statusText, hungry && styles.statusTextHungry]}>{hungry ? 'HUNGRY' : 'FED'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Skins</Text>
          <Text style={styles.muted}>Tap an unlocked skin to equip it.</Text>
        </View>
      </View>

      <View style={styles.pickerCard}>
        <SkinPicker
          unlockedSkinIds={pet.unlockedSkinIds}
          equippedSkinId={pet.equippedSkinId}
          onEquip={handleEquip}
          disabled={equipping}
        />
      </View>

      <View style={styles.dietHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Bin Bin's diet</Text>
          <Text style={styles.count}>{pet.unlockedSkinIds.length} / {MATERIAL_ORDER.length} skins</Text>
        </View>
        <Text style={styles.muted}>Every correctly sorted item feeds the matching material.</Text>
      </View>

      <View style={styles.dietCard}>
        {MATERIAL_ORDER.map((material) => (
          <DietMeterRow
            key={material}
            material={material}
            meter={pet.diet[material]}
            unlocked={pet.unlockedSkinIds.includes(material)}
            equipped={pet.equippedSkinId === material}
          />
        ))}
      </View>

      <Pressable
        style={styles.recapLink}
        onPress={() => router.push('/weekly-recap')}
        accessibilityRole="button"
        accessibilityLabel="Your week in trash"
      >
        <Text style={styles.recapLinkText}>Your week in trash</Text>
        <Text style={styles.recapLinkArrow}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.xl },
  container: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg + 2 },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary },
  title: { ...typography.title, color: colors.textPrimary, marginTop: 2 },
  levelPill: { minWidth: 62, paddingVertical: 9, paddingHorizontal: spacing.md, borderRadius: radii.lg, backgroundColor: colors.dark, alignItems: 'center' },
  levelLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: '700', color: palette.gray400 },
  levelValue: { fontSize: 20, fontWeight: '700', color: colors.textOnDark },
  devButton: { alignSelf: 'flex-start', backgroundColor: '#FDE68A', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  devButtonText: { fontSize: 11, fontWeight: '700', color: '#78350F' },
  petCard: { borderRadius: radii.xl, backgroundColor: colors.surface, padding: 14, borderWidth: border.width, borderColor: border.color, marginBottom: spacing.xxl },
  pickerCard: { backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.xl, padding: spacing.lg, marginBottom: spacing.xxl },
  petStage: { height: 250, borderRadius: radii.lg, backgroundColor: palette.gray200, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  petInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5, paddingTop: spacing.md + 2 },
  cardTitle: { ...typography.cardTitle, color: colors.textPrimary },
  muted: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  statusBadge: { borderWidth: border.width, borderColor: border.color, borderRadius: radii.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  statusBadgeHungry: { borderColor: colors.accent },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: colors.textSecondary },
  statusTextHungry: { color: colors.accent },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm + 2 },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: 3 },
  dietHeader: { marginBottom: spacing.sm + 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  count: { ...typography.small, fontWeight: '700', color: colors.textSecondary },
  dietCard: { backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg + 2 },
  recapLink: { marginTop: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.lg },
  recapLinkText: { ...typography.label, color: colors.textPrimary },
  recapLinkArrow: { fontSize: 18, color: colors.textSecondary },
  retry: { borderWidth: border.width, borderColor: border.color, borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: spacing.lg },
  retryText: { ...typography.label, color: colors.textPrimary },
});