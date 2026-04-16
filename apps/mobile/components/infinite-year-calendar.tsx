import React, { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View, ViewToken } from 'react-native';
import YearView, { YEAR_ITEM_HEIGHT } from './year-view';

type InfiniteYearCalendarProps = {
  onVisibleYearChange?: (year: number) => void;
  topPadding?: number;
  onMonthPress?: (year: number, monthIndex: number) => void;
  onDayPress?: (date: Date) => void;
  initialYear?: number;
};

const TOTAL_YEARS = 400; // generous range
const START_INDEX = Math.floor(TOTAL_YEARS / 2);

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  d.setMonth(0);
  d.setDate(1);
  return d;
}

export type InfiniteYearCalendarHandle = {
  scrollToYear: (year?: number) => void;
};

function InfiniteYearCalendarImpl(
  { onVisibleYearChange, topPadding = 0, onMonthPress, onDayPress, initialYear }: InfiniteYearCalendarProps,
  ref: ForwardedRef<InfiniteYearCalendarHandle | null>
) {
  const listRef = useRef<FlatList<number>>(null);
  const lastYearRef = useRef<number | null>(null);
  const initialScrollIndex = useMemo(() => {
    if (typeof initialYear !== 'number') return START_INDEX;
    const todayYear = new Date().getFullYear();
    return START_INDEX + (initialYear - todayYear);
  }, [initialYear]);

  const data = useMemo(() => {
    return Array.from({ length: TOTAL_YEARS }, (_, i) => i);
  }, []);

  const renderItem = useCallback(({ index }: { index: number }) => {
    const yearDate = addYears(new Date(), index - START_INDEX);
    return <YearView yearDate={yearDate} onMonthPress={onMonthPress} onDayPress={onDayPress} />;
  }, [onDayPress, onMonthPress]);

  const getItemLayout = useCallback((_: unknown, index: number) => {
    return { length: YEAR_ITEM_HEIGHT, offset: YEAR_ITEM_HEIGHT * index, index };
  }, []);

  const onScroll = (_e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // reserved
  };

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
      const yearDate = addYears(new Date(), idx - START_INDEX);
      const year = yearDate.getFullYear();
      if (lastYearRef.current !== year) {
        lastYearRef.current = year;
        onVisibleYearChange(year);
      }
    }
  ).current;

  useImperativeHandle(ref, () => ({
    scrollToYear: (year?: number) => {
      const targetYear = typeof year === 'number' ? year : new Date().getFullYear();
      const todayYear = new Date().getFullYear();
      const delta = targetYear - todayYear;
      const index = START_INDEX + delta;
      listRef.current?.scrollToIndex({ index, animated: true });
    },
  }));

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem as any}
        keyExtractor={(i) => String(i)}
        initialScrollIndex={initialScrollIndex}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={[styles.contentContainer, topPadding ? { paddingTop: topPadding } : null]}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />
    </View>
  );
}

const InfiniteYearCalendar = forwardRef(InfiniteYearCalendarImpl);
export default InfiniteYearCalendar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
  },
});


