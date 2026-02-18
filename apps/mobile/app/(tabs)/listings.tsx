import { useRouter } from 'expo-router';
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

import CreateListingWizard from '@/components/create-listing-wizard';
import { Icons } from '@/components/icons';
import { useListings, Listing } from '@/context/listings-context';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCheckInDate(dateString: string | null, hasCalendarLinks: boolean): string {
  if (!dateString) {
    return hasCalendarLinks ? 'No upcoming check-ins' : 'No iCal links added yet';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function ListingsScreen() {
  const router = useRouter();
  const { listings, loading, error, fetchListings } = useListings();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (listings.length === 0) {
      fetchListings();
    }
  }, [fetchListings, listings.length]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleWizardComplete = (listing: Listing) => {
    setModalVisible(false);
    router.push({
      pathname: '/listing/[id]',
      params: { id: listing.id, tab: 'info' },
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, [fetchListings]);

  const formatAddress = (listing: Listing) => {
    const parts = [listing.streetAddress];
    if (listing.streetAddress2) {
      parts.push(listing.streetAddress2);
    }
    parts.push(`${listing.city}, ${listing.state} ${listing.zip}`);
    return parts.join(', ');
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <Pressable
      style={styles.listingRow}
      onPress={() =>
        router.push({
          pathname: '/listing/[id]',
          params: { id: item.id },
        })
      }
    >
      <View style={styles.iconPlaceholder} />

      <View style={styles.listingContent}>
        <View style={styles.listingTopRow}>
          <Text style={styles.categoryLabel}>{item.nickname}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.listingMainRow}>
          <View style={styles.listingTextContent}>
            <Text style={[styles.listingTitle, { color: colors.text }]}>
              {formatAddress(item)}
            </Text>
            <Text style={styles.listingDescription} numberOfLines={1}>
              Next check-in: {formatCheckInDate(item.nextCheckIn, item.calendarLinks.length > 0)}
            </Text>
          </View>
          <View style={styles.indicator} />
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icons.house size={64} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
        Add your first property to get started
      </Text>
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.tint }]}
        onPress={openModal}
      >
        <Icons.plus size={20} color="white" />
        <Text style={styles.addButtonText}>Add Listing</Text>
      </Pressable>
    </View>
  );

  if (loading && listings.length === 0) {
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

  if (error && listings.length === 0) {
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
            onPress={fetchListings}
          >
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
        <Pressable
          style={[styles.headerAddButton, { backgroundColor: colors.tint }]}
          onPress={openModal}
        >
          <Icons.plus size={20} color="white" />
        </Pressable>
      </View>
      {listings.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item: Listing) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
        />
      )}

      <CreateListingWizard
        visible={modalVisible}
        onClose={closeModal}
        onComplete={handleWizardComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  listingRow: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  listingContent: {
    flex: 1,
  },
  listingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  dateText: {
    fontSize: 13,
    color: '#999',
  },
  listingMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listingTextContent: {
    flex: 1,
    paddingRight: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E85D4C',
    marginTop: 4,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
