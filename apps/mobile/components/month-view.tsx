import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { DayCell } from './day-cell';

type MonthViewProps = {
  monthDate: Date; // first day of month
  checkoutCounts?: Map<string, number>;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MonthView({ monthDate, checkoutCounts }: MonthViewProps) {
  const {
    monthName,
    year,
    monthIndex,
    grid,
    todayInfo,
  } = useMemo(() => buildMonthGrid(monthDate), [monthDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>
        {monthName}
      </Text>
      <View style={styles.weekHeader}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text key={`w-${monthDate.getFullYear()}-${monthDate.getMonth()}-${i}`} style={styles.weekHeaderLabel}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((day, idx) => (
          <View key={idx} style={styles.cell}>
            {day.inCurrentMonth ? (
              <DayCell
                dayNumber={day.dayNumber}
                isToday={
                  todayInfo.isToday &&
                  todayInfo.day === day.dayNumber &&
                  day.inCurrentMonth
                }
                isInCurrentMonth={day.inCurrentMonth}
                checkoutCount={checkoutCounts?.get(
                  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day.dayNumber).padStart(2, '0')}`
                )}
              />
            ) : (
              <View style={styles.emptyCell} />
            )}
          </View>
        ))}
      </View>
      {/* Spacer under each month to match native breathing room */}
      <View style={{ height: 12 }} />
      {/* Hidden text for a11y context e.g. 2025 */}
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.yearHidden}>
        {year}
      </Text>
    </View>
  );
}

type GridDay = {
  dayNumber: number;
  inCurrentMonth: boolean;
};

// Simple cross-render cache keyed by "YYYY-M"
const monthGridCache = new Map<string, {
  grid: GridDay[];
  monthName: string;
  year: number;
  monthIndex: number;
  todayInfo: { isToday: boolean; day: number };
}>();

function buildMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const cacheKey = `${year}-${monthIndex}`;
  const cached = monthGridCache.get(cacheKey);
  if (cached) return cached;
  const monthName = first.toLocaleString('default', { month: 'long' });

  const firstWeekday = first.getDay(); // 0..6, Sunday=0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrev = new Date(year, monthIndex, 0).getDate();

  const today = new Date();
  const isSameMonth =
    today.getFullYear() === year && today.getMonth() === monthIndex;
  const todayInfo = {
    isToday: isSameMonth,
    day: today.getDate(),
  };

  const leading = firstWeekday;
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7; // 5 or 6 rows

  const grid: GridDay[] = [];
  // Leading from previous month
  for (let i = leading - 1; i >= 0; i--) {
    grid.push({
      dayNumber: daysInPrev - i,
      inCurrentMonth: false,
    });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ dayNumber: d, inCurrentMonth: true });
  }
  // Trailing from next month
  const trailing = totalCells - grid.length;
  for (let t = 1; t <= trailing; t++) {
    grid.push({ dayNumber: t, inCurrentMonth: false });
  }

  const result = {
    grid,
    monthName,
    year,
    monthIndex,
    todayInfo,
  };
  monthGridCache.set(cacheKey, result);
  return result;
}

const { width } = Dimensions.get('window');
const SIDE_PADDING = 16;
const CELL_WIDTH = (width - SIDE_PADDING * 2) / 7;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 16,
  },
  monthTitle: {
    fontSize: 34,
    fontWeight: '700',
    paddingBottom: 6,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  weekHeaderLabel: {
    width: CELL_WIDTH,
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_WIDTH,
  },
  emptyCell: {
    height: 72,
  },
  yearHidden: {
    height: 0,
    width: 0,
    opacity: 0,
  },
});

export default React.memo(MonthView);