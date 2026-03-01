import '@/lib/geofencing';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  LeagueSpartan_400Regular,
  LeagueSpartan_500Medium,
  LeagueSpartan_600SemiBold,
  LeagueSpartan_700Bold,
  LeagueSpartan_800ExtraBold,
} from '@expo-google-fonts/league-spartan';
import { useFonts } from 'expo-font';
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, Text } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { ListingsProvider, useListings } from '@/context/listings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProximityNotifications } from '@/hooks/use-proximity-notifications';
import { authClient } from '@/lib/auth-client';

SplashScreen.preventAutoHideAsync();

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

  const [fontsLoaded] = useFonts({
    LeagueSpartan_400Regular,
    LeagueSpartan_500Medium,
    LeagueSpartan_600SemiBold,
    LeagueSpartan_700Bold,
    LeagueSpartan_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (isPending) {
    const bg = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;
    const tint = colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint;
    const text = colorScheme === 'dark' ? Colors.dark.text : Colors.light.text;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <Text style={{ fontSize: 28, color: text, fontFamily: FontFamily.bold, marginBottom: 24 }}>
          smallbreeze
        </Text>
        <ActivityIndicator size="small" color={tint} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ListingsProvider>
          {isAuthenticated && <GeofenceManager />}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="listing/[id]" />
            <Stack.Screen name="day/[date]" />
            <Stack.Screen name="invites" />
            <Stack.Screen name="tasks" />
            <Stack.Screen name="year" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          {isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)" />}
          <StatusBar style="auto" />
        </ListingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
