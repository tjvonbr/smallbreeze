import CalendarHeader from '@/components/calendar-header';
import InfiniteCalendar, { InfiniteCalendarHandle } from '@/components/infinite-calendar';
import { useListings } from '@/context/listings-context';
import { parseICalText } from '@/lib/ical-parser';
import { FontFamily } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  // Calendar header = safe-area top + paddingTop 4 + pill height 32 + paddingBottom 4
  const headerHeight = insets.top + 4 + 32 + 4;
  const [visibleYear, setVisibleYear] = React.useState<number>(new Date().getFullYear());
  const listRef = React.useRef<InfiniteCalendarHandle | null>(null);
  const params = useLocalSearchParams<{ targetYear?: string; targetMonth?: string }>();
  const hasAppliedTargetRef = React.useRef(false);
  const { listings, fetchListings } = useListings();
  const [checkoutCounts, setCheckoutCounts] = React.useState<Map<string, number>>(new Map());

  React.useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Fetch iCal data from all listings and compute checkout counts
  React.useEffect(() => {
    const calendarUrls: string[] = [];
    for (const listing of listings) {
      for (const link of listing.calendarLinks) {
        calendarUrls.push(link.url);
      }
    }
    console.log('[checkout] listings:', listings.length, 'calendarUrls:', calendarUrls.length);
    if (calendarUrls.length === 0) return;

    let cancelled = false;

    (async () => {
      const counts = new Map<string, number>();

      await Promise.all(
        calendarUrls.map(async (url) => {
          try {
            const response = await fetch(url);
            const icalText = await response.text();
            const events = parseICalText(icalText);
            console.log('[checkout] url:', url, 'events:', events.length);
            for (const event of events) {
              if (event.summary?.toLowerCase().includes('not available')) continue;
              // end date is the checkout day — extract YYYY-MM-DD
              const dateKey = event.end.substring(0, 10);
              counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
            }
          } catch (err) {
            console.error('Failed to fetch calendar:', url, err);
          }
        })
      );

      console.log('[checkout] total dates with checkouts:', counts.size, Object.fromEntries(counts));
      if (!cancelled) {
        setCheckoutCounts(counts);
      }
    })();

    return () => { cancelled = true; };
  }, [listings]);

  React.useEffect(() => {
    if (hasAppliedTargetRef.current) return;
    const ty = params.targetYear ? parseInt(String(params.targetYear), 10) : undefined;
    const tm = params.targetMonth ? parseInt(String(params.targetMonth), 10) : undefined;
    if (typeof ty === 'number' && !Number.isNaN(ty) && typeof tm === 'number' && !Number.isNaN(tm)) {
      // Delay to ensure list is measured
      requestAnimationFrame(() => {
        listRef.current?.scrollToMonth(ty, tm);
      });
      hasAppliedTargetRef.current = true;
    }
  }, [params.targetYear, params.targetMonth]);

  return (
    <SafeAreaView style={styles.container}>
      <CalendarHeader year={visibleYear} />
      <InfiniteCalendar ref={listRef} onVisibleYearChange={setVisibleYear} checkoutCounts={checkoutCounts} topPadding={headerHeight} />
      <Pressable accessibilityRole="button" onPress={() => listRef.current?.scrollToToday()} style={styles.todayButton}>
        <Text style={styles.todayButtonText}>Today</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  todayButton: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    backgroundColor: 'white',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 6,
  },
  todayButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    color: '#11181C',
  },
});
