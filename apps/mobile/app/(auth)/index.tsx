import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Link } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

type SocialProvider = 'google' | 'apple' | 'facebook';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const { data, error: socialError } = await authClient.signIn.social({
        provider,
        callbackURL: '/(tabs)',
      });

      if (socialError) {
        Alert.alert('Sign In Failed', socialError.message || `Failed to sign in with ${provider}`);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'smallbreeze-mobile://'
        );

        if (result.type === 'success') {
          // Root layout handles navigation when session updates
        }
      }
    } catch (err) {
      console.error(`${provider} sign in error:`, err);
      Alert.alert('Sign In Failed', `Unable to sign in with ${provider}. Please try again.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      setError('Enter a valid email');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message ?? 'Failed to sign in');
        return;
      }

      if (data) {
        // Root layout handles navigation via Redirect when session updates
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sign in</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome back
          </Text>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={[styles.floatingLabel, { backgroundColor: colors.background }]}>Email</Text>
              <TextInput
                style={[styles.inputWithLabel, { borderColor: '#E0E0E0', color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.floatingLabel, { backgroundColor: colors.background }]}>Password</Text>
              <TextInput
                style={[styles.inputWithLabel, styles.inputWithIcon, { borderColor: '#E0E0E0', color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder=""
                secureTextEntry={!showPassword}
                autoComplete="current-password"
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#999" />
                ) : (
                  <Eye size={20} color="#999" />
                )}
              </Pressable>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Sign In Button */}
            <Pressable
              style={[styles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
              )}
            </Pressable>

            {/* Sign up Link */}
            <Pressable style={styles.secondaryButton}>
              <Link href="/(auth)/sign-up" asChild>
                <Text style={[styles.secondaryButtonText, { color: '#666' }]}>
                  Don&apos;t have an account? Sign up
                </Text>
              </Link>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: '#E0E0E0' }]} />
              <Text style={[styles.dividerText, { color: '#999' }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: '#E0E0E0' }]} />
            </View>

            {/* Social Login Buttons */}
            {Platform.OS === 'ios' && (
              <Pressable
                style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
                onPress={() => handleSocialSignIn('apple')}
                disabled={loadingProvider !== null || loading}
              >
                {loadingProvider === 'apple' ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="logo-apple" size={20} color={colors.text} />
                )}
                <Text style={[styles.socialButtonText, { color: colors.text }]}>
                  Continue with Apple
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
              onPress={() => handleSocialSignIn('google')}
              disabled={loadingProvider !== null || loading}
            >
              {loadingProvider === 'google' ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
              )}
              <Text style={[styles.socialButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </Pressable>

            <Pressable
              style={[styles.socialButton, { borderColor: '#E0E0E0' }]}
              onPress={() => handleSocialSignIn('facebook')}
              disabled={loadingProvider !== null || loading}
            >
              {loadingProvider === 'facebook' ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              )}
              <Text style={[styles.socialButtonText, { color: colors.text }]}>
                Continue with Facebook
              </Text>
            </Pressable>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    marginTop: 32,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: 8,
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  inputWithLabel: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingRight: 48, // Make room for the eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }], // Center vertically
    zIndex: 2,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: -8,
  },
  primaryButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  socialButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FontFamily.medium,
    marginRight: 20,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleIconText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: '#4285F4',
  },
});