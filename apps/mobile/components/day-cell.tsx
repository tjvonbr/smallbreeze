import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '@/constants/theme';

type DayCellProps = {
  dayNumber: number;
  isToday: boolean;
  isInCurrentMonth: boolean;
  checkoutCount?: number;
};

export function DayCell({ dayNumber, isToday, isInCurrentMonth, checkoutCount = 0 }: DayCellProps) {
  return (
    <View style={styles.container}>
      {checkoutCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{checkoutCount}</Text>
        </View>
      )}
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
    height: 72,
    alignItems: 'center',
    paddingTop: 4,
  },
  badge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    backgroundColor: IOS_RED,
    color: 'white',
    fontSize: 11,
    fontFamily: FontFamily.bold,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    overflow: 'hidden',
  },
  label: {
    fontSize: 16,
    color: TEXT,
  },
  labelOutside: {
    color: MUTED,
  },
  labelToday: {
    color: IOS_RED,
    fontFamily: FontFamily.semiBold,
  },
});

export default DayCell;
