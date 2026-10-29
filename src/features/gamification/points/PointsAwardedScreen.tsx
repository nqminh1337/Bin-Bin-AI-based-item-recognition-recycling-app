import { colors } from '@theme/index';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';


interface PointsAwardedScreenProps {
  pointsAwarded: number;
  balance: number;
  streakMilestoneDays?: number | null;
  onContinue: () => void;
}

export function PointsAwardedScreen({
  pointsAwarded,
  balance,
  streakMilestoneDays,
  onContinue,
}: PointsAwardedScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>SORT COMPLETE</Text>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardSymbol}>✓</Text>
        </View>

        <Text style={styles.points}>+{pointsAwarded} points!</Text>

        <Text style={styles.description}>
          Item sorted correctly.
        </Text>

        <Text style={styles.balance}>
          Balance is now {balance}.
        </Text>

        {streakMilestoneDays != null && (
          <View
            style={styles.milestoneCard}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={`${streakMilestoneDays}-day streak achievement unlocked`}
          >
            <Text style={styles.milestoneIcon}>🏆</Text>
            <Text style={styles.milestoneHeading}>STREAK REWARD UNLOCKED!</Text>
            <Text style={styles.milestoneReward}>
              {streakMilestoneDays}-day streak achievement
            </Text>
            <Text style={styles.milestoneDescription}>
              You sorted correctly on {streakMilestoneDays} consecutive days. Keep it going!
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={styles.button}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue after points awarded"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },

  contentScroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },

  label: {
    fontSize: 12,
    letterSpacing: 2,
    color: colors.textOnDark,
    opacity: 0.7,
    marginBottom: 30,
  },

  rewardBox: {
    width: 180,
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  rewardSymbol: {
    fontSize: 64,
    color: colors.textOnDark,
  },

  points: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textOnDark,
    marginBottom: 12,
  },

  description: {
    fontSize: 16,
    color: colors.textOnDark,
    opacity: 0.85,
    textAlign: 'center',
  },

  balance: {
    fontSize: 16,
    color: colors.textOnDark,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: 4,
  },

  milestoneCard: {
    marginTop: 28,
    width: '100%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(78,122,90,0.20)',
    alignItems: 'center',
  },
  milestoneIcon: { fontSize: 36, marginBottom: 8 },
  milestoneHeading: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: colors.textOnDark },
  milestoneReward: { fontSize: 22, fontWeight: '700', color: colors.textOnDark, marginTop: 8 },
  milestoneDescription: { fontSize: 13, color: colors.textOnDark, opacity: 0.85, textAlign: 'center', marginTop: 8 },

  button: {
    backgroundColor: colors.textOnDark,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },

  buttonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: '600',
  },
});