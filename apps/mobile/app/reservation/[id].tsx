import { Icons } from '@/components/icons';
import { FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiUrl } from '@/lib/api-url';
import { authClient } from '@/lib/auth-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Task {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string | null;
  assignments: {
    id: string;
    teamMember: {
      user: { firstName: string; lastName: string };
    } | null;
    listing: { id: string };
  }[];
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: '#FFF3CD', text: '#856404' },
  IN_PROGRESS: { label: 'In Progress', bg: '#CCE5FF', text: '#004085' },
  COMPLETED: { label: 'Done', bg: '#D4EDDA', text: '#155724' },
};

export default function ReservationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { start, end, source, listingId, listingNickname } =
    useLocalSearchParams<{
      start: string;
      end: string;
      source?: string;
      listingId: string;
      listingNickname: string;
    }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    authClient.$fetch<{ tasks: Task[] }>(`${apiUrl}/api/tasks`)
      .then((response) => {
        if (!response.data?.tasks) return;
        const startDate = start.substring(0, 10);
        const endDate = end.substring(0, 10);
        const filtered = response.data.tasks.filter((task) => {
          const forThisListing = task.assignments.some((a) => a.listing.id === listingId);
          if (!forThisListing || !task.dueDate) return false;
          const due = task.dueDate.substring(0, 10);
          return due >= startDate && due <= endDate;
        });
        setTasks(filtered);
      })
      .catch(console.error)
      .finally(() => setTasksLoading(false));
  }, [listingId, start, end]);

  const checkIn = new Date(start).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
  const checkOut = new Date(end).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
  const nights = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );

  const bg = isDark ? '#000' : '#fff';
  const cardBg = isDark ? '#1C1C1E' : '#F9F9F9';
  const border = isDark ? '#333' : '#E5E5EA';
  const textPrimary = isDark ? '#fff' : '#11181C';
  const textSecondary = '#8E8E93';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Icons.chevronLeft size={24} color={textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: textPrimary }]}>Reservation Details</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>{listingNickname}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Dates card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <DetailRow label="Check-in" value={checkIn} border={border} textPrimary={textPrimary} textSecondary={textSecondary} />
          <View style={[styles.divider, { backgroundColor: border }]} />
          <DetailRow label="Check-out" value={checkOut} border={border} textPrimary={textPrimary} textSecondary={textSecondary} />
          <View style={[styles.divider, { backgroundColor: border }]} />
          <DetailRow
            label="Duration"
            value={`${nights} ${nights === 1 ? 'night' : 'nights'}`}
            border={border}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </View>

        {/* Source */}
        {!!source && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <DetailRow label="Source" value={source} border={border} textPrimary={textPrimary} textSecondary={textSecondary} />
          </View>
        )}

        {/* Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Tasks</Text>
        </View>

        {tasksLoading ? (
          <ActivityIndicator size="small" color={textSecondary} style={styles.loader} />
        ) : tasks.length > 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            {tasks.map((task, index) => {
              const status = STATUS_CONFIG[task.status];
              const assignees = task.assignments
                .filter((a) => a.teamMember)
                .map((a) => `${a.teamMember!.user.firstName} ${a.teamMember!.user.lastName}`);
              return (
                <React.Fragment key={task.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: border }]} />}
                  <Pressable
                    style={styles.taskRow}
                    onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
                  >
                    <View style={styles.taskLeft}>
                      <Text style={[styles.taskName, { color: textPrimary }]} numberOfLines={1}>
                        {task.name}
                      </Text>
                      {assignees.length > 0 && (
                        <Text style={[styles.taskAssignee, { color: textSecondary }]} numberOfLines={1}>
                          {assignees.join(', ')}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        ) : (
          <Pressable
            style={[styles.emptyTasks, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => router.push('/tasks' as never)}
          >
            <ClipboardList size={20} color={textSecondary} />
            <Text style={[styles.emptyTasksText, { color: textSecondary }]}>No tasks yet</Text>
            <View style={[styles.addTaskButton, { borderColor: border }]}>
              <Plus size={14} color={textPrimary} />
              <Text style={[styles.addTaskText, { color: textPrimary }]}>Add Task</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontFamily: FontFamily.bold },
  subtitle: { fontSize: 14, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: { fontSize: 14, fontFamily: FontFamily.medium },
  value: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  sectionHeader: { marginTop: 4, marginBottom: -4 },
  sectionTitle: { fontSize: 13, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8E8E93' },
  loader: { alignSelf: 'center', marginVertical: 8 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  taskLeft: { flex: 1 },
  taskName: { fontSize: 14, fontFamily: FontFamily.semiBold },
  taskAssignee: { fontSize: 12, fontFamily: FontFamily.regular, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: FontFamily.semiBold },
  emptyTasks: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTasksText: { fontSize: 14, fontFamily: FontFamily.regular },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 4,
  },
  addTaskText: { fontSize: 13, fontFamily: FontFamily.semiBold },
});
