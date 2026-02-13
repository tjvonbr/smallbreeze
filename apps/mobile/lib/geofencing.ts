import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { GeofencingEventType } from 'expo-location';

export const GEOFENCING_TASK_NAME = 'PROXIMITY_GEOFENCING';

const CACHE_KEY = 'geofence_listings';

interface CachedListing {
  id: string;
  nickname: string;
  nextCheckIn: string | null;
}

export async function cacheListingsForGeofencing(
  listings: CachedListing[]
): Promise<void> {
  const map: Record<string, CachedListing> = {};
  for (const l of listings) {
    map[l.id] = l;
  }
  await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(map));
}

async function getCachedListing(
  listingId: string
): Promise<CachedListing | null> {
  const raw = await SecureStore.getItemAsync(CACHE_KEY);
  if (!raw) return null;
  const map: Record<string, CachedListing> = JSON.parse(raw);
  return map[listingId] ?? null;
}

TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Geofencing] Task error:', error.message);
    return;
  }

  const { eventType, region } = data as {
    eventType: GeofencingEventType;
    region: { identifier: string };
  };

  if (eventType !== GeofencingEventType.Enter) return;

  const listingId = region.identifier;
  const listing = await getCachedListing(listingId);

  const title = listing
    ? `You're near ${listing.nickname}`
    : "You're near a listing";

  const checkInText =
    listing?.nextCheckIn
      ? `Next check-in: ${new Date(listing.nextCheckIn).toLocaleDateString()}`
      : 'No upcoming check-ins';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: checkInText,
      data: { listingId },
      ...(require('react-native').Platform.OS === 'android' && {
        channelId: 'proximity',
      }),
    },
    trigger: null,
  });
});
