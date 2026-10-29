import { TabBarIcon } from '@components/TabBarIcon';
import { DisposalService, type StashItem } from '@features/disposal';
import { AUSTRALIAN_LGAS } from '@features/geolocation';
import { border, colors, radii, spacing, typography } from '@theme/index';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// FR-74/75: items saved from Route to the Bin, kept until their drop-off is
// confirmed. Opened from the bag button on the Home map. Tapping an item
// reopens its route, where "I dropped it off" awards the points and removes it.
export default function StashScreen() {
  const [items, setItems] = useState<StashItem[] | null>(null);

  // Reload on focus: coming back from a confirmed drop-off, the item is gone.
  useFocusEffect(
    useCallback(() => {
      void DisposalService.getStash().then(setItems);
    }, [])
  );

  const openRoute = (item: StashItem) => {
    router.push({
      pathname: '/route-to-bin',
      params: { itemId: item.itemId, label: item.itemLabel, zoneId: item.zoneId },
    });
  };

  const remove = (item: StashItem) => {
    Alert.alert('Remove from stash?', `${item.itemLabel} won’t earn points unless you scan it again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await DisposalService.removeFromStash(item.itemId);
          setItems(await DisposalService.getStash());
        },
      },
    ]);
  };

  if (items === null) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
        {items.length === 0 ? (
          <Text style={styles.muted}>
            Nothing saved. Items you save from a drop-off route stay here until you drop them off.
          </Text>
        ) : (
          <>
            <Text style={styles.muted}>Tap an item for its route to the nearest drop-off point.</Text>
            {items.map((item) => {
              const council = AUSTRALIAN_LGAS.find((z) => z.zoneId === item.zoneId)?.councilName ?? item.zoneId;
              return (
                <Pressable
                  key={item.itemId}
                  style={styles.row}
                  onPress={() => openRoute(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.itemLabel}. Show the route to drop it off`}
                >
                  <View style={styles.iconWrap}>
                    <TabBarIcon name="bag-handle-outline" color={colors.textPrimary} size={20} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.itemLabel}
                    </Text>
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {council} · saved {new Date(item.savedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => remove(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.itemLabel}`}
                  >
                    <TabBarIcon name="close" color={colors.textMuted} size={18} />
                  </Pressable>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  muted: { ...typography.caption, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.label, color: colors.textPrimary },
  rowSubtitle: { ...typography.caption, color: colors.textSecondary },
});
