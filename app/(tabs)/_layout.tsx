import { TabBarIcon } from '@components/TabBarIcon';
import { colors, radii } from '@theme/index';
import { Tabs, router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

// FR-62: bottom navigation bar with Map, Ranks, Pet, and Profile tabs.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          headerShown: false, // Home draws its own header (stats + map, proto 01)
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'map' : 'map-outline'} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'trophy' : 'trophy-outline'} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan-action"
        options={{
          title: '',
          tabBarItemStyle: { backgroundColor: 'transparent' },
          tabBarButton: () => (
            <Pressable
              style={styles.scanButton}
              onPress={() => router.push('/scan')}
              accessibilityRole="button"
              accessibilityLabel="Scan item"
            >
              <TabBarIcon name="camera" color={colors.textOnDark} size={28} />
            </Pressable>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/scan');
          },
        }}
      />
      <Tabs.Screen
        name="pet"
        options={{
          title: 'Pet',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'paw' : 'paw-outline'} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color as string} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <TabBarIcon name="settings-outline" color={colors.textPrimary} size={22} />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: { paddingHorizontal: 16 },
  scanButton: {
    top: -20,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
