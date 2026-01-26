import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
import { useListings, Listing } from '@/context/listings-context';
import { authClient } from '@/lib/auth-client';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AddressForm {
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001';

function formatCheckInDate(dateString: string | null): string {
  if (!dateString) {
    return 'No upcoming check-ins';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface EditModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}

function EditModal({ visible, title, onClose, onSave, saving, children, colors, colorScheme }: EditModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <View style={[styles.modalCloseCircle, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
              <Text style={[styles.modalCloseX, { color: colors.text }]}>×</Text>
            </View>
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalContent}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.modalContentContainer}
        >
          {children}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalFooter, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function FormField({ label, value, onChangeText, placeholder, colors, colorScheme, autoCapitalize = 'sentences' }: FormFieldProps) {
  return (
    <View style={styles.formField}>
      <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
        <Text style={[styles.inputLabel, { color: colors.icon }]}>{label}</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.icon}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getListing, updateListing } = useListings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const listing = getListing(id);

  // Modal states
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nicknameForm, setNicknameForm] = useState('');
  const [addressForm, setAddressForm] = useState<AddressForm>({
    streetAddress: '',
    streetAddress2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  const formatAddress = (listing: Listing) => {
    const lines = [listing.streetAddress];
    if (listing.streetAddress2) {
      lines.push(listing.streetAddress2);
    }
    lines.push(`${listing.city}, ${listing.state} ${listing.zip}`);
    return lines;
  };

  const openNicknameModal = () => {
    if (listing) {
      setNicknameForm(listing.nickname);
      setNicknameModalVisible(true);
    }
  };

  const openAddressModal = () => {
    if (listing) {
      setAddressForm({
        streetAddress: listing.streetAddress,
        streetAddress2: listing.streetAddress2 || '',
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        country: listing.country,
      });
      setAddressModalVisible(true);
    }
  };

  const saveNickname = async () => {
    if (!listing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${listing.id}`,
        {
          method: 'PATCH',
          body: { nickname: nicknameForm },
        }
      );

      if (response.data?.listing) {
        updateListing(response.data.listing);
      }
      setNicknameModalVisible(false);
    } catch (err) {
      console.error('Failed to update nickname:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    if (!listing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${listing.id}`,
        {
          method: 'PATCH',
          body: {
            streetAddress: addressForm.streetAddress,
            streetAddress2: addressForm.streetAddress2 || null,
            city: addressForm.city,
            state: addressForm.state,
            zip: addressForm.zip,
            country: addressForm.country,
          },
        }
      );

      if (response.data?.listing) {
        updateListing(response.data.listing);
      }
      setAddressModalVisible(false);
    } catch (err) {
      console.error('Failed to update address:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!listing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Icons.chevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded }]}>
            Listing
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Listing not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icons.chevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded }]}>
          {listing.nickname}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.section} onPress={openNicknameModal}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Nickname</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            <Text style={[styles.nicknameText, { color: colors.text }]}>
              {listing.nickname}
            </Text>
          </View>
        </Pressable>

        <Pressable style={styles.section} onPress={openAddressModal}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Address</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            {formatAddress(listing).map((line, index) => (
              <Text key={index} style={[styles.addressLine, { color: colors.text }]}>
                {line}
              </Text>
            ))}
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Check-in</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            <Text style={[styles.checkInText, { color: colors.text }]}>
              {formatCheckInDate(listing.nextCheckIn)}
            </Text>
          </View>
        </View>

        {listing.calendarLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Calendar Links ({listing.calendarLinks.length})
            </Text>
            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
              {listing.calendarLinks.map((link, index) => (
                <View
                  key={link.id}
                  style={[
                    styles.calendarLinkItem,
                    index < listing.calendarLinks.length - 1 && styles.calendarLinkBorder,
                  ]}>
                  <Icons.calendar size={16} color={colors.icon} />
                  <Text
                    style={[styles.calendarLinkUrl, { color: colors.text }]}
                    numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Nickname Edit Modal */}
      <EditModal
        visible={nicknameModalVisible}
        title="Nickname"
        onClose={() => setNicknameModalVisible(false)}
        onSave={saveNickname}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <FormField
          label="Nickname"
          value={nicknameForm}
          onChangeText={setNicknameForm}
          placeholder="Enter a nickname for this listing"
          colors={colors}
          colorScheme={colorScheme}
        />
        <Text style={[styles.fieldHint, { color: colors.icon }]}>
          The nickname helps you identify this listing quickly.
        </Text>
      </EditModal>

      {/* Address Edit Modal */}
      <EditModal
        visible={addressModalVisible}
        title="Address"
        onClose={() => setAddressModalVisible(false)}
        onSave={saveAddress}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <FormField
          label="Street Address"
          value={addressForm.streetAddress}
          onChangeText={(text) => setAddressForm((prev) => ({ ...prev, streetAddress: text }))}
          placeholder="123 Main St"
          colors={colors}
          colorScheme={colorScheme}
        />
        <FormField
          label="Street Address 2"
          value={addressForm.streetAddress2}
          onChangeText={(text) => setAddressForm((prev) => ({ ...prev, streetAddress2: text }))}
          placeholder="Apt, suite, unit, etc. (optional)"
          colors={colors}
          colorScheme={colorScheme}
        />
        <FormField
          label="City"
          value={addressForm.city}
          onChangeText={(text) => setAddressForm((prev) => ({ ...prev, city: text }))}
          placeholder="City"
          colors={colors}
          colorScheme={colorScheme}
        />
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <FormField
              label="State"
              value={addressForm.state}
              onChangeText={(text) => setAddressForm((prev) => ({ ...prev, state: text }))}
              placeholder="State"
              colors={colors}
              colorScheme={colorScheme}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.halfField}>
            <FormField
              label="ZIP Code"
              value={addressForm.zip}
              onChangeText={(text) => setAddressForm((prev) => ({ ...prev, zip: text }))}
              placeholder="12345"
              colors={colors}
              colorScheme={colorScheme}
              autoCapitalize="none"
            />
          </View>
        </View>
        <FormField
          label="Country"
          value={addressForm.country}
          onChangeText={(text) => setAddressForm((prev) => ({ ...prev, country: text }))}
          placeholder="Country"
          colors={colors}
          colorScheme={colorScheme}
        />
      </EditModal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
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
  },
  content: {
    padding: 20,
  },
  section: {
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
  card: {
    borderRadius: 12,
    padding: 16,
  },
  nicknameText: {
    fontSize: 16,
  },
  addressLine: {
    fontSize: 16,
    lineHeight: 24,
  },
  checkInText: {
    fontSize: 16,
  },
  calendarLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  calendarLinkBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3333',
  },
  calendarLinkUrl: {
    flex: 1,
    fontSize: 14,
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
    minWidth: 80,
    alignItems: 'center',
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
  fieldHint: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
});
