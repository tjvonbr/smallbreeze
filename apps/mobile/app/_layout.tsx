import '@/lib/geofencing';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ListingsProvider, useListings } from '@/context/listings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProximityNotifications } from '@/hooks/use-proximity-notifications';
import { authClient } from '@/lib/auth-client';

export const unstable_settings = {
  anchor: '(tabs)',
};

function GeofenceManager() {
  const { listings } = useListings();
  useProximityNotifications(listings);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = !!session;

  if (isPending) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ListingsProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
            </Stack>
            <StatusBar style="auto" />
          </ListingsProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ListingsProvider>
          <GeofenceManager />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="listing/[id]" />
            <Stack.Screen name="day/[date]" />
            <Stack.Screen name="invites" />
            <Stack.Screen name="tasks" />
            <Stack.Screen name="year" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ListingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
