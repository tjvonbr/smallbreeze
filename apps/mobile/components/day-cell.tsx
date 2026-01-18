import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type DayCellProps = {
  dayNumber: number;
  isToday: boolean;
  isInCurrentMonth: boolean;
};

export function DayCell({ dayNumber, isToday, isInCurrentMonth }: DayCellProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.circle, isToday && styles.circleToday]} />
      <Text
        style={[
          styles.label,
          !isInCurrentMonth && styles.labelOutside,
          isToday && styles.labelToday,
        ]}>
        {dayNumber}
      </Text>
    </View>
  );
}

const IOS_RED = '#FF3B30';
const MUTED = '#C7C7CC';
const TEXT = '#11181C';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  circle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  circleToday: {
    backgroundColor: IOS_RED,
  },
  label: {
    fontSize: 16,
    color: TEXT,
  },
  labelOutside: {
    color: MUTED,
  },
  labelToday: {
    color: 'white',
    fontWeight: '600',
  },
});

export default DayCell;


