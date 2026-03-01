import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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

import AddressAutocomplete, { ParsedAddress } from '@/components/address-autocomplete';
import { Icons } from '@/components/icons';
import { useListings, Listing } from '@/context/listings-context';
import { apiUrl } from '@/lib/api-url';
import { authClient } from '@/lib/auth-client';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TOTAL_STEPS = 5;

interface CreateListingWizardProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (listing: Listing) => void;
}

interface NewListingForm {
  nickname: string;
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
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

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export default function CreateListingWizard({ visible, onClose, onComplete }: CreateListingWizardProps) {
  const { addListing, updateListing } = useListings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [step, setStep] = useState(1);
  const [createdListing, setCreatedListing] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1: Property details
  const [form, setForm] = useState<NewListingForm>(emptyForm);

  // Step 2: Check-in/out times
  const [checkInTime, setCheckInTime] = useState(() => timeStringToDate('16:00'));
  const [checkOutTime, setCheckOutTime] = useState(() => timeStringToDate('10:00'));

  // Step 3: Access info
  const [wifiNetwork, setWifiNetwork] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 4: Photos
  const [stagedAssets, setStagedAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  // Step 5: iCal links
  const [calendarLinks, setCalendarLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');

  const resetWizard = () => {
    setStep(1);
    setCreatedListing(null);
    setForm(emptyForm);
    setCheckInTime(timeStringToDate('16:00'));
    setCheckOutTime(timeStringToDate('10:00'));
    setWifiNetwork('');
    setWifiPassword('');
    setAccessNotes('');
    setShowPassword(false);
    setStagedAssets([]);
    setUploading(false);
    setCalendarLinks([]);
    setCurrentLink('');
    setSaving(false);
  };

  const handleClose = () => {
    if (createdListing) {
      onComplete(createdListing);
    } else {
      onClose();
    }
    resetWizard();
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  // Step 1: Create listing
  const handleCreateListing = async () => {
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
        setCreatedListing(newListing);
        goNext();
      } else {
        Alert.alert('Error', 'Failed to create listing. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Save check-in/out times
  const handleSaveCheckTimes = async () => {
    if (!createdListing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${createdListing.id}`,
        {
          method: 'PATCH',
          body: {
            defaultCheckInTime: dateToTimeString(checkInTime),
            defaultCheckOutTime: dateToTimeString(checkOutTime),
          },
        }
      );

      if (response.data?.listing) {
        setCreatedListing(response.data.listing);
        updateListing(response.data.listing);
      }
      goNext();
    } catch {
      Alert.alert('Error', 'Failed to save check times. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Step 3: Save access info
  const handleSaveAccessInfo = async () => {
    if (!createdListing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${createdListing.id}`,
        {
          method: 'PATCH',
          body: {
            wifiNetwork: wifiNetwork || null,
            wifiPassword: wifiPassword || null,
            accessNotes: accessNotes || null,
          },
        }
      );

      if (response.data?.listing) {
        setCreatedListing(response.data.listing);
        updateListing(response.data.listing);
      }
      goNext();
    } catch {
      Alert.alert('Error', 'Failed to save access info. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Step 4: Upload photos
  const pickPhotos = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Upload from your device', 'Take a photo'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openPhotoLibrary();
          if (buttonIndex === 2) openCamera();
        },
      );
    } else {
      Alert.alert('Add Photos', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload from your device', onPress: openPhotoLibrary },
        { text: 'Take a photo', onPress: openCamera },
      ]);
    }
  };

  const openPhotoLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 50,
    });

    if (result.canceled || result.assets.length === 0) return;
    setStagedAssets((prev) => [...prev, ...result.assets]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
    });

    if (result.canceled || result.assets.length === 0) return;
    setStagedAssets((prev) => [...prev, ...result.assets]);
  };

  const removeStagedPhoto = (uri: string) => {
    setStagedAssets((prev) => prev.filter((a) => a.uri !== uri));
  };

  const handleSavePhotos = async () => {
    if (!createdListing || stagedAssets.length === 0) {
      goNext();
      return;
    }

    setUploading(true);
    try {
      for (const asset of stagedAssets) {
        const mimeType = asset.mimeType || 'image/jpeg';

        const presignResponse = await authClient.$fetch<{
          presignedUrl: string;
          s3Key: string;
          expiresIn: number;
        }>(`${apiUrl}/api/listings/${createdListing.id}/photos/presign`, {
          method: 'POST',
          body: { contentType: mimeType },
        });

        if (!presignResponse.data) continue;

        const { presignedUrl, s3Key } = presignResponse.data;

        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();

        await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: blob,
        });

        await authClient.$fetch(`${apiUrl}/api/listings/${createdListing.id}/photos/confirm`, {
          method: 'POST',
          body: { s3Key },
        });
      }

      setStagedAssets([]);
      goNext();
    } catch {
      Alert.alert('Upload Failed', 'Some photos could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Step 5: Save iCal links
  const addLink = () => {
    const url = currentLink.trim();
    if (!url) return;
    setCalendarLinks((prev) => [...prev, url]);
    setCurrentLink('');
  };

  const removeLink = (index: number) => {
    setCalendarLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCalendarLinks = async () => {
    if (!createdListing || calendarLinks.length === 0) {
      handleClose();
      return;
    }

    setSaving(true);
    try {
      let latestListing = createdListing;
      for (const url of calendarLinks) {
        const response = await authClient.$fetch<{
          calendarLink: { id: string; url: string };
          listing: Listing;
        }>(`${apiUrl}/api/listings/${createdListing.id}/calendar-links`, {
          method: 'POST',
          body: { url },
        });

        if (response.data?.listing) {
          latestListing = response.data.listing;
        }
      }

      setCreatedListing(latestListing);
      updateListing(latestListing);
      handleClose();
    } catch {
      Alert.alert('Error', 'Failed to save calendar links. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = () => {
    switch (step) {
      case 1: return handleCreateListing();
      case 2: return handleSaveCheckTimes();
      case 3: return handleSaveAccessInfo();
      case 4: return handleSavePhotos();
      case 5: return handleSaveCalendarLinks();
    }
  };

  const isStep1Valid = form.nickname && form.streetAddress && form.city && form.state && form.zip;

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Property Details';
      case 2: return 'Check-in / Check-out';
      case 3: return 'Access Information';
      case 4: return 'Staging Photos';
      case 5: return 'iCal Links';
    }
  };

  const getPrimaryLabel = () => {
    if (step === TOTAL_STEPS) return 'Done';
    return 'Next';
  };

  const borderColor = colorScheme === 'dark' ? '#444' : '#DDD';
  const headerBorderColor = colorScheme === 'dark' ? '#333' : '#E5E5E5';

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            {
              backgroundColor: i + 1 <= step ? colors.tint : (colorScheme === 'dark' ? '#444' : '#DDD'),
            },
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <ScrollView
      style={styles.modalContent}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.modalContentContainer}
    >
      <View style={styles.formField}>
        <View style={[styles.inputContainer, { borderColor }]}>
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
        <AddressAutocomplete
          onAddressSelect={(address: ParsedAddress) => {
            setForm((prev) => ({
              ...prev,
              streetAddress: address.streetAddress,
              city: address.city || prev.city,
              state: address.state || prev.state,
              zip: address.zip || prev.zip,
              country: address.country || prev.country,
            }));
          }}
          onTextChange={(text) => setForm((prev) => ({ ...prev, streetAddress: text }))}
          borderColor={borderColor}
          labelColor={colors.icon}
          textColor={colors.text}
          placeholderColor={colors.icon}
        />
      </View>

      <View style={styles.formField}>
        <View style={[styles.inputContainer, { borderColor }]}>
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
        <View style={[styles.inputContainer, { borderColor }]}>
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

      <View style={[styles.rowFields, styles.formField]}>
        <View style={styles.halfField}>
          <View style={[styles.inputContainer, { borderColor }]}>
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
          <View style={[styles.inputContainer, { borderColor }]}>
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
        <View style={[styles.inputContainer, { borderColor }]}>
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
  );

  const renderStep2 = () => (
    <ScrollView
      style={styles.modalContent}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.modalContentContainer}
    >
      <View style={styles.timePickerField}>
        <Text style={[styles.timePickerLabel, { color: colors.text }]}>Check-in Time</Text>
        <DateTimePicker
          value={checkInTime}
          mode="time"
          display="spinner"
          minuteInterval={15}
          onChange={(_, date) => date && setCheckInTime(date)}
          themeVariant={colorScheme}
        />
      </View>
      <View style={styles.timePickerField}>
        <Text style={[styles.timePickerLabel, { color: colors.text }]}>Check-out Time</Text>
        <DateTimePicker
          value={checkOutTime}
          mode="time"
          display="spinner"
          minuteInterval={15}
          onChange={(_, date) => date && setCheckOutTime(date)}
          themeVariant={colorScheme}
        />
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView
      style={styles.modalContent}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.modalContentContainer}
    >
      <View style={styles.formField}>
        <View style={[styles.inputContainer, { borderColor }]}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>WiFi Network Name</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={wifiNetwork}
            onChangeText={setWifiNetwork}
            placeholder="Enter WiFi network name"
            placeholderTextColor={colors.icon}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.formField}>
        <View style={[styles.inputContainer, { borderColor }]}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>WiFi Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex, { color: colors.text }]}
              value={wifiPassword}
              onChangeText={setWifiPassword}
              placeholder="Enter WiFi password"
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? (
                <Icons.eyeOff size={20} color={colors.icon} />
              ) : (
                <Icons.eye size={20} color={colors.icon} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.formField}>
        <Text style={[styles.inputLabel, { color: colors.icon, marginBottom: 4 }]}>Access Notes</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              color: colors.text,
              borderColor,
            },
          ]}
          value={accessNotes}
          onChangeText={setAccessNotes}
          placeholder="Enter access instructions, supply locations, etc."
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView
      style={styles.modalContent}
      contentContainerStyle={styles.photoModalContent}
    >
      {stagedAssets.length === 0 && !uploading ? (
        <View style={styles.photoEmptyState}>
          <Icons.image size={48} color={colors.icon} />
          <Text style={[styles.photoEmptyTitle, { color: colors.text }]}>No photos yet</Text>
          <Text style={[styles.photoEmptySubtitle, { color: colors.icon }]}>
            Add staging photos for your property
          </Text>
          <Pressable
            style={[styles.pickPhotosButton, { backgroundColor: colors.tint }]}
            onPress={pickPhotos}
          >
            <Icons.plus size={18} color="white" />
            <Text style={styles.pickPhotosButtonText}>Add Photos</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.photoGridHeader}>
            <Text style={[styles.photoGridTitle, { color: colors.text }]}>
              {stagedAssets.length} photo{stagedAssets.length !== 1 ? 's' : ''} selected
            </Text>
            <Pressable
              onPress={pickPhotos}
              style={[styles.photoAddMore, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}
              disabled={uploading}
            >
              <Icons.plus size={16} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.photoGrid}>
            {stagedAssets.map((asset) => (
              <View key={asset.uri} style={styles.photoGridItem}>
                <Image
                  source={{ uri: asset.uri }}
                  style={styles.photoGridImage}
                  resizeMode="cover"
                />
                <Pressable
                  style={styles.photoDeleteButton}
                  onPress={() => removeStagedPhoto(asset.uri)}
                >
                  <Icons.x size={14} color="white" />
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}

      {uploading && (
        <View style={styles.uploadingIndicator}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.uploadingText, { color: colors.icon }]}>Uploading photos...</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView
      style={styles.modalContent}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.modalContentContainer}
    >
      <View style={styles.formField}>
        <View style={[styles.inputContainer, { borderColor }]}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>iCal URL</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex, { color: colors.text }]}
              value={currentLink}
              onChangeText={setCurrentLink}
              placeholder="https://..."
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={addLink}
              returnKeyType="done"
            />
            <Pressable
              onPress={addLink}
              style={[styles.addLinkButton, { backgroundColor: colors.tint }]}
              disabled={!currentLink.trim()}
            >
              <Icons.plus size={16} color="white" />
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={[styles.fieldHint, { color: colors.icon }]}>
        Paste iCal links from Airbnb, VRBO, or any booking platform to sync reservations.
      </Text>

      {calendarLinks.length > 0 && (
        <View style={[styles.linksList, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          {calendarLinks.map((url, index) => (
            <View
              key={index}
              style={[
                styles.linkItem,
                index < calendarLinks.length - 1 && styles.linkItemBorder,
              ]}
            >
              <Icons.calendar size={16} color={colors.icon} />
              <Text style={[styles.linkUrl, { color: colors.text }]} numberOfLines={1}>
                {url}
              </Text>
              <Pressable onPress={() => removeLink(index)} hitSlop={8}>
                <Icons.trash size={16} color={colors.icon} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: headerBorderColor }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{getStepTitle()}</Text>
          <Pressable onPress={handleClose} style={styles.modalCloseButton}>
            <View style={[styles.modalCloseCircle, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
              <Text style={[styles.modalCloseX, { color: colors.text }]}>x</Text>
            </View>
          </Pressable>
        </View>

        {renderStepIndicator()}

        {renderCurrentStep()}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalFooter, { borderTopColor: headerBorderColor }]}>
            {step === 1 ? (
              <Pressable onPress={handleClose} style={styles.cancelButton}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            ) : (
              <Pressable onPress={goNext} style={styles.cancelButton}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Skip</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handlePrimaryAction}
              style={[
                styles.saveButton,
                { backgroundColor: colors.tint },
                step === 1 && !isStep1Valid && styles.saveButtonDisabled,
              ]}
              disabled={saving || uploading || (step === 1 && !isStep1Valid)}
            >
              {saving || uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{getPrimaryLabel()}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: FontFamily.semiBold,
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
    fontFamily: FontFamily.regular,
    marginTop: -2,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontFamily: FontFamily.semiBold,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFlex: {
    flex: 1,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  // Time picker styles
  timePickerField: {
    marginBottom: 16,
  },
  timePickerLabel: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    marginBottom: 4,
  },
  // Text area
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    minHeight: 150,
  },
  fieldHint: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  // Photo styles
  photoModalContent: {
    padding: 20,
  },
  photoEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  photoEmptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    marginTop: 8,
  },
  photoEmptySubtitle: {
    fontSize: 14,
  },
  pickPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  pickPhotosButtonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
  },
  photoGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoGridTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
  },
  photoAddMore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoGridItem: {
    width: (Dimensions.get('window').width - 56) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  photoDeleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  uploadingText: {
    fontSize: 14,
  },
  // iCal link styles
  addLinkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  linksList: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  linkItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3333',
  },
  linkUrl: {
    flex: 1,
    fontSize: 14,
  },
});
