import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/theme';

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  order: number;
}

interface PhotoCollageProps {
  photos: Photo[];
  onPress?: () => void;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}

export function PhotoCollage({ photos, onPress, colors, colorScheme }: PhotoCollageProps) {
  const cardBackground = colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5';
  const placeholderColor = colorScheme === 'dark' ? '#2C2C2E' : '#E0E0E0';
  const photoCount = photos.length;

  if (photoCount === 0) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Staging Photos</Text>
        <View style={[styles.collageCard, { backgroundColor: cardBackground }]}>
          <View style={styles.collageWrapper}>
            {/* Back placeholder */}
            <View style={[styles.photoLayer, styles.photoBack, { backgroundColor: placeholderColor }]} />

            {/* Middle placeholder */}
            <View style={[styles.photoLayer, styles.photoMiddle, { backgroundColor: placeholderColor }]} />

            {/* Front placeholder with text */}
            <View style={[styles.photoLayer, styles.photoFront, styles.placeholderFront, { backgroundColor: placeholderColor }]}>
              <Text style={[styles.placeholderText, { color: colors.icon }]}>
                No staging photos yet
              </Text>
              <Text style={[styles.placeholderSubtext, { color: colors.icon }]}>
                Tap to add
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // Get up to 3 photos for the collage
  const displayPhotos = photos.slice(0, 3);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Staging Photos</Text>
      <View style={[styles.collageCard, { backgroundColor: cardBackground }]}>
        <View style={styles.collageWrapper}>
          {/* Back photo (third) - only if 3+ photos */}
          {displayPhotos.length >= 3 && (
            <View style={[styles.photoLayer, styles.photoBack, styles.photoLayerImage]}>
              <Image
                source={{ uri: displayPhotos[2].url }}
                style={styles.collageImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Middle photo (second) - only if 2+ photos */}
          {displayPhotos.length >= 2 && (
            <View style={[styles.photoLayer, styles.photoMiddle, styles.photoLayerImage]}>
              <Image
                source={{ uri: displayPhotos[1].url }}
                style={styles.collageImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Front photo (first) - always shown */}
          <View style={[styles.photoLayer, styles.photoFront, styles.photoLayerImage]}>
            <Image
              source={{ uri: displayPhotos[0].url }}
              style={styles.collageImage}
              resizeMode="cover"
            />
          </View>

          {/* Photo count badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{photoCount} photos</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    opacity: 0.6,
  },
  collageCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  collageWrapper: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLayer: {
    position: 'absolute',
    width: '75%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#ddd',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    // Shadow for Android
    elevation: 12,
  },
  photoLayerImage: {
    overflow: 'hidden',
  },
  photoBack: {
    transform: [{ rotate: '6deg' }, { translateX: 30 }, { scale: 0.9 }],
    zIndex: 1,
  },
  photoMiddle: {
    transform: [{ rotate: '-4deg' }, { translateX: -25 }, { scale: 0.95 }],
    zIndex: 2,
  },
  photoFront: {
    transform: [{ rotate: '0deg' }],
    zIndex: 3,
  },
  placeholderFront: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  collageImage: {
    width: '100%',
    height: '100%',
  },
  countBadge: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -45,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
