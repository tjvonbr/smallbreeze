import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

export default function SignInScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      await authClient.signIn.email({
        email: email.toLowerCase().trim(),
        password,
      });
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sign in</Text>
          <View style={styles.backButton} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '500',
  },
});