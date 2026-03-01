import { Colors, FontFamily } from '@/constants/theme';
import { useListings, Listing } from '@/context/listings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiUrl } from '@/lib/api-url';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  ClipboardList,
  Home,
  Plus,
  Trash2,
  User,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isTemplate: boolean;
  dueDate: string | null;
  assignments: {
    id: string;
    teamMember: {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    };
    listing: {
      id: string;
      nickname: string;
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDueDate(dateString: string | null): string {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: '#FFF3CD', text: '#856404' },
  IN_PROGRESS: { label: 'In Progress', bg: '#CCE5FF', text: '#004085' },
  COMPLETED: { label: 'Done', bg: '#D4EDDA', text: '#155724' },
};

const TEMPLATE_BADGE = { bg: '#E8DAEF', text: '#6C3483' };

export default function TasksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { listings, fetchListings } = useListings();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await authClient.$fetch<{ tasks: Task[] }>(
        `${apiUrl}/api/tasks`
      );

      if (response.data?.tasks) {
        setTasks(response.data.tasks);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await authClient.$fetch<{ members: TeamMember[] }>(
        `${apiUrl}/api/tasks/team-members`
      );
      if (response.data?.members) {
        setTeamMembers(response.data.members);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    if (listings.length === 0) {
      fetchListings();
    }
  }, [fetchTasks, fetchListings, listings.length]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            swipeableRefs.current.get(task.id)?.close();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authClient.$fetch(
                `${apiUrl}/api/tasks/${task.id}`,
                { method: 'DELETE' }
              );

              if (response.error) {
                Alert.alert('Error', response.error.message || 'Failed to delete task');
                return;
              }

              setTasks((prev) => prev.filter((t) => t.id !== task.id));
            } catch (err) {
              console.error('Failed to delete task:', err);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openModal = () => {
    setTaskName('');
    setTaskDescription('');
    setSelectedListingId(listings.length > 0 ? listings[0].id : null);
    setIsTemplate(false);
    setSelectedMemberId(null);
    setModalVisible(true);
    fetchTeamMembers();
  };

  const handleCreateTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    if (!isTemplate && !selectedListingId) {
      Alert.alert('Error', 'Please select a listing');
      return;
    }

    setCreateLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: taskName.trim(),
        description: taskDescription.trim() || undefined,
        isTemplate,
      };

      if (!isTemplate) {
        body.listingId = selectedListingId;
        if (selectedMemberId) {
          body.assigneeTeamMemberId = selectedMemberId;
        }
      }

      const response = await authClient.$fetch<{ task: Task }>(
        `${apiUrl}/api/tasks`,
        {
          method: 'POST',
          body,
        }
      );

      if (response.error) {
        Alert.alert('Error', response.error.message || 'Failed to create task');
        return;
      }

      setModalVisible(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    task: Task
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteTask(task)}
        >
          <Trash2 size={20} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const dueDateColor = item.dueDate && new Date(item.dueDate) < new Date()
      ? '#DC3545'
      : colors.icon;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          } else {
            swipeableRefs.current.delete(item.id);
          }
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          style={[styles.taskCard, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
        >
          <View style={styles.taskContent}>
            <View style={styles.taskTopRow}>
              <View style={styles.taskListingRow}>
                {item.isTemplate ? (
                  <View style={[styles.templateBadge, { backgroundColor: TEMPLATE_BADGE.bg }]}>
                    <Text style={[styles.templateBadgeText, { color: TEMPLATE_BADGE.text }]}>
                      Template
                    </Text>
                  </View>
                ) : (
                  <>
                    <Home size={12} color={colors.icon} />
                    <Text style={[styles.taskListing, { color: colors.icon }]}>
                      {item.assignments[0]?.listing?.nickname ?? 'Unassigned'}
                    </Text>
                  </>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <Text style={[styles.taskName, { color: colors.text }]}>
              {item.name}
            </Text>

            {item.description ? (
              <Text style={[styles.taskDescription, { color: colors.icon }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.taskMeta}>
              <View style={styles.taskMetaItem}>
                <Calendar size={12} color={dueDateColor} />
                <Text style={[styles.taskMetaText, { color: dueDateColor }]}>
                  {formatDueDate(item.dueDate)}
                </Text>
              </View>
              <Text style={[styles.taskDate, { color: colors.icon }]}>
                Created {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ClipboardList size={48} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No tasks yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
        Create tasks to keep your team organized
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tasks</Text>
        <Pressable
          style={[styles.headerAddButton, { backgroundColor: colors.tint }]}
          onPress={openModal}
        >
          <Plus size={20} color="white" />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
        />
      )}

      {/* Create Task Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalCancelButton}>
              <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Task</Text>
            <View style={styles.modalCancelButton} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Template / One-time toggle */}
            <View style={styles.inputContainer}>
              <View style={[styles.segmentedToggle, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
                <Pressable
                  style={[
                    styles.segmentedOption,
                    !isTemplate && [styles.segmentedOptionActive, { backgroundColor: colors.tint }],
                  ]}
                  onPress={() => setIsTemplate(false)}
                >
                  <Text
                    style={[
                      styles.segmentedOptionText,
                      { color: !isTemplate ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    One-time
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.segmentedOption,
                    isTemplate && [styles.segmentedOptionActive, { backgroundColor: colors.tint }],
                  ]}
                  onPress={() => setIsTemplate(true)}
                >
                  <Text
                    style={[
                      styles.segmentedOptionText,
                      { color: isTemplate ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    Template
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>Task name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colorScheme === 'dark' ? '#444' : '#DDD',
                  },
                ]}
                value={taskName}
                onChangeText={setTaskName}
                placeholder="e.g. Restock towels"
                placeholderTextColor={colors.icon}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>Description (optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.text,
                    borderColor: colorScheme === 'dark' ? '#444' : '#DDD',
                  },
                ]}
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Add any details about this task..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Listing picker — only for one-time tasks */}
            {!isTemplate && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>Listing</Text>
                <View style={styles.listingOptions}>
                  {listings.map((listing: Listing) => (
                    <Pressable
                      key={listing.id}
                      style={[
                        styles.listingOption,
                        {
                          borderColor: selectedListingId === listing.id
                            ? colors.tint
                            : colorScheme === 'dark' ? '#444' : '#DDD',
                          backgroundColor: selectedListingId === listing.id
                            ? colorScheme === 'dark' ? '#2A1A1A' : '#FFF0F0'
                            : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedListingId(listing.id)}
                    >
                      <Home
                        size={16}
                        color={selectedListingId === listing.id ? colors.tint : colors.icon}
                      />
                      <Text
                        style={[
                          styles.listingOptionText,
                          {
                            color: selectedListingId === listing.id ? colors.tint : colors.text,
                          },
                        ]}
                      >
                        {listing.nickname}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Team member picker — only for one-time tasks */}
            {!isTemplate && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.icon }]}>Assign to (optional)</Text>
                <View style={styles.listingOptions}>
                  {teamMembers.map((member) => (
                    <Pressable
                      key={member.id}
                      style={[
                        styles.listingOption,
                        {
                          borderColor: selectedMemberId === member.id
                            ? colors.tint
                            : colorScheme === 'dark' ? '#444' : '#DDD',
                          backgroundColor: selectedMemberId === member.id
                            ? colorScheme === 'dark' ? '#2A1A1A' : '#FFF0F0'
                            : 'transparent',
                        },
                      ]}
                      onPress={() =>
                        setSelectedMemberId(
                          selectedMemberId === member.id ? null : member.id
                        )
                      }
                    >
                      <User
                        size={16}
                        color={selectedMemberId === member.id ? colors.tint : colors.icon}
                      />
                      <View>
                        <Text
                          style={[
                            styles.listingOptionText,
                            {
                              color: selectedMemberId === member.id ? colors.tint : colors.text,
                            },
                          ]}
                        >
                          {member.user.firstName} {member.user.lastName}
                        </Text>
                        <Text
                          style={[
                            styles.memberEmail,
                            { color: colors.icon },
                          ]}
                        >
                          {member.user.email}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              style={[styles.submitButton, { opacity: createLoading ? 0.7 : 1 }]}
              onPress={handleCreateTask}
              disabled={createLoading}
            >
              {createLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isTemplate ? 'Create Template' : 'Create Task'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
  },
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  taskCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskListingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskListing: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  templateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  templateBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
  },
  taskName: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: 12,
  },
  taskDate: {
    fontSize: 12,
  },
  swipeAction: {
    marginBottom: 12,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
    flexDirection: 'column',
    gap: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
  },
  modalCancelButton: {
    width: 60,
  },
  modalCancelText: {
    fontSize: 17,
  },
  modalContent: {
    padding: 20,
  },
  segmentedToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedOptionActive: {
    borderRadius: 10,
  },
  segmentedOptionText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  listingOptions: {
    gap: 8,
  },
  listingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listingOptionText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
  },
});
