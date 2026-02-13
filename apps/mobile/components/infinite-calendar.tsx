import React, { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, ViewToken } from 'react-native';
import MonthView from './month-view';
import { SafeAreaView } from 'react-native-safe-area-context';

type InfiniteCalendarProps = {
  onVisibleYearChange?: (year: number) => void;
  topPadding?: number;
  checkoutCounts?: Map<string, number>;
};

const TOTAL_MONTHS = 1200; // ~100 years
const START_INDEX = Math.floor(TOTAL_MONTHS / 2);

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  d.setDate(1);
  return d;
}

export type InfiniteCalendarHandle = {
  scrollToToday: () => void;
  scrollToMonth: (year: number, monthIndex: number) => void;
};

function InfiniteCalendarImpl(
  { onVisibleYearChange, topPadding = 0, checkoutCounts }: InfiniteCalendarProps,
  ref: ForwardedRef<InfiniteCalendarHandle | null>
) {
  const listRef = useRef<FlatList<number>>(null);
  const lastYearRef = useRef<number | null>(null);

  const data = useMemo(() => {
    return Array.from({ length: TOTAL_MONTHS }, (_, i) => i);
  }, []);

  const renderItem = useCallback(({ index }: { index: number }) => {
    const monthDate = addMonths(new Date(), index - START_INDEX);
    monthDate.setDate(1);
    return <MonthView monthDate={monthDate} checkoutCounts={checkoutCounts} />;
  }, [checkoutCounts]);

  const getItemLayout = useCallback((_: unknown, index: number) => {
    // Approximate month heights. This enables initialScrollIndex snapping without measuring.
    // 6-row months are taller, but a generous estimate avoids "out of range" errors.
    const length = 528;
    return { length, offset: length * index, index };
  }, []);

  const onScroll = (_e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Reserved for future: could update sticky year or "Today" button visibility.
  };

  // On mount, nudge scroll so current month clears the header overlay
  useEffect(() => {
    if (topPadding > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: START_INDEX, viewOffset: topPadding, animated: false });
      });
    }
  }, [topPadding]);

  // Report the initially visible year (today) on mount
  useEffect(() => {
    if (onVisibleYearChange) {
      const initialYear = new Date().getFullYear();
      lastYearRef.current = initialYear;
      onVisibleYearChange(initialYear);
    }
  }, [onVisibleYearChange]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!onVisibleYearChange || viewableItems.length === 0) return;
      const candidates = viewableItems.filter((v) => v.index != null);
      if (candidates.length === 0) return;
      candidates.sort((a, b) => (a.index! - b.index!));
      const middle = candidates[Math.floor(candidates.length / 2)];
      const idx = middle.index!;
      const monthDate = addMonths(new Date(), idx - START_INDEX);
      const year = monthDate.getFullYear();
      if (lastYearRef.current !== year) {
        lastYearRef.current = year;
        onVisibleYearChange(year);
      }
    }
  ).current;

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      listRef.current?.scrollToIndex({ index: START_INDEX, animated: true });
    },
    scrollToMonth: (year: number, monthIndex: number) => {
      const today = new Date();
      const monthsFromToday =
        (year - today.getFullYear()) * 12 + (monthIndex - today.getMonth());
      const index = START_INDEX + monthsFromToday;
      listRef.current?.scrollToIndex({ index, animated: true });
    },
  }));

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem as any}
        keyExtractor={(i) => String(i)}
        initialScrollIndex={START_INDEX}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.contentContainer}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const InfiniteCalendar = forwardRef(InfiniteCalendarImpl);
export default InfiniteCalendar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
    // top padding will be injected by prop when header overlays the list
  },
});


