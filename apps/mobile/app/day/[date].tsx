import { Icons } from '@/components/icons';
import { FontFamily } from '@/constants/theme';
import { useListings } from '@/context/listings-context';
import { apiUrl } from '@/lib/api-url';
import { authClient } from '@/lib/auth-client';
import { parseICalText } from '@/lib/ical-parser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Task {
  id: string;
  dueDate: string | null;
  assignments: {
    listing: { id: string };
    teamMember: {
      user: { firstName: string; lastName: string };
    };
  }[];
}

interface Checkout {
  id: string;
  listingId: string;
  listingNickname: string;
  checkOutTime: string;
  assigneeName: string | null;
}

export default function DayViewScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { listings, fetchListings } = useListings();
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (listings.length === 0) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const results: Checkout[] = [];

      const [, tasksResponse] = await Promise.all([
        Promise.all(
          listings.map(async (listing) => {
            for (const link of listing.calendarLinks) {
              try {
                const response = await fetch(link.url);
                const icalText = await response.text();
                const events = parseICalText(icalText);
                for (const event of events) {
                  if (event.summary?.toLowerCase().includes('not available')) continue;
                  const endDate = event.end.substring(0, 10);
                  if (endDate === date) {
                    results.push({
                      id: event.id,
                      listingId: listing.id,
                      listingNickname: listing.nickname,
                      checkOutTime: listing.defaultCheckOutTime,
                      assigneeName: null,
                    });
                  }
                }
              } catch (err) {
                console.error('Failed to fetch calendar:', link.url, err);
              }
            }
          })
        ),
        authClient.$fetch<{ tasks: Task[] }>(`${apiUrl}/api/tasks`).catch(() => null),
      ]);

      const tasks = tasksResponse?.data?.tasks ?? [];
      for (const checkout of results) {
        const match = tasks.find((t) =>
          t.dueDate?.substring(0, 10) === date &&
          t.assignments.some((a) => a.listing.id === checkout.listingId)
        );
        if (match) {
          const assignment = match.assignments.find((a) => a.listing.id === checkout.listingId);
          if (assignment) {
            const u = assignment.teamMember.user;
            checkout.assigneeName = `${u.firstName} ${u.lastName}`;
          }
        }
      }

      if (!cancelled) {
        setCheckouts(results);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [listings, date]);

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Icons.chevronLeft size={24} color="#11181C" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{formattedDate}</Text>
          <Text style={styles.subtitle}>Checkouts</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : checkouts.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {checkouts.map((checkout) => (
            <View key={checkout.id} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{checkout.listingNickname}</Text>
                <Text style={styles.cardAssignee}>
                  {checkout.assigneeName ?? 'No one assigned to clean'}
                </Text>
              </View>
              <Text style={styles.cardSubtitle}>Check-out at {checkout.checkOutTime}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No checkouts on this day.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
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
    color: '#11181C',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    color: '#11181C',
  },
  cardAssignee: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
