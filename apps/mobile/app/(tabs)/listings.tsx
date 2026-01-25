import Constants from 'expo-constants';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
import { authClient } from '@/lib/auth-client';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CalendarLink {
  id: string;
  url: string;
  listingId: string;
  createdAt: string;
  updatedAt: string;
}

interface Listing {
  id: string;
  nickname: string;
  streetAddress: string;
  streetAddress2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  teamId: string;
  calendarLinks: CalendarLink[];
  createdAt: string;
  updatedAt: string;
}

const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001';

export default function ListingsScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchListings = useCallback(async () => {
    try {
      setError(null);
      const response = await authClient.$fetch<{ listings: Listing[] }>(
        `${apiUrl}/api/listings`
      );

      if (!response.data) {
        throw new Error('Failed to fetch listings');
      }

      setListings(response.data.listings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, [fetchListings]);

  const formatAddress = (listing: Listing) => {
    const parts = [listing.streetAddress];
    if (listing.streetAddress2) {
      parts.push(listing.streetAddress2);
    }
    parts.push(`${listing.city}, ${listing.state} ${listing.zip}`);
    return parts.join('\n');
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <View style={[styles.listingCard, { backgroundColor: colors.background }]}>
      <View style={styles.listingHeader}>
        <Icons.house size={20} color={colors.tint} />
        <Text style={[styles.listingNickname, { color: colors.text }]}>{item.nickname}</Text>
      </View>
      <Text style={[styles.listingAddress, { color: colors.icon }]}>{formatAddress(item)}</Text>
      <View style={styles.listingMeta}>
        <Text style={[styles.listingMetaText, { color: colors.icon }]}>
          {item.calendarLinks.length} calendar{item.calendarLinks.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icons.house size={64} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
        Add your first property from the web app to get started
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded }]}>
            Listings
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded }]}>
            Listings
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchListings}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded }]}>
          Listings
        </Text>
      </View>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={listings.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  listingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  listingNickname: {
    fontSize: 18,
    fontWeight: '600',
  },
  listingAddress: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingMetaText: {
    fontSize: 13,
  },
});
