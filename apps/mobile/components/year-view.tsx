import React, { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '@/constants/theme';

type YearViewProps = {
  yearDate: Date; // any date within the target year
  onDayPress?: (date: Date) => void;
  onMonthPress?: (year: number, monthIndex: number) => void;
};

function YearView({ yearDate, onDayPress, onMonthPress }: YearViewProps) {
  const months = useMemo(() => {
    const year = yearDate.getFullYear();
    return Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));
  }, [yearDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.yearHeader}>{yearDate.getFullYear()}</Text>
      <View style={styles.grid}>
        {months.map((monthFirstDate) => (
          <MiniMonth
            key={`y-${monthFirstDate.getFullYear()}-m-${monthFirstDate.getMonth()}`}
            monthDate={monthFirstDate}
            onMonthPress={onMonthPress}
            onDayPress={onDayPress}
          />
        ))}
      </View>
      <View style={{ height: 24 }} />
    </View>
  );
}

type MiniMonthProps = {
  monthDate: Date; // first day of month
  onDayPress?: (date: Date) => void;
  onMonthPress?: (year: number, monthIndex: number) => void;
};

const MiniMonth = React.memo(function MiniMonth({ monthDate, onDayPress, onMonthPress }: MiniMonthProps) {
  const { monthName, grid, todayInfo } = useMemo(() => buildMonthGrid(monthDate), [monthDate]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={
        onMonthPress ? () => onMonthPress(monthDate.getFullYear(), monthDate.getMonth()) : undefined
      }
      style={styles.miniMonth}
    >
      <Text style={styles.miniMonthTitle}>{monthName}</Text>
      <View style={styles.miniMonthGrid}>
        {grid.map((day, idx) => (
          <View key={idx} style={styles.miniCell}>
            {day.inCurrentMonth ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={
                  onDayPress
                    ? () => onDayPress(new Date(monthDate.getFullYear(), monthDate.getMonth(), day.dayNumber))
                    : undefined
                }
              >
                <View style={styles.dayWrap}>
                  <View style={[styles.tinyCircle, todayInfo.isToday && todayInfo.day === day.dayNumber && styles.tinyCircleToday]} />
                  <Text
                    style={[
                      styles.miniLabel,
                      !day.inCurrentMonth && styles.miniLabelOutside,
                      todayInfo.isToday && todayInfo.day === day.dayNumber && styles.miniLabelToday,
                    ]}>
                    {day.dayNumber}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.miniEmptyCell} />
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );
});

type GridDay = {
  dayNumber: number;
  inCurrentMonth: boolean;
};

// Cache for mini-month grids keyed by "YYYY-M"
const miniCache = new Map<string, {
  grid: GridDay[];
  monthName: string;
  todayInfo: { isToday: boolean; day: number };
}>();

function buildMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const cacheKey = `${year}-${monthIndex}`;
  const cached = miniCache.get(cacheKey);
  if (cached) return cached;
  const monthName = first.toLocaleString('default', { month: 'short' });

  const firstWeekday = first.getDay(); // 0..6, Sunday=0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrev = new Date(year, monthIndex, 0).getDate();

  const today = new Date();
  const isSameMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const todayInfo = {
    isToday: isSameMonth,
    day: today.getDate(),
  };

  const leading = firstWeekday;
  const totalCells = 6 * 7; // Always 6 rows for stable height

  const grid: GridDay[] = [];
  for (let i = leading - 1; i >= 0; i--) {
    grid.push({
      dayNumber: daysInPrev - i,
      inCurrentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ dayNumber: d, inCurrentMonth: true });
  }
  const trailing = totalCells - grid.length;
  for (let t = 1; t <= trailing; t++) {
    grid.push({ dayNumber: t, inCurrentMonth: false });
  }

  const result = { grid, monthName, todayInfo };
  miniCache.set(cacheKey, result);
  return result;
}

const { width } = Dimensions.get('window');
const SIDE = 16;
const COL_GAP = 12;
const MINI_WIDTH = (width - SIDE * 2 - COL_GAP * 2) / 3;
const CELL_WIDTH = MINI_WIDTH / 7;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIDE,
    paddingTop: 8,
  },
  yearHeader: {
    fontSize: 44,
    fontFamily: FontFamily.extraBold,
    color: '#FF3B30',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  miniMonth: {
    width: MINI_WIDTH,
    marginBottom: 18,
  },
  miniMonthTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    lineHeight: 18,
    marginBottom: 4,
  },
  miniMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniCell: {
    width: CELL_WIDTH,
  },
  miniEmptyCell: {
    height: 18,
  },
  dayWrap: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: {
    fontSize: 11,
    color: '#11181C',
  },
  miniLabelOutside: {
    color: '#C7C7CC',
  },
  miniLabelToday: {
    color: 'white',
    fontFamily: FontFamily.semiBold,
  },
  tinyCircle: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  tinyCircleToday: {
    backgroundColor: '#FF3B30',
  },
});

export default React.memo(YearView);


