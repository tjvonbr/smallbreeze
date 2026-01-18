import InfiniteYearCalendar, { InfiniteYearCalendarHandle } from '@/components/infinite-year-calendar';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function YearScreen() {
  const listRef = React.useRef<InfiniteYearCalendarHandle | null>(null);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <InfiniteYearCalendar
        ref={listRef}
        onMonthPress={(year, monthIndex) => {
          router.replace({ pathname: '/', params: { targetYear: String(year), targetMonth: String(monthIndex) } } as never);
        }}
      />
      <Pressable accessibilityRole="button" onPress={() => listRef.current?.scrollToYear()} style={styles.todayButton}>
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


