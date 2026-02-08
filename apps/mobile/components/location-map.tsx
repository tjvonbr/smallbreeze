import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { Icons } from '@/components/icons';

const accessToken = Constants.expoConfig?.extra?.mapboxAccessToken ?? '';

interface LocationMapProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  colorScheme: 'light' | 'dark';
  colors: { text: string; icon: string };
}

export default function LocationMap({
  latitude,
  longitude,
  address,
  colorScheme,
  colors,
}: LocationMapProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitude != null && longitude != null
      ? { lat: latitude, lng: longitude }
      : null
  );
  const [loading, setLoading] = useState(coords === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (coords) return;

    const geocode = async () => {
      try {
        const encoded = encodeURIComponent(address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${accessToken}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        const feature = data?.features?.[0];
        if (feature?.center) {
          setCoords({ lng: feature.center[0], lat: feature.center[1] });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    geocode();
  }, []);

  if (error || (!loading && !coords)) return null;

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.icon} />
        </View>
      </View>
    );
  }

  const windowWidth = Dimensions.get('window').width;
  const mapWidth = Math.round(windowWidth - 40);
  const mapHeight = 200;
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coords!.lng},${coords!.lat},14/${mapWidth}x${mapHeight}@2x?access_token=${accessToken}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5',
          overflow: 'hidden',
          padding: 0,
        },
      ]}
    >
      <View style={styles.mapContainer}>
        <Image
          source={{ uri: mapUrl }}
          style={{ width: '100%', height: mapHeight }}
          resizeMode="cover"
        />
        <View style={styles.markerContainer}>
          <View style={styles.markerCircle}>
            <Icons.house size={22} color="white" />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    position: 'relative',
  },
  markerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -24,
    marginLeft: -24,
  },
  markerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
