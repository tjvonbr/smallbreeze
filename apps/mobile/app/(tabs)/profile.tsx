import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Home,
  LogOut,
  Plus,
  Settings,
  Tv2,
  UserPlus,
  Users,
} from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
};

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={[styles.menuItemLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <ChevronRight size={20} color="#999" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: session } = authClient.useSession();

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace('/(auth)/sign-in');
  };

  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Menu</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.bellButton}>
            <Bell size={22} color={colors.text} />
          </Pressable>
          <View style={styles.avatarContainer}>
            {session?.user?.image ? (
              <Image source={{ uri: session.user.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#E0E0E0' }]}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: colors.background }]}>
            <View style={styles.chartBars}>
              <View style={[styles.chartBar, styles.chartBarSmall, { backgroundColor: '#E31C5F' }]} />
              <View style={[styles.chartBar, styles.chartBarSmall, { backgroundColor: '#E31C5F' }]} />
              <View style={[styles.chartBar, styles.chartBarMedium, { backgroundColor: '#E31C5F' }]} />
              <View style={[styles.chartBar, styles.chartBarLarge, { backgroundColor: '#E31C5F' }]} />
              <View style={[styles.chartBar, styles.chartBarMedium, { backgroundColor: '#E0E0E0' }]} />
              <View style={[styles.chartBar, styles.chartBarSmall, { backgroundColor: '#E0E0E0' }]} />
            </View>
          </View>
          <View style={[styles.statsCard, { backgroundColor: colors.background }]}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={28} color={colors.text} />
              <Text style={[styles.ratingText, { color: colors.text }]}>5.0</Text>
            </View>
          </View>
        </View>

        {/* Create Listing Card */}
        <Pressable style={styles.createListingCard}>
          <View style={styles.createListingIcon}>
            <Home size={32} color="#666" />
          </View>
          <View style={styles.createListingContent}>
            <Text style={styles.createListingTitle}>Create a new listing</Text>
            <Text style={styles.createListingSubtitle}>Host a home on Airbnb.</Text>
          </View>
        </Pressable>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon={<Settings size={24} color={colors.text} />}
            label="Account settings"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Tv2 size={24} color={colors.text} />}
            label="Hosting resources"
            onPress={() => {}}
          />
          <MenuItem
            icon={<CircleHelp size={24} color={colors.text} />}
            label="Get help"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Users size={24} color={colors.text} />}
            label="Find a co-host"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Plus size={24} color={colors.text} />}
            label="Create a new listing"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Users size={24} color={colors.text} />}
            label="Refer a host"
            onPress={() => {}}
          />
          <MenuItem
            icon={<FileText size={24} color={colors.text} />}
            label="Legal"
            onPress={() => {}}
          />
          <MenuItem
            icon={<UserPlus size={24} color={colors.text} />}
            label="Invite team member"
            onPress={() => router.push('/invites' as never)}
          />

          <View style={styles.divider} />

          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <LogOut size={24} color={colors.text} />
              <Text style={[styles.menuItemLabel, { color: colors.text }]}>Log out</Text>
            </View>
          </Pressable>
        </View>

        {/* Bottom spacing for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Switch Button */}
      <View style={styles.floatingButtonContainer}>
        <Pressable style={styles.floatingButton}>
          <Ionicons name="swap-horizontal" size={20} color="#fff" />
          <Text style={styles.floatingButtonText}>Switch to traveling</Text>
        </Pressable>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatar: {
    width: 44,
    height: 44,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statsCard: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  chartBar: {
    width: 20,
    borderRadius: 4,
  },
  chartBarSmall: {
    height: 20,
  },
  chartBarMedium: {
    height: 32,
  },
  chartBarLarge: {
    height: 48,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 36,
    fontWeight: '700',
  },
  createListingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4EF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    gap: 16,
  },
  createListingIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E8E4DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createListingContent: {
    flex: 1,
  },
  createListingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  createListingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    marginTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemLabel: {
    fontSize: 17,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
