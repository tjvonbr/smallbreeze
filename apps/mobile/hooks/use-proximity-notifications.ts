import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { type Listing } from '@/context/listings-context';
import {
  GEOFENCING_TASK_NAME,
  cacheListingsForGeofencing,
} from '@/lib/geofencing';

function fingerprintListings(
  listings: { id: string; latitude: number; longitude: number }[]
): string {
  return listings
    .map((l) => `${l.id}:${l.latitude}:${l.longitude}`)
    .sort()
    .join('|');
}

async function requestPermissions(): Promise<boolean> {
  // 1. Notification permissions
  const { status: notifStatus } =
    await Notifications.requestPermissionsAsync();
  if (notifStatus !== 'granted') {
    Alert.alert(
      'Notifications Disabled',
      'Enable notifications to get alerts when you arrive at a listing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // 2. Foreground location
  const { status: fgStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    Alert.alert(
      'Location Access Required',
      'Allow location access to get notified when you arrive at a listing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // 3. Background location
  const { status: bgStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    Alert.alert(
      'Background Location Required',
      'Allow "Always" location access so you can be notified when arriving at a listing, even when the app is closed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  return true;
}

export function useProximityNotifications(listings: Listing[]) {
  const fingerprintRef = useRef<string>('');
  const permissionsGrantedRef = useRef<boolean | null>(null);

  // Request permissions on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('proximity', {
          name: 'Proximity Alerts',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const granted = await requestPermissions();
      if (!cancelled) {
        permissionsGrantedRef.current = granted;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Register geofences when listings change
  useEffect(() => {
    if (permissionsGrantedRef.current === false) return;

    const geoListings = listings.filter(
      (l): l is Listing & { latitude: number; longitude: number } =>
        l.latitude != null && l.longitude != null
    );

    const newFingerprint = fingerprintListings(geoListings);
    if (newFingerprint === fingerprintRef.current) return;
    fingerprintRef.current = newFingerprint;

    (async () => {
      // Wait for permissions if they haven't resolved yet
      if (permissionsGrantedRef.current === null) {
        const granted = await requestPermissions();
        permissionsGrantedRef.current = granted;
        if (!granted) return;
      }

      if (geoListings.length === 0) {
        const isRegistered = await Location.hasStartedGeofencingAsync(
          GEOFENCING_TASK_NAME
        ).catch(() => false);
        if (isRegistered) {
          await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
        }
        return;
      }

      // Cache listing data for the background task
      await cacheListingsForGeofencing(
        geoListings.map((l) => ({
          id: l.id,
          nickname: l.nickname,
          nextCheckIn: l.nextCheckIn,
        }))
      );

      const regions = geoListings.map((l) => ({
        identifier: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        radius: 76.2, // 250 feet
        notifyOnEnter: true,
        notifyOnExit: false,
      }));

      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
    })();
  }, [listings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME)
        .then((started) => {
          if (started) {
            Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
          }
        })
        .catch(() => {});
    };
  }, []);
}
