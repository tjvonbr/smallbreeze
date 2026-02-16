import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  ChevronLeft,
  ClipboardList,
  Home,
  User,
} from 'lucide-react-native';

import { Colors } from '@/constants/theme';
import { useListings, Listing } from '@/context/listings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiUrl } from '@/lib/api-url';
import { authClient } from '@/lib/auth-client';

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isTemplate: boolean;
  dueDate: string | null;
  teamId: string;
  listingId: string | null;
  listing: {
    id: string;
    nickname: string;
  } | null;
  assignments: {
    id: string;
    teamMember: {
      id: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
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

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: '#FFF3CD', text: '#856404' },
  IN_PROGRESS: { label: 'In Progress', bg: '#CCE5FF', text: '#004085' },
  COMPLETED: { label: 'Done', bg: '#D4EDDA', text: '#155724' },
};

const TEMPLATE_BADGE = { bg: '#E8DAEF', text: '#6C3483' };

// --- Reusable EditModal (same pattern as listing) ---
interface EditModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}

function EditModal({ visible, title, onClose, onSave, saving, children, colors, colorScheme }: EditModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <View style={[styles.modalCloseCircle, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
              <Text style={[styles.modalCloseX, { color: colors.text }]}>x</Text>
            </View>
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalContent}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.modalContentContainer}
        >
          {children}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalFooter, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// --- Reusable FormField ---
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  multiline?: boolean;
}

function FormField({ label, value, onChangeText, placeholder, colors, colorScheme, multiline }: FormFieldProps) {
  return (
    <View style={styles.formField}>
      <View style={[styles.inputContainer, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}>
        <Text style={[styles.inputLabel, { color: colors.icon }]}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.textAreaInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.icon}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { listings, fetchListings } = useListings();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Modal visibility states
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [listingModalVisible, setListingModalVisible] = useState(false);
  const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);
  const [dueDateModalVisible, setDueDateModalVisible] = useState(false);

  // Form states
  const [nameForm, setNameForm] = useState('');
  const [descriptionForm, setDescriptionForm] = useState('');
  const [statusForm, setStatusForm] = useState<Task['status']>('PENDING');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [dueDateForm, setDueDateForm] = useState('');

  const fetchTask = useCallback(async () => {
    try {
      const response = await authClient.$fetch<{ task: Task }>(
        `${apiUrl}/api/tasks/${id}`
      );
      if (response.data?.task) {
        setTask(response.data.task);
      }
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    fetchTask();
    fetchTeamMembers();
    if (listings.length === 0) {
      fetchListings();
    }
  }, [fetchTask, fetchTeamMembers, fetchListings, listings.length]);

  // --- Save helpers ---
  const patchTask = async (body: Record<string, unknown>) => {
    if (!task) return;
    setSaving(true);
    try {
      const response = await authClient.$fetch<{ task: Task }>(
        `${apiUrl}/api/tasks/${task.id}`,
        { method: 'PATCH', body }
      );
      if (response.data?.task) {
        setTask(response.data.task);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    await patchTask({ name: nameForm });
    setNameModalVisible(false);
  };

  const saveDescription = async () => {
    await patchTask({ description: descriptionForm || null });
    setDescriptionModalVisible(false);
  };

  const saveStatus = async () => {
    await patchTask({ status: statusForm });
    setStatusModalVisible(false);
  };

  const saveListing = async () => {
    await patchTask({ listingId: selectedListingId });
    setListingModalVisible(false);
  };

  const saveAssignee = async () => {
    await patchTask({ assigneeTeamMemberId: selectedMemberId });
    setAssigneeModalVisible(false);
  };

  const saveDueDate = async () => {
    await patchTask({ dueDate: dueDateForm || null });
    setDueDateModalVisible(false);
  };

  // --- Open modal helpers ---
  const openNameModal = () => {
    if (task) {
      setNameForm(task.name);
      setNameModalVisible(true);
    }
  };

  const openDescriptionModal = () => {
    if (task) {
      setDescriptionForm(task.description || '');
      setDescriptionModalVisible(true);
    }
  };

  const openStatusModal = () => {
    if (task) {
      setStatusForm(task.status);
      setStatusModalVisible(true);
    }
  };

  const openListingModal = () => {
    if (task) {
      setSelectedListingId(task.listingId);
      setListingModalVisible(true);
    }
  };

  const openAssigneeModal = () => {
    if (task) {
      const currentAssignee = task.assignments[0]?.teamMember?.id ?? null;
      setSelectedMemberId(currentAssignee);
      setAssigneeModalVisible(true);
    }
  };

  const openDueDateModal = () => {
    if (task) {
      setDueDateForm(task.dueDate ? task.dueDate.split('T')[0] : '');
      setDueDateModalVisible(true);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Task</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Task</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status];
  const assignee = task.assignments[0]?.teamMember;

  const formatDueDate = (dateString: string | null): string => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {task.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Type badge */}
        {task.isTemplate && (
          <View style={styles.section}>
            <View style={[styles.templateBadgeLarge, { backgroundColor: TEMPLATE_BADGE.bg }]}>
              <Text style={[styles.templateBadgeTextLarge, { color: TEMPLATE_BADGE.text }]}>
                Template
              </Text>
            </View>
          </View>
        )}

        {/* Name */}
        <Pressable style={styles.section} onPress={openNameModal}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Name</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            <Text style={[styles.cardText, { color: colors.text }]}>{task.name}</Text>
          </View>
        </Pressable>

        {/* Description */}
        <Pressable style={styles.section} onPress={openDescriptionModal}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            {task.description ? (
              <Text style={[styles.cardText, { color: colors.text }]}>{task.description}</Text>
            ) : (
              <Text style={[styles.placeholderText, { color: colors.icon }]}>No description</Text>
            )}
          </View>
        </Pressable>

        {/* Status */}
        <Pressable style={styles.section} onPress={openStatusModal}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </Pressable>

        {/* Listing — only for non-templates */}
        {!task.isTemplate && (
          <Pressable style={styles.section} onPress={openListingModal}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Listing</Text>
            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
              {task.listing ? (
                <View style={styles.iconRow}>
                  <Home size={16} color={colors.icon} />
                  <Text style={[styles.cardText, { color: colors.text }]}>{task.listing.nickname}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.icon }]}>No listing assigned</Text>
              )}
            </View>
          </Pressable>
        )}

        {/* Assignee — only for non-templates */}
        {!task.isTemplate && (
          <Pressable style={styles.section} onPress={openAssigneeModal}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned To</Text>
            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
              {assignee ? (
                <View style={styles.iconRow}>
                  <User size={16} color={colors.icon} />
                  <View>
                    <Text style={[styles.cardText, { color: colors.text }]}>
                      {assignee.user.firstName} {assignee.user.lastName}
                    </Text>
                    <Text style={[styles.cardSubtext, { color: colors.icon }]}>{assignee.user.email}</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.icon }]}>Unassigned</Text>
              )}
            </View>
          </Pressable>
        )}

        {/* Due Date */}
        <Pressable style={styles.section} onPress={openDueDateModal}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Due Date</Text>
          <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
            <View style={styles.iconRow}>
              <Calendar size={16} color={colors.icon} />
              <Text style={[task.dueDate ? styles.cardText : styles.placeholderText, { color: task.dueDate ? colors.text : colors.icon }]}>
                {formatDueDate(task.dueDate)}
              </Text>
            </View>
          </View>
        </Pressable>
      </ScrollView>

      {/* --- Edit Modals --- */}

      {/* Name Modal */}
      <EditModal
        visible={nameModalVisible}
        title="Name"
        onClose={() => setNameModalVisible(false)}
        onSave={saveName}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <FormField
          label="Task Name"
          value={nameForm}
          onChangeText={setNameForm}
          placeholder="Enter task name"
          colors={colors}
          colorScheme={colorScheme}
        />
      </EditModal>

      {/* Description Modal */}
      <EditModal
        visible={descriptionModalVisible}
        title="Description"
        onClose={() => setDescriptionModalVisible(false)}
        onSave={saveDescription}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <FormField
          label="Description"
          value={descriptionForm}
          onChangeText={setDescriptionForm}
          placeholder="Add a description..."
          colors={colors}
          colorScheme={colorScheme}
          multiline
        />
      </EditModal>

      {/* Status Modal */}
      <EditModal
        visible={statusModalVisible}
        title="Status"
        onClose={() => setStatusModalVisible(false)}
        onSave={saveStatus}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <View style={styles.optionsList}>
          {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const isSelected = statusForm === status;
            return (
              <Pressable
                key={status}
                style={[
                  styles.optionCard,
                  {
                    borderColor: isSelected ? colors.tint : colorScheme === 'dark' ? '#444' : '#DDD',
                    backgroundColor: isSelected
                      ? colorScheme === 'dark' ? '#2A1A1A' : '#FFF0F0'
                      : 'transparent',
                  },
                ]}
                onPress={() => setStatusForm(status)}
              >
                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                  <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </EditModal>

      {/* Listing Modal */}
      <EditModal
        visible={listingModalVisible}
        title="Listing"
        onClose={() => setListingModalVisible(false)}
        onSave={saveListing}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <View style={styles.optionsList}>
          {listings.map((listing: Listing) => {
            const isSelected = selectedListingId === listing.id;
            return (
              <Pressable
                key={listing.id}
                style={[
                  styles.optionCard,
                  {
                    borderColor: isSelected ? colors.tint : colorScheme === 'dark' ? '#444' : '#DDD',
                    backgroundColor: isSelected
                      ? colorScheme === 'dark' ? '#2A1A1A' : '#FFF0F0'
                      : 'transparent',
                  },
                ]}
                onPress={() => setSelectedListingId(listing.id)}
              >
                <Home size={16} color={isSelected ? colors.tint : colors.icon} />
                <Text style={[styles.optionText, { color: isSelected ? colors.tint : colors.text }]}>
                  {listing.nickname}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </EditModal>

      {/* Assignee Modal */}
      <EditModal
        visible={assigneeModalVisible}
        title="Assign To"
        onClose={() => setAssigneeModalVisible(false)}
        onSave={saveAssignee}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <View style={styles.optionsList}>
          <Pressable
            style={[
              styles.optionCard,
              {
                borderColor: selectedMemberId === null ? colors.tint : colorScheme === 'dark' ? '#444' : '#DDD',
                backgroundColor: selectedMemberId === null
                  ? colorScheme === 'dark' ? '#2A1A1A' : '#FFF0F0'
                  : 'transparent',
              },
            ]}
            onPress={() => setSelectedMemberId(null)}
          >
            <Text style={[styles.optionText, { color: selectedMemberId === null ? colors.tint : colors.icon }]}>
              Unassigned
            </Text>
          </Pressable>
          {teamMembers.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <Pressable
                key={member.id}
                style={[
                  styles.optionCard,
                  {
                    borderColor: isSelected ? colors.tint : colorScheme === 'dark' ? '#444' : '#DDD',
                    backgroundColor: isSelected
                      ? colorScheme === 'dark' ? '#2A1A1A' : '#FFF0F0'
                      : 'transparent',
                  },
                ]}
                onPress={() => setSelectedMemberId(member.id)}
              >
                <User size={16} color={isSelected ? colors.tint : colors.icon} />
                <View>
                  <Text style={[styles.optionText, { color: isSelected ? colors.tint : colors.text }]}>
                    {member.user.firstName} {member.user.lastName}
                  </Text>
                  <Text style={[styles.memberEmail, { color: colors.icon }]}>
                    {member.user.email}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </EditModal>

      {/* Due Date Modal */}
      <EditModal
        visible={dueDateModalVisible}
        title="Due Date"
        onClose={() => setDueDateModalVisible(false)}
        onSave={saveDueDate}
        saving={saving}
        colors={colors}
        colorScheme={colorScheme}
      >
        <FormField
          label="Due Date (YYYY-MM-DD)"
          value={dueDateForm}
          onChangeText={setDueDateForm}
          placeholder="e.g. 2025-06-15"
          colors={colors}
          colorScheme={colorScheme}
        />
        <Text style={[styles.fieldHint, { color: colors.icon }]}>
          Leave empty to remove the due date.
        </Text>
      </EditModal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    opacity: 0.6,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardText: {
    fontSize: 16,
  },
  cardSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  templateBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  templateBadgeTextLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
  },
  modalCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseX: {
    fontSize: 20,
    fontWeight: '400',
    marginTop: -2,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 17,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  // Form styles
  formField: {
    marginBottom: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    fontSize: 17,
    padding: 0,
  },
  textAreaInput: {
    minHeight: 120,
  },
  fieldHint: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  // Option picker styles
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
});
