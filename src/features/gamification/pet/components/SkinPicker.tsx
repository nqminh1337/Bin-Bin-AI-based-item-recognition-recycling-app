import { TabBarIcon } from '@components/TabBarIcon';
import { colors, palette, radii, spacing, typography } from '@theme/index';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MATERIAL_LABEL, MATERIAL_ORDER } from '../constants';
import type { MaterialType } from '../types';
import { SKIN_TINT } from './PetPlaceholder';

interface Props {
  unlockedSkinIds: MaterialType[];
  equippedSkinId: MaterialType | null;
  onEquip: (skinId: MaterialType | null) => void;
  disabled?: boolean;
}

/**
 * Lets the user equip any already-unlocked skin at any time, not just at the
 * moment it unlocks. There's no distinct skin art yet, so each swatch is
 * just the same tint PetPlaceholder uses — equipping only recolors the pet.
 */
export function SkinPicker({ unlockedSkinIds, equippedSkinId, onEquip, disabled }: Props) {
  return (
    <View style={styles.row}>
      <Swatch
        label="None"
        color={palette.gray200}
        selected={equippedSkinId === null}
        locked={false}
        disabled={disabled}
        onPress={() => onEquip(null)}
      />
      {MATERIAL_ORDER.map((m) => {
        const unlocked = unlockedSkinIds.includes(m);
        return (
          <Swatch
            key={m}
            label={MATERIAL_LABEL[m]}
            color={SKIN_TINT[m]}
            selected={equippedSkinId === m}
            locked={!unlocked}
            disabled={disabled}
            onPress={() => unlocked && onEquip(m)}
          />
        );
      })}
    </View>
  );
}

function Swatch({
  label,
  color,
  selected,
  locked,
  disabled,
  onPress,
}: {
  label: string;
  color: string;
  selected: boolean;
  locked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked || disabled, selected }}
      accessibilityLabel={locked ? `${label} skin, locked` : `${label} skin${selected ? ', equipped' : ''}`}
      onPress={onPress}
      disabled={locked || disabled}
      style={styles.item}
    >
      <View style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected, locked && styles.swatchLocked]}>
        {locked ? <TabBarIcon name="lock-closed" color={colors.textSecondary} size={14} /> : null}
      </View>
      <Text style={[styles.label, locked && styles.labelLocked]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  item: { alignItems: 'center', width: '16%', gap: spacing.xs },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE * 0.3,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderColor: colors.textPrimary },
  swatchLocked: { opacity: 0.45 },
  label: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  labelLocked: { color: palette.gray400 },
});