import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
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
  nextCheckIn: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export default function ListingScreen() {
  const { listing: listingParam } = useLocalSearchParams<{ listing: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const listing: Listing | null = listingParam ? JSON.parse(listingParam) : null;

  const formatAddress = (listing: Listing) => {
    const lines = [listing.streetAddress];
    if (listing.streetAddress2) {
      lines.push(listing.streetAddress2);
    }
    lines.push(`${listing.city}, ${listing.state} ${listing.zip}`);
    return lines;
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Address</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            {formatAddress(listing).map((line, index) => (
              <Text key={index} style={[styles.addressLine, { color: colors.text }]}>
                {line}
              </Text>
            ))}
          </View>
        </View>

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
});
