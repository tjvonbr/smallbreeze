import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, RotateCw, Trash2, UserPlus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001';

interface Invite {
  id: string;
  email: string;
  teamId: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InvitesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchInvites = useCallback(async () => {
    try {
      const response = await authClient.$fetch<{ invites: Invite[] }>(
        `${apiUrl}/api/invites`
      );

      if (response.data?.invites) {
        setInvites(response.data.invites);
      }
    } catch (err) {
      console.error('Failed to fetch invites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvites();
  };

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleResendInvite = async (invite: Invite) => {
    try {
      const response = await authClient.$fetch(
        `${apiUrl}/api/invites/${invite.id}/resend`,
        { method: 'POST' }
      );

      if (response.error) {
        Alert.alert('Error', response.error.message || 'Failed to resend invite');
        return;
      }

      Alert.alert('Invite Resent', `The invite has been resent to ${invite.email}`);
    } catch (err) {
      console.error('Failed to resend invite:', err);
      Alert.alert('Error', 'Failed to resend invite. Please try again.');
    } finally {
      swipeableRefs.current.get(invite.id)?.close();
    }
  };

  const handleRescindInvite = (invite: Invite) => {
    Alert.alert(
      'Rescind Invite',
      `Are you sure you want to rescind the invite to ${invite.email}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            swipeableRefs.current.get(invite.id)?.close();
          },
        },
        {
          text: 'Rescind',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authClient.$fetch(
                `${apiUrl}/api/invites/${invite.id}`,
                { method: 'DELETE' }
              );

              if (response.error) {
                Alert.alert('Error', response.error.message || 'Failed to rescind invite');
                return;
              }

              setInvites((prev) => prev.filter((i) => i.id !== invite.id));
            } catch (err) {
              console.error('Failed to rescind invite:', err);
              Alert.alert('Error', 'Failed to rescind invite. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setInviteLoading(true);
    try {
      const response = await authClient.$fetch<{ invite: Invite }>(
        `${apiUrl}/api/invites`,
        {
          method: 'POST',
          body: { email: inviteEmail.toLowerCase().trim() },
        }
      );

      if (response.error) {
        Alert.alert('Error', response.error.message || 'Failed to send invite');
        return;
      }

      Alert.alert(
        'Invite Sent',
        `An invitation has been sent to ${inviteEmail}`,
        [{
          text: 'OK',
          onPress: () => {
            setModalVisible(false);
            setInviteEmail('');
            fetchInvites();
          },
        }]
      );
    } catch (err) {
      console.error('Failed to send invite:', err);
      Alert.alert('Error', 'Failed to send invite. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    invite: Invite
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, 0],
    });

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}>
        <Pressable
          style={styles.resendButton}
          onPress={() => handleResendInvite(invite)}
        >
          <RotateCw size={20} color="#FFFFFF" />
          <Text style={styles.resendButtonText}>Resend</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    invite: Invite
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}>
        <Pressable
          style={styles.rescindButton}
          onPress={() => handleRescindInvite(invite)}
        >
          <Trash2 size={20} color="#FFFFFF" />
          <Text style={styles.rescindButtonText}>Rescind</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderInvite = ({ item }: { item: Invite }) => {
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          } else {
            swipeableRefs.current.delete(item.id);
          }
        }}
        renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
        <View style={[styles.inviteCard, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F5F5F5' }]}>
          <View style={styles.inviteIcon}>
            <Mail size={20} color={colors.icon} />
          </View>
          <View style={styles.inviteContent}>
            <Text style={[styles.inviteEmail, { color: colors.text }]}>
              {item.email}
            </Text>
            <Text style={[styles.inviteDate, { color: colors.icon }]}>
              Sent {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#FFF3CD' }]}>
            <Text style={[styles.statusText, { color: '#856404' }]}>
              Pending
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <UserPlus size={48} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No invites yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
        Invite team members to collaborate on your properties
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invites</Text>
        <Pressable
          style={[styles.sendButton, { backgroundColor: colors.tint }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.sendButtonText}>Send invite</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={invites}
          renderItem={renderInvite}
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

      {/* Invite Modal */}
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Send Invite</Text>
            <View style={styles.modalCancelButton} />
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalDescription, { color: colors.icon }]}>
              Enter the email address of the person you want to invite to your team.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colorScheme === 'dark' ? '#444' : '#DDD',
                  },
                ]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="colleague@example.com"
                placeholderTextColor={colors.icon}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
            </View>

            <Pressable
              style={[styles.inviteButton, { opacity: inviteLoading ? 0.7 : 1 }]}
              onPress={handleSendInvite}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.inviteButtonText}>Send Invite</Text>
              )}
            </Pressable>
          </View>
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
    fontWeight: '600',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteContent: {
    flex: 1,
  },
  inviteEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  inviteDate: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  swipeAction: {
    marginBottom: 12,
    justifyContent: 'center',
  },
  rescindButton: {
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
    flexDirection: 'column',
    gap: 4,
  },
  rescindButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
    flexDirection: 'column',
    gap: 4,
  },
  resendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontWeight: '600',
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
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
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
  inviteButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
