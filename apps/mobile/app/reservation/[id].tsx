import { Icons } from '@/components/icons';
import { FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReservationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { summary, start, end, source, description, listingNickname } =
    useLocalSearchParams<{
      summary: string;
      start: string;
      end: string;
      source?: string;
      description?: string;
      listingNickname: string;
    }>();

  const checkIn = new Date(start).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const checkOut = new Date(end).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const nights = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );

  const bg = isDark ? '#000' : '#fff';
  const cardBg = isDark ? '#1C1C1E' : '#F9F9F9';
  const border = isDark ? '#333' : '#E5E5EA';
  const textPrimary = isDark ? '#fff' : '#11181C';
  const textSecondary = '#8E8E93';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Icons.chevronLeft size={24} color={textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>
            {summary}
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>{listingNickname}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Dates card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <DetailRow label="Check-in" value={checkIn} border={border} textPrimary={textPrimary} textSecondary={textSecondary} />
          <View style={[styles.divider, { backgroundColor: border }]} />
          <DetailRow label="Check-out" value={checkOut} border={border} textPrimary={textPrimary} textSecondary={textSecondary} />
          <View style={[styles.divider, { backgroundColor: border }]} />
          <DetailRow
            label="Duration"
            value={`${nights} ${nights === 1 ? 'night' : 'nights'}`}
            border={border}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </View>

        {/* Source */}
        {!!source && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <DetailRow label="Source" value={source} border={border} textPrimary={textPrimary} textSecondary={textSecondary} />
          </View>
        )}

        {/* Notes */}
        {!!description && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.notesBlock}>
              <Text style={[styles.label, { color: textSecondary }]}>Notes</Text>
              <Text style={[styles.notes, { color: textPrimary }]}>{description}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: textPrimary }]}>{value}</Text>
    </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#8E8E93',
  },
  value: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  notesBlock: {
    padding: 16,
    gap: 6,
  },
  notes: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
});
