import { PointsAwardedScreen, PointsService, STREAK_MILESTONE_DAYS } from '@features/gamification/points';
import { useAuthSession } from '@services/useAuthSession';
import { colors } from '@theme/index';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// FR-34/35: points have already been awarded by DisposalService before
// navigating here. This route only displays the earned points and balance.
export default function PointsAwardedRoute() {
  const { user } = useAuthSession();
  const { points, skinId, milestoneDays } = useLocalSearchParams<{ points?: string; skinId?: string; milestoneDays?: string }>();
  const pointsAwarded = Math.max(0, Number(points) || 0);
  const milestone = STREAK_MILESTONE_DAYS.find((days) => days === Number(milestoneDays)) ?? null;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    PointsService.getBalance(user.uid)
      .then((newBalance) => {
        if (!cancelled) setBalance(newBalance);
      })
      .catch((error) => {
        console.error('Failed to load points balance:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (balance === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark }}>
        <ActivityIndicator color={colors.textOnDark} />
      </View>
    );
  }

  return (
    <PointsAwardedScreen
      pointsAwarded={pointsAwarded}
      balance={balance}
      streakMilestoneDays={milestone}
      onContinue={() =>
        skinId
          ? router.replace({ pathname: '/skin-unlocked', params: { skinId } })
          : router.dismissTo('/')
      }
    />
  );
}
