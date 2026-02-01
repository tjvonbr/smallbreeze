import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

type SocialProvider = 'google' | 'apple' | 'facebook';

export default function AuthLandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setLoadingProvider(provider);

    try {
      const { data, error } = await authClient.signIn.social({
        provider,
        callbackURL: '/(tabs)',
      });

      if (error) {
        Alert.alert('Sign In Failed', error.message || `Failed to sign in with ${provider}`);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'smallbreeze-mobile://'
        );

        if (result.type === 'success') {
          router.replace('/(tabs)');
        }
      }
    } catch (err) {
      console.error(`${provider} sign in error:`, err);
      Alert.alert('Sign In Failed', `Unable to sign in with ${provider}. Please try again.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Log in or sign up</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.content}>
        {/* Welcome text */}
        <Text style={[styles.welcomeText, { color: colors.text }]}>
          Welcome to smallbreeze
        </Text>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: '#E0E0E0' }]} />
          <Text style={[styles.dividerText, { color: '#999' }]}>continue with</Text>
          <View style={[styles.dividerLine, { backgroundColor: '#E0E0E0' }]} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialButtons}>
          {/* Email */}
          <Pressable
            style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Ionicons name="mail-outline" size={22} color={colors.text} />
            <Text style={[styles.socialButtonText, { color: colors.text }]}>
              Continue with email
            </Text>
          </Pressable>

          {/* Apple - only show on iOS */}
          {Platform.OS === 'ios' && (
            <Pressable
              style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
              onPress={() => handleSocialSignIn('apple')}
              disabled={loadingProvider !== null}
            >
              {loadingProvider === 'apple' ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="logo-apple" size={22} color={colors.text} />
              )}
              <Text style={[styles.socialButtonText, { color: colors.text }]}>
                Continue with Apple
              </Text>
            </Pressable>
          )}

          {/* Google */}
          <Pressable
            style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
            onPress={() => handleSocialSignIn('google')}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === 'google' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <GoogleIcon />
            )}
            <Text style={[styles.socialButtonText, { color: colors.text }]}>
              Continue with Google
            </Text>
          </Pressable>

          {/* Facebook */}
          <Pressable
            style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
            onPress={() => handleSocialSignIn('facebook')}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === 'facebook' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="logo-facebook" size={22} color="#1877F2" />
            )}
            <Text style={[styles.socialButtonText, { color: colors.text }]}>
              Continue with Facebook
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Google icon component (multi-colored G)
function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
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
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  socialButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 22, // Offset for the icon width to center text
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
});
