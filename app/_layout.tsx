import { GeolocationService } from '@features/geolocation';
import { useAuthSession } from '@services/useAuthSession';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const { user, isLoading } = useAuthSession();

  // FR-18: ask for location up front, so the Home map and zone lookup work
  // from the first screen. The OS only shows the prompt while the permission
  // is undetermined, so this is a no-op on later launches.
  useEffect(() => {
    if (user) GeolocationService.requestPermission().catch(() => {});
  }, [user]);

  // Firebase restores the persisted session asynchronously on cold start;
  // hold on a splash so signed-in users don't get a flash of the sign-in screen.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isSignedIn = user !== null;

  return (
    <>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="disposal" options={{ headerShown: false }} />
          <Stack.Screen name="route-to-bin" options={{ headerShown: false }} />
          <Stack.Screen name="points-awarded" options={{ title: 'Points awarded', presentation: 'modal' }} />
          <Stack.Screen name="skin-unlocked" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="weekly-recap" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="stash" options={{ title: 'Saved for later' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
