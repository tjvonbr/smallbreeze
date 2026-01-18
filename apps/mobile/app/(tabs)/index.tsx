import CalendarHeader from '@/components/calendar-header';
import InfiniteCalendar, { InfiniteCalendarHandle } from '@/components/infinite-calendar';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [visibleYear, setVisibleYear] = React.useState<number>(new Date().getFullYear());
  const listRef = React.useRef<InfiniteCalendarHandle | null>(null);
  const params = useLocalSearchParams<{ targetYear?: string; targetMonth?: string }>();
  const hasAppliedTargetRef = React.useRef(false);

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
      <InfiniteCalendar ref={listRef} onVisibleYearChange={setVisibleYear} />
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
    fontWeight: '600',
    color: '#11181C',
  },
});
