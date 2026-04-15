import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
import LocationMap from '@/components/location-map';
import { PhotoCollage, Photo } from '@/components/photo-collage';
import { useListings, Listing } from '@/context/listings-context';
import { apiUrl } from '@/lib/api-url';
import { authClient } from '@/lib/auth-client';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Reservation, parseICalText } from '@/lib/ical-parser';

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

interface AddressForm {
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface WifiForm {
  wifiNetwork: string;
  wifiPassword: string;
}

type TabType = 'calendar' | 'info';

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

// Tab Bar Component
interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}

function TabBar({ activeTab, onTabChange, colors, colorScheme }: TabBarProps) {
  return (
    <View style={[styles.tabBar, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5', backgroundColor: colors.background }]}>
      <Pressable
        style={styles.tab}
        onPress={() => onTabChange('calendar')}
      >
        <Icons.calendar size={24} color={activeTab === 'calendar' ? colors.tint : colors.icon} />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'calendar' ? colors.tint : colors.icon },
          ]}
        >
          Calendar
        </Text>
      </Pressable>
      <Pressable
        style={styles.tab}
        onPress={() => onTabChange('info')}
      >
        <Icons.house size={24} color={activeTab === 'info' ? colors.tint : colors.icon} />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'info' ? colors.tint : colors.icon },
          ]}
        >
          Info
        </Text>
      </Pressable>
    </View>
  );
}

// Calendar types and helpers

interface MonthData {
  year: number;
  month: number;
  key: string;
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  // Normalize all dates to YYYY-MM-DD strings for comparison to avoid timezone issues
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return dateStr >= startStr && dateStr < endStr;
}

// Calendar Tab Content
interface CalendarTabProps {
  listing: Listing;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}

function CalendarTab({ listing, colors, colorScheme }: CalendarTabProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Generate months (12 months back, current, 24 months forward)
  const months = useMemo(() => {
    const result: MonthData[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    for (let i = -12; i <= 24; i++) {
      let month = currentMonth + i;
      let year = currentYear;
      while (month < 0) {
        month += 12;
        year -= 1;
      }
      while (month > 11) {
        month -= 12;
        year += 1;
      }
      result.push({ year, month, key: `${year}-${month}` });
    }
    return result;
  }, []);

  const initialScrollIndex = 12; // Current month

  useEffect(() => {
    fetchReservations();
  }, [listing.calendarLinks]);

  const fetchReservations = async () => {
    try {
      const allEvents: Reservation[] = [];

      for (const calendarLink of listing.calendarLinks) {
        try {
          const response = await fetch(calendarLink.url);
          const icalText = await response.text();
          const events = parseICalText(icalText);
          const url = calendarLink.url.toLowerCase();
          const source = url.includes('airbnb') ? 'Airbnb'
            : (url.includes('vrbo') || url.includes('homeaway')) ? 'VRBO'
            : undefined;
          for (const event of events) {
            event.source = source;
          }
          allEvents.push(...events);
        } catch (err) {
          console.error('Failed to fetch calendar:', calendarLink.url, err);
        }
      }

      allEvents.sort((a, b) => a.start.localeCompare(b.start));
      setReservations(allEvents);
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check what's happening on a given date
  const getDateStatus = useCallback((date: Date) => {
    let hasCheckIn = false;  // A reservation starts on this day (right half)
    let hasCheckOut = false; // A reservation ends on this day (left half)
    let hasMiddle = false;   // A reservation spans through this day

    for (const res of reservations) {
      const start = new Date(res.start);
      const end = new Date(res.end);

      // Check if this is a check-in day (reservation starts)
      if (isSameDay(date, start)) {
        hasCheckIn = true;
      }

      // Check if this is a check-out day (reservation ends)
      // Note: iCal end dates are exclusive, so the last night is end - 1 day
      // But checkout day is the actual end date
      if (isSameDay(date, end)) {
        hasCheckOut = true;
      }

      // Check if this is a middle day (between start and end, exclusive)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

      if (dateStr > startStr && dateStr < endStr) {
        hasMiddle = true;
      }
    }

    return { hasCheckIn, hasCheckOut, hasMiddle };
  }, [reservations]);

  const renderMonth = useCallback(({ item }: { item: MonthData }) => {
    const { year, month } = item;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    // Build weeks array
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining days in last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    // Compute source labels that span across multiple day cells per week
    const getWeekLabels = (week: (number | null)[]) => {
      const labels: { startCol: number; endCol: number; source: string }[] = [];
      for (const res of reservations) {
        if (!res.source) continue;
        const start = new Date(res.start);
        const end = new Date(res.end);
        // Find column index of check-in day in this week
        let startCol = -1;
        for (let col = 0; col < 7; col++) {
          if (week[col] !== null) {
            const cellDate = new Date(year, month, week[col]!);
            if (isSameDay(cellDate, start)) {
              startCol = col;
              break;
            }
          }
        }
        if (startCol === -1) continue;
        // Skip label if the check-in bar is hidden by a middle bar from another reservation
        const checkInDate = new Date(year, month, week[startCol]!);
        if (getDateStatus(checkInDate).hasMiddle) continue;
        // Find last column the reservation spans in this week
        let endCol = startCol;
        for (let col = startCol + 1; col < 7; col++) {
          if (week[col] === null) break;
          const cellDate = new Date(year, month, week[col]!);
          // Reservation spans through days between start (exclusive) and end (exclusive in iCal)
          const cellStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
          const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
          if (cellStr < endStr) {
            endCol = col;
          } else {
            break;
          }
        }
        labels.push({ startCol, endCol, source: res.source });
      }
      return labels;
    };

    return (
      <View style={styles.monthContainer}>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {getMonthName(month)} {year}
        </Text>

        {/* Week days header */}
        <View style={styles.weekDaysHeader}>
          {DAYS_OF_WEEK.map((day, index) => (
            <View key={index} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderText, { color: colors.icon }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar weeks */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const cellBorderColor = colorScheme === 'dark' ? '#333' : '#E5E5E5';

              if (day === null) {
                return <View key={dayIndex} style={[styles.dayCell, { borderColor: cellBorderColor }]} />;
              }

              const date = new Date(year, month, day);
              const isToday = isSameDay(date, today);
              const { hasCheckIn, hasCheckOut, hasMiddle } = getDateStatus(date);
              const pillColor = colorScheme === 'dark' ? '#444' : '#222';

              // Determine what type of bar to render
              // If hasMiddle is true, the day is in the middle of at least one booking,
              // so always show the full bar (overlapping check-ins/check-outs from other
              // events shouldn't create rounded edges on a fully-booked day).
              const isTurnover = hasCheckIn && hasCheckOut;

              return (
                <View key={dayIndex} style={[styles.dayCell, { borderColor: cellBorderColor }]}>
                  {/* Day number at top */}
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.text },
                      isToday && styles.todayText,
                      isToday && { color: colors.tint },
                    ]}
                  >
                    {day}
                  </Text>
                  {/* Full-width bar for middle days */}
                  {hasMiddle && (
                    <View style={styles.barLayerFull}>
                      <View style={[styles.barFillFull, { backgroundColor: pillColor }]} />
                    </View>
                  )}
                  {/* Checkout bar (only when not a middle day) */}
                  {hasCheckOut && !hasMiddle && (
                    <View style={styles.barLayerLeft}>
                      <View
                        style={[
                          styles.barFillLeft,
                          styles.barEndRight,
                          { backgroundColor: pillColor }
                        ]}
                      />
                      <View style={styles.barSpacerSmall} />
                    </View>
                  )}
                  {/* Checkin bar (only when not a middle day) */}
                  {hasCheckIn && !hasMiddle && (
                    <View style={styles.barLayerRight}>
                      <View style={styles.barSpacerSmall} />
                      <View
                        style={[
                          styles.barFillRight,
                          styles.barEndLeft,
                          { backgroundColor: pillColor },
                        ]}
                      />
                    </View>
                  )}
                </View>
              );
            })}
            {/* Source labels overlay spanning multiple cells */}
            {getWeekLabels(week).map((label, labelIndex) => (
              <Text
                key={labelIndex}
                style={[
                  styles.barSourceLabel,
                  {
                    left: `${((label.startCol + 0.55) / 7) * 100}%`,
                    width: `${((label.endCol - label.startCol + 0.45) / 7) * 100}%`,
                  },
                ]}
                numberOfLines={1}
              >
                {label.source}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }, [colors, colorScheme, getDateStatus, reservations]);

  if (loading) {
    return (
      <View style={styles.calendarContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (listing.calendarLinks.length === 0) {
    return (
      <View style={styles.calendarEmpty}>
        <Text style={[styles.calendarEmptyText, { color: colors.icon }]}>
          No iCal links have been added for this listing yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.calendarWrapper}>
      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonth}
        keyExtractor={(item) => item.key}
        initialScrollIndex={initialScrollIndex}
        getItemLayout={(data, index) => ({
          length: 500,
          offset: 500 * index,
          index,
        })}
        extraData={reservations}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.calendarListContent}
      />
    </View>
  );
}

// Info Tab Content
interface InfoTabProps {
  listing: Listing;
  photos: Photo[];
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  onEditNickname: () => void;
  onEditAddress: () => void;
  onEditWiFi: () => void;
  onEditAccessNotes: () => void;
  onEditCheckTimes: () => void;
  onPhotosPress: () => void;
  onAddCalendarLink: () => void;
}

function InfoTab({ listing, photos, colors, colorScheme, onEditNickname, onEditAddress, onEditWiFi, onEditAccessNotes, onEditCheckTimes, onPhotosPress, onAddCalendarLink }: InfoTabProps) {
  const formatAddress = (listing: Listing) => {
    const lines = [listing.streetAddress];
    if (listing.streetAddress2) {
      lines.push(listing.streetAddress2);
    }
    lines.push(`${listing.city}, ${listing.state} ${listing.zip}`);
    return lines;
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <PhotoCollage
        photos={photos}
        onPress={onPhotosPress}
        colors={colors}
        colorScheme={colorScheme}
      />

      <Pressable style={styles.section} onPress={onEditNickname}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Nickname</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          <Text style={[styles.nicknameText, { color: colors.text }]}>
            {listing.nickname}
          </Text>
        </View>
      </Pressable>

      <Pressable style={styles.section} onPress={onEditAddress}>
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
        <LocationMap
          latitude={listing.latitude}
          longitude={listing.longitude}
          address={`${listing.streetAddress}, ${listing.city}, ${listing.state} ${listing.zip}`}
          colorScheme={colorScheme}
          colors={colors}
        />
      </View>

      <Pressable style={styles.section} onPress={onEditWiFi}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>WiFi</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          {listing.wifiNetwork ? (
            <View style={styles.wifiRow}>
              <Icons.wifi size={18} color={colors.icon} />
              <Text style={[styles.wifiText, { color: colors.text }]}>
                {listing.wifiNetwork}
              </Text>
            </View>
          ) : (
            <Text style={[styles.wifiPlaceholder, { color: colors.icon }]}>
              No WiFi info added
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable style={styles.section} onPress={onEditAccessNotes}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Access Notes</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          {listing.accessNotes ? (
            <Text style={[styles.accessNotesText, { color: colors.text }]} numberOfLines={3}>
              {listing.accessNotes}
            </Text>
          ) : (
            <Text style={[styles.accessNotesPlaceholder, { color: colors.icon }]}>
              No access notes added
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable style={styles.section} onPress={onEditCheckTimes}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Check-in / Check-out</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          <View style={styles.checkTimesRow}>
            <View style={styles.checkTimeItem}>
              <Text style={[styles.checkTimeLabel, { color: colors.icon }]}>Check-in</Text>
              <Text style={[styles.checkTimeValue, { color: colors.text }]}>
                {formatTime(listing.defaultCheckInTime)}
              </Text>
            </View>
            <View style={[styles.checkTimeDivider, { backgroundColor: colorScheme === 'dark' ? '#444' : '#DDD' }]} />
            <View style={styles.checkTimeItem}>
              <Text style={[styles.checkTimeLabel, { color: colors.icon }]}>Check-out</Text>
              <Text style={[styles.checkTimeValue, { color: colors.text }]}>
                {formatTime(listing.defaultCheckOutTime)}
              </Text>
            </View>
          </View>
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            iCal Links{listing.calendarLinks.length > 0 ? ` (${listing.calendarLinks.length})` : ''}
          </Text>
        </View>
        <Pressable onPress={onAddCalendarLink}>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          {listing.calendarLinks.length === 0 ? (
            <View style={styles.calendarLinkEmpty}>
              <Icons.link size={18} color={colors.icon} />
              <Text style={[styles.calendarLinkEmptyText, { color: colors.icon }]}>
                Add an iCal link to sync reservations
              </Text>
            </View>
          ) : (
            listing.calendarLinks.map((link, index) => (
              <View
                key={link.id}
                style={[
                  styles.calendarLinkItem,
                  index < listing.calendarLinks.length - 1 && styles.calendarLinkBorder,
                ]}
              >
                <Icons.calendar size={16} color={colors.icon} />
                <Text
                  style={[styles.calendarLinkUrl, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {link.url}
                </Text>
              </View>
            ))
          )}
        </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Edit Modal Component
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

// Form Field Component
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}

function FormField({ label, value, onChangeText, placeholder, colors, colorScheme, autoCapitalize = 'sentences', secureTextEntry = false }: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={styles.formField}>
      <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
        <Text style={[styles.inputLabel, { color: colors.icon }]}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex, { color: colors.text }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.icon}
            autoCapitalize={autoCapitalize}
            secureTextEntry={isSecure}
          />
          {secureTextEntry && (
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? (
                <Icons.eyeOff size={20} color={colors.icon} />
              ) : (
                <Icons.eye size={20} color={colors.icon} />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// Main Screen Component
export default function ListingScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { getListing, updateListing } = useListings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const listing = getListing(id);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (tab === 'info' || tab === 'calendar') return tab;
    if (listing && listing.calendarLinks.length === 0) return 'info';
    return 'calendar';
  });

  // Photos state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);

  // Fetch photos when listing changes
  useEffect(() => {
    if (listing?.id) {
      fetchPhotos();
    }
  }, [listing?.id]);

  const fetchPhotos = async () => {
    if (!listing) return;

    try {
      const response = await authClient.$fetch<{ photos: Photo[] }>(
        `${apiUrl}/api/listings/${listing.id}/photos`
      );

      if (response.data?.photos) {
        setPhotos(response.data.photos);
      }
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    } finally {
      setPhotosLoading(false);
    }
  };

  // Photo modal state
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const handlePhotosPress = () => {
    setPhotoModalVisible(true);
  };

  const closePhotoModal = () => {
    setPhotoModalVisible(false);
    setStagedAssets([]);
  };

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
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload photos.',
      );
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
      Alert.alert(
        'Permission Required',
        'Please allow camera access to take photos.',
      );
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

  const uploadStagedPhotos = async () => {
    if (!listing || stagedAssets.length === 0) return;

    setUploading(true);
    try {
      for (const asset of stagedAssets) {
        const mimeType = asset.mimeType || 'image/jpeg';

        // 1. Get presigned URL
        const presignResponse = await authClient.$fetch<{
          presignedUrl: string;
          s3Key: string;
          expiresIn: number;
        }>(`${apiUrl}/api/listings/${listing.id}/photos/presign`, {
          method: 'POST',
          body: { contentType: mimeType },
        });

        if (!presignResponse.data) continue;

        const { presignedUrl, s3Key } = presignResponse.data;

        // 2. Upload to S3
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();

        await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: blob,
        });

        // 3. Confirm upload
        await authClient.$fetch(`${apiUrl}/api/listings/${listing.id}/photos/confirm`, {
          method: 'POST',
          body: { s3Key },
        });
      }

      setStagedAssets([]);
      await fetchPhotos();
    } catch (err) {
      console.error('Failed to upload photos:', err);
      Alert.alert('Upload Failed', 'Some photos could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!listing) return;

    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingPhotoId(photoId);
          try {
            await authClient.$fetch(
              `${apiUrl}/api/listings/${listing.id}/photos/${photoId}`,
              { method: 'DELETE' },
            );
            await fetchPhotos();
          } catch (err) {
            console.error('Failed to delete photo:', err);
            Alert.alert('Error', 'Failed to delete photo. Please try again.');
          } finally {
            setDeletingPhotoId(null);
          }
        },
      },
    ]);
  };

  // Modal states
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [wifiModalVisible, setWifiModalVisible] = useState(false);
  const [accessNotesModalVisible, setAccessNotesModalVisible] = useState(false);
  const [checkTimesModalVisible, setCheckTimesModalVisible] = useState(false);
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
  const [wifiForm, setWifiForm] = useState<WifiForm>({
    wifiNetwork: '',
    wifiPassword: '',
  });
  const [accessNotesForm, setAccessNotesForm] = useState('');
  const [checkInTimeForm, setCheckInTimeForm] = useState(() => timeStringToDate('16:00'));
  const [checkOutTimeForm, setCheckOutTimeForm] = useState(() => timeStringToDate('10:00'));

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

  const openWiFiModal = () => {
    if (listing) {
      setWifiForm({
        wifiNetwork: listing.wifiNetwork || '',
        wifiPassword: listing.wifiPassword || '',
      });
      setWifiModalVisible(true);
    }
  };

  const openAccessNotesModal = () => {
    if (listing) {
      setAccessNotesForm(listing.accessNotes || '');
      setAccessNotesModalVisible(true);
    }
  };

  const openCheckTimesModal = () => {
    if (listing) {
      setCheckInTimeForm(timeStringToDate(listing.defaultCheckInTime));
      setCheckOutTimeForm(timeStringToDate(listing.defaultCheckOutTime));
      setCheckTimesModalVisible(true);
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

  const saveWifi = async () => {
    if (!listing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${listing.id}`,
        {
          method: 'PATCH',
          body: {
            wifiNetwork: wifiForm.wifiNetwork || null,
            wifiPassword: wifiForm.wifiPassword || null,
          },
        }
      );

      if (response.data?.listing) {
        updateListing(response.data.listing);
      }
      setWifiModalVisible(false);
    } catch (err) {
      console.error('Failed to update wifi:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveAccessNotes = async () => {
    if (!listing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${listing.id}`,
        {
          method: 'PATCH',
          body: {
            accessNotes: accessNotesForm || null,
          },
        }
      );

      if (response.data?.listing) {
        updateListing(response.data.listing);
      }
      setAccessNotesModalVisible(false);
    } catch (err) {
      console.error('Failed to update access notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveCheckTimes = async () => {
    if (!listing) return;

    setSaving(true);
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings/${listing.id}`,
        {
          method: 'PATCH',
          body: {
            defaultCheckInTime: dateToTimeString(checkInTimeForm),
            defaultCheckOutTime: dateToTimeString(checkOutTimeForm),
          },
        }
      );

      if (response.data?.listing) {
        updateListing(response.data.listing);
      }
      setCheckTimesModalVisible(false);
    } catch (err) {
      console.error('Failed to update check times:', err);
    } finally {
      setSaving(false);
    }
  };

  // Calendar link state
  const [calendarLinkModalVisible, setCalendarLinkModalVisible] = useState(false);
  const [calendarLinkUrl, setCalendarLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  const openCalendarLinkModal = () => {
    setCalendarLinkUrl('');
    setCalendarLinkModalVisible(true);
  };

  const addCalendarLink = async () => {
    if (!listing || !calendarLinkUrl.trim()) return;

    setSavingLink(true);
    try {
      const response = await authClient.$fetch<{
        calendarLink: { id: string; url: string };
        listing: Listing;
      }>(`${apiUrl}/api/listings/${listing.id}/calendar-links`, {
        method: 'POST',
        body: { url: calendarLinkUrl.trim() },
      });

      if (response.data?.listing) {
        updateListing(response.data.listing);
      }
      setCalendarLinkUrl('');
    } catch (err) {
      console.error('Failed to add calendar link:', err);
      Alert.alert('Error', 'Failed to add calendar link. Please check the URL and try again.');
    } finally {
      setSavingLink(false);
    }
  };

  const deleteCalendarLink = (linkId: string) => {
    if (!listing) return;

    Alert.alert('Remove Link', 'Are you sure you want to remove this iCal link?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDeletingLinkId(linkId);
          try {
            const response = await authClient.$fetch<{ listing: Listing }>(
              `${apiUrl}/api/listings/${listing.id}/calendar-links/${linkId}`,
              { method: 'DELETE' },
            );
            if (response.data?.listing) {
              updateListing(response.data.listing);
            }
          } catch (err) {
            console.error('Failed to delete calendar link:', err);
            Alert.alert('Error', 'Failed to remove calendar link. Please try again.');
          } finally {
            setDeletingLinkId(null);
          }
        },
      },
    ]);
  };

  if (!listing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Icons.chevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {listing.nickname}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {activeTab === 'calendar' ? (
        <CalendarTab listing={listing} colors={colors} colorScheme={colorScheme} />
      ) : (
        <InfoTab
          listing={listing}
          photos={photos}
          colors={colors}
          colorScheme={colorScheme}
          onEditNickname={openNicknameModal}
          onEditAddress={openAddressModal}
          onEditWiFi={openWiFiModal}
          onEditAccessNotes={openAccessNotesModal}
          onEditCheckTimes={openCheckTimesModal}
          onPhotosPress={handlePhotosPress}
          onAddCalendarLink={openCalendarLinkModal}
        />
      )}

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        colors={colors}
        colorScheme={colorScheme}
      />

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

      {/* WiFi Edit Modal */}
      <EditModal
        visible={wifiModalVisible}
        title="WiFi"
        onClose={() => setWifiModalVisible(false)}
        onSave={saveWifi}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <FormField
          label="Network Name"
          value={wifiForm.wifiNetwork}
          onChangeText={(text) => setWifiForm((prev) => ({ ...prev, wifiNetwork: text }))}
          placeholder="Enter WiFi network name"
          colors={colors}
          colorScheme={colorScheme}
          autoCapitalize="none"
        />
        <FormField
          label="Password"
          value={wifiForm.wifiPassword}
          onChangeText={(text) => setWifiForm((prev) => ({ ...prev, wifiPassword: text }))}
          placeholder="Enter WiFi password"
          colors={colors}
          colorScheme={colorScheme}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={[styles.fieldHint, { color: colors.icon }]}>
          Share WiFi details with your guests. Leave blank if not applicable.
        </Text>
      </EditModal>

      {/* Access Notes Edit Modal */}
      <EditModal
        visible={accessNotesModalVisible}
        title="Access Notes"
        onClose={() => setAccessNotesModalVisible(false)}
        onSave={saveAccessNotes}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <View style={styles.textAreaContainer}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Notes</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: colors.text,
                borderColor: colorScheme === 'dark' ? '#444' : '#DDD',
              },
            ]}
            value={accessNotesForm}
            onChangeText={setAccessNotesForm}
            placeholder="Enter access instructions, supply locations, etc."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>
        <Text style={[styles.fieldHint, { color: colors.icon }]}>
          Document how to access the property, where supplies are located, and any other important information.
        </Text>
      </EditModal>

      {/* Check-in / Check-out Times Modal */}
      <EditModal
        visible={checkTimesModalVisible}
        title="Check-in / Check-out Times"
        onClose={() => setCheckTimesModalVisible(false)}
        onSave={saveCheckTimes}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <View style={styles.timePickerField}>
          <Text style={[styles.timePickerLabel, { color: colors.text }]}>Check-in Time</Text>
          <DateTimePicker
            value={checkInTimeForm}
            mode="time"
            display="spinner"
            minuteInterval={15}
            onChange={(_, date) => date && setCheckInTimeForm(date)}
            themeVariant={colorScheme}
          />
        </View>
        <View style={styles.timePickerField}>
          <Text style={[styles.timePickerLabel, { color: colors.text }]}>Check-out Time</Text>
          <DateTimePicker
            value={checkOutTimeForm}
            mode="time"
            display="spinner"
            minuteInterval={15}
            onChange={(_, date) => date && setCheckOutTimeForm(date)}
            themeVariant={colorScheme}
          />
        </View>
      </EditModal>

      {/* iCal Links Modal */}
      <Modal
        visible={calendarLinkModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCalendarLinkModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>iCal Links</Text>
            <Pressable onPress={() => setCalendarLinkModalVisible(false)} style={styles.modalCloseButton}>
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
            {listing && listing.calendarLinks.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                {listing.calendarLinks.map((link, index) => (
                  <View
                    key={link.id}
                    style={[
                      styles.calendarLinkItem,
                      index < listing.calendarLinks.length - 1 && styles.calendarLinkBorder,
                    ]}
                  >
                    <Icons.calendar size={16} color={colors.icon} />
                    <Text
                      style={[styles.calendarLinkUrl, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {link.url}
                    </Text>
                    <Pressable
                      onPress={() => deleteCalendarLink(link.id)}
                      disabled={deletingLinkId === link.id}
                      hitSlop={8}
                    >
                      {deletingLinkId === link.id ? (
                        <ActivityIndicator size="small" color={colors.icon} />
                      ) : (
                        <Icons.trash size={16} color={colors.icon} />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <FormField
              label="New iCal URL"
              value={calendarLinkUrl}
              onChangeText={setCalendarLinkUrl}
              placeholder="https://..."
              colors={colors}
              colorScheme={colorScheme}
              autoCapitalize="none"
            />
            <Text style={[styles.fieldHint, { color: colors.icon }]}>
              Paste an iCal link from Airbnb, VRBO, or any other booking platform to sync reservations.
            </Text>
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.modalFooter, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
              <Pressable onPress={() => setCalendarLinkModalVisible(false)} style={styles.cancelButton}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Done</Text>
              </Pressable>
              <Pressable
                onPress={addCalendarLink}
                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                disabled={savingLink || !calendarLinkUrl.trim()}
              >
                {savingLink ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Add</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Photo Management Modal */}
      <Modal
        visible={photoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePhotoModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Pressable onPress={closePhotoModal} style={styles.photoModalCloseButton}>
              <View style={[styles.modalCloseCircle, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
                <Text style={[styles.modalCloseX, { color: colors.text }]}>×</Text>
              </View>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Staging Photos</Text>
            <Pressable
              onPress={pickPhotos}
              style={[styles.photoModalAddButton, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}
              disabled={uploading}
            >
              <Icons.plus size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.photoModalContent}
          >
            {photos.length === 0 && stagedAssets.length === 0 && !uploading ? (
              <View style={styles.photoEmptyState}>
                <Icons.image size={48} color={colors.icon} />
                <Text style={[styles.photoEmptyTitle, { color: colors.text }]}>
                  No photos yet
                </Text>
                <Text style={[styles.photoEmptySubtitle, { color: colors.icon }]}>
                  Tap + to add photos from your camera roll
                </Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((photo) => (
                  <View key={photo.id} style={styles.photoGridItem}>
                    <Image
                      source={{ uri: photo.url }}
                      style={styles.photoGridImage}
                      resizeMode="cover"
                    />
                    <Pressable
                      style={styles.photoDeleteButton}
                      onPress={() => deletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                    >
                      {deletingPhotoId === photo.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Icons.trash size={14} color="white" />
                      )}
                    </Pressable>
                  </View>
                ))}
                {stagedAssets.map((asset) => (
                  <View key={asset.uri} style={styles.photoGridItem}>
                    <Image
                      source={{ uri: asset.uri }}
                      style={styles.photoGridImage}
                      resizeMode="cover"
                    />
                    <View style={styles.stagedBadge}>
                      <Text style={styles.stagedBadgeText}>New</Text>
                    </View>
                    <Pressable
                      style={styles.photoDeleteButton}
                      onPress={() => removeStagedPhoto(asset.uri)}
                    >
                      <Icons.x size={14} color="white" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {uploading && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.uploadingText, { color: colors.icon }]}>
                  Uploading photos...
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Pressable
              onPress={closePhotoModal}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Close</Text>
            </Pressable>
            <Pressable
              onPress={uploadStagedPhotos}
              style={[
                styles.saveButton,
                { backgroundColor: colors.tint },
                stagedAssets.length === 0 && styles.saveButtonDisabled,
              ]}
              disabled={uploading || stagedAssets.length === 0}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Add {stagedAssets.length > 0 ? `${stagedAssets.length} ` : ''}Photo{stagedAssets.length !== 1 ? 's' : ''}
                </Text>
              )}
            </Pressable>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
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
  // Tab Bar styles
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  // Tab Content styles
  tabContent: {
    padding: 20,
  },
  calendarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarWrapper: {
    flex: 1,
  },
  calendarListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  monthContainer: {
    paddingVertical: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    marginBottom: 16,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  weekRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  dayCell: {
    flex: 1,
    height: 70,
    alignItems: 'center',
    paddingTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayText: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
  },
  todayText: {
    fontFamily: FontFamily.bold,
  },
  barLayerFull: {
    position: 'absolute',
    bottom: 8,
    left: -1,
    right: -1,
    height: 32,
  },
  barFillFull: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: '#fff',
  },
  barLayerLeft: {
    position: 'absolute',
    bottom: 8,
    left: -1,
    right: 0,
    height: 32,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  barLayerRight: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: -1,
    height: 32,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  barFillLeft: {
    flex: 6,
    borderTopWidth: 2,
    borderTopColor: '#fff',
  },
  barFillRight: {
    flex: 6,
    borderTopWidth: 2,
    borderTopColor: '#fff',
  },
  barSpacerSmall: {
    flex: 4,
  },
  barEndLeft: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#fff',
  },
  barEndRight: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderRightWidth: 2,
    borderRightColor: '#fff',
  },
  barSourceLabel: {
    position: 'absolute',
    bottom: 8,
    height: 32,
    lineHeight: 32,
    color: '#fff',
    fontSize: 11,
    fontFamily: FontFamily.bold,
    paddingLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
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
  checkTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkTimeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  checkTimeLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkTimeValue: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
  },
  checkTimeDivider: {
    width: 1,
    height: 36,
  },
  timePickerField: {
    marginBottom: 16,
  },
  timePickerLabel: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    marginBottom: 4,
  },
  wifiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wifiText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  wifiPassword: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 26,
  },
  wifiPlaceholder: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  accessNotesText: {
    fontSize: 16,
    lineHeight: 22,
  },
  accessNotesPlaceholder: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    minHeight: 200,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionAddButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
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
  calendarEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  calendarEmptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  calendarLinkEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  calendarLinkEmptyText: {
    fontSize: 14,
    fontStyle: 'italic',
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  // Photo modal styles
  photoModalCloseButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  photoModalAddButton: {
    position: 'absolute',
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
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
  stagedBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stagedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
  },
});
