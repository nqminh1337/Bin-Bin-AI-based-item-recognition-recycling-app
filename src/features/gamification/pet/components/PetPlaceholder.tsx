import { colors, palette } from '@theme/index';
import { StyleSheet, View } from 'react-native';
import type { MaterialType } from '../types';

interface Props {
  skinId: MaterialType | null;
  size?: number;
}

export const SKIN_TINT: Record<MaterialType, string> = {
  cardboard: '#D9C4A3',
  glass: '#BFD9D2',
  aluminium: '#C9CDD2',
  soft_plastic: '#E3C9D6',
  paper: '#F2E4C9',
  steel: '#AEB8C2',
  hard_plastic: '#AFC8E8',
  organics: '#B8D5A3',
  ewaste: '#B7A8D8',
  battery: '#F0D27A',
  textiles: '#D9B5A7',
  general_waste: '#C4B8AC',
  uncategorized: palette.gray200,
};

/**
 * PLACEHOLDER for the Bin Bin render until the real design/AR asset lands.
 * Swap the body of this component for an <Image> or Lottie and every
 * screen that imports it updates together.
 */
export function PetPlaceholder({ skinId, size = 120 }: Props) {
  const eye = Math.max(6, size * 0.09);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={skinId ? `Bin Bin wearing the ${skinId.replace('_', ' ')} skin` : 'Bin Bin with no skin'}
      style={[
        styles.body,
        {
          width: size,
          height: size,
          borderRadius: size * 0.24,
          backgroundColor: skinId ? SKIN_TINT[skinId] : palette.gray200,
        },
      ]}
    >
      <View style={[styles.eyes, { gap: size * 0.2 }]}>
        <View style={{ width: eye, height: eye, borderRadius: eye, backgroundColor: colors.textPrimary }} />
        <View style={{ width: eye, height: eye, borderRadius: eye, backgroundColor: colors.textPrimary }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row' },
});
