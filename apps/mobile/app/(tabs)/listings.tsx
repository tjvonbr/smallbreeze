import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
import { useListings, Listing } from '@/context/listings-context';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface NewListingForm {
  nickname: string;
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

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

function formatCheckInDate(dateString: string | null): string {
  if (!dateString) {
    return 'No upcoming check-ins';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const emptyForm: NewListingForm = {
  nickname: '',
  streetAddress: '',
  streetAddress2: '',
  city: '',
  state: '',
  zip: '',
  country: 'United States',
};

export default function ListingsScreen() {
  const router = useRouter();
  const { listings, loading, error, fetchListings, addListing } = useListings();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<NewListingForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listings.length === 0) {
      fetchListings();
    }
  }, [fetchListings, listings.length]);

  const openModal = () => {
    setForm(emptyForm);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (!form.nickname || !form.streetAddress || !form.city || !form.state || !form.zip || !form.country) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const newListing = await addListing({
        nickname: form.nickname,
        streetAddress: form.streetAddress,
        streetAddress2: form.streetAddress2 || undefined,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      });

      if (newListing) {
        closeModal();
        router.push({
          pathname: '/listing/[id]',
          params: { id: newListing.id, tab: 'info' },
        });
      } else {
        Alert.alert('Error', 'Failed to create listing. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setSaving(false);
    }
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
              Next check-in: {formatCheckInDate(item.nextCheckIn)}
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

      {/* Add Listing Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Listing</Text>
            <Pressable onPress={closeModal} style={styles.modalCloseButton}>
              <View style={[styles.modalCloseCircle, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
                <Text style={[styles.modalCloseX, { color: colors.text }]}>×</Text>
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalContentContainer}
          >
            <View style={styles.formField}>
              <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>Nickname</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={form.nickname}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, nickname: text }))}
                  placeholder="Beach House, Mountain Cabin, etc."
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formField}>
              <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>Street Address</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={form.streetAddress}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, streetAddress: text }))}
                  placeholder="123 Main St"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formField}>
              <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>Street Address 2</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={form.streetAddress2}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, streetAddress2: text }))}
                  placeholder="Apt, suite, unit (optional)"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formField}>
              <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>City</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={form.city}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                  <Text style={[styles.inputLabel, { color: colors.icon }]}>State</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={form.state}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, state: text }))}
                    placeholder="State"
                    placeholderTextColor={colors.icon}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={styles.halfField}>
                <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                  <Text style={[styles.inputLabel, { color: colors.icon }]}>ZIP Code</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={form.zip}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, zip: text }))}
                    placeholder="12345"
                    placeholderTextColor={colors.icon}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formField}>
              <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>Country</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={form.country}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, country: text }))}
                  placeholder="Country"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.modalFooter, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
              <Pressable onPress={closeModal} style={styles.cancelButton}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.tint },
                  (!form.nickname || !form.streetAddress || !form.city || !form.state || !form.zip) && styles.saveButtonDisabled,
                ]}
                disabled={saving || !form.nickname || !form.streetAddress || !form.city || !form.state || !form.zip}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Create</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
  },
  modalCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseX: {
    fontSize: 20,
    fontWeight: '400',
    marginTop: -2,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 17,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  // Form styles
  formField: {
    marginBottom: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    fontSize: 17,
    padding: 0,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
});
