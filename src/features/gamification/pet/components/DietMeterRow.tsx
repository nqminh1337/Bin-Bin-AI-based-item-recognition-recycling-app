import { colors, palette, radii, spacing, typography } from '@theme/index';
import { StyleSheet, Text, View } from 'react-native';
import { MATERIAL_LABEL } from '../constants';
import type { DietMeter, MaterialType } from '../types';

interface Props {
  material: MaterialType;
  meter: DietMeter;
  unlocked: boolean;
  equipped: boolean;
}

export function DietMeterRow({ material, meter, unlocked, equipped }: Props) {
  const ratio = meter.goal > 0 ? meter.fed / meter.goal : 0;

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>{MATERIAL_LABEL[material]}</Text>
        <Text style={styles.count}>{meter.fed} / {meter.goal}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(1, ratio) * 100}%` }]} />
      </View>
      {unlocked ? (
        <Text style={styles.sub}>{equipped ? 'Skin unlocked, equipped' : 'Skin unlocked'}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { ...typography.label, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  count: { ...typography.small, color: colors.textSecondary, flexShrink: 0 },
  track: { height: 7, borderRadius: radii.pill, backgroundColor: palette.gray200, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
  sub: { ...typography.small, color: colors.textSecondary },
});
