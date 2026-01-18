import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const searchParams = useLocalSearchParams();
  
  const inviteId = typeof searchParams.inviteId === 'string' ? searchParams.inviteId : null;
  const invitedEmail = typeof searchParams.email === 'string' ? searchParams.email : null;
  const isInvite = Boolean(inviteId);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(invitedEmail || '');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auto-fill team name when moving to step 2
  useEffect(() => {
    if (step === 2 && !teamName && firstName && lastName) {
      setTeamName(`${firstName} ${lastName}'s Team`);
    }
  }, [step, firstName, lastName, teamName]);

  const validateStep1 = () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return false;
    }
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
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    setError(null);
    if (isInvite) {
      // Skip to signup directly for invites
      handleSignUp();
    } else if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  };

  const handleSignUp = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const teamNameForCallback = teamName?.trim() || `${firstName} ${lastName}'s Team`;
      const webBaseUrl = Constants.expoConfig?.extra?.webBaseUrl;
      
      let callbackURL: string | undefined;
      if (webBaseUrl) {
        callbackURL = isInvite && inviteId
          ? `${webBaseUrl}/api/accept-invite?inviteId=${encodeURIComponent(inviteId)}`
          : `${webBaseUrl}/api/bootstrap-team?teamName=${encodeURIComponent(teamNameForCallback)}`;
      }
      
      await authClient.signUp.email({
        email: email.toLowerCase().trim(),
        password,
        firstName,
        lastName,
        ...(callbackURL && { callbackURL }),
      } as any);
      
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    return firstName && lastName ? `${firstName} ${lastName}'s Team` : 'Team';
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sign up</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            <>
              {/* Step 1 */}
              <Text style={[styles.title, { color: colors.text }]}>
                Let&apos;s get your account set up
              </Text>

              <View style={styles.form}>
                {/* First Name & Last Name Row */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.floatingLabel, { backgroundColor: colors.background }]}>First name</Text>
                  <TextInput
                    style={[styles.inputWithLabel, { borderColor: '#E0E0E0', color: colors.text }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder=""
                    autoCapitalize="words"
                    autoComplete="given-name"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.floatingLabel, { backgroundColor: colors.background }]}>Last name</Text>
                  <TextInput
                    style={[styles.inputWithLabel, { borderColor: '#E0E0E0', color: colors.text }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder=""
                    autoCapitalize="words"
                    autoComplete="family-name"
                  />
                </View>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.floatingLabel, { backgroundColor: invitedEmail ? '#F5F5F5' : colors.background }]}>Email</Text>
                  <TextInput
                    style={[
                      styles.inputWithLabel,
                      { 
                        borderColor: '#E0E0E0',
                        color: colors.text,
                        backgroundColor: invitedEmail ? '#F5F5F5' : 'transparent'
                      }
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder=""
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!invitedEmail}
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
                    autoComplete="new-password"
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

                {/* Terms Text */}
                <Text style={styles.termsText}>
                  By creating an account using email, Google, or Apple, I agree to the{' '}
                  <Text style={[styles.linkText, { color: colors.tint }]}>Terms and Conditions</Text>
                  , and acknowledge the{' '}
                  <Text style={[styles.linkText, { color: colors.tint }]}>Privacy Policy</Text>.
                </Text>

                {/* Create Account Button */}
                <Pressable
                  style={[styles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleContinue}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isInvite ? 'Create account' : 'Continue'}
                    </Text>
                  )}
                </Pressable>

                {/* Sign in Link */}
                <Pressable style={styles.secondaryButton}>
                  <Link href="/(auth)/sign-in" asChild>
                    <Text style={[styles.secondaryButtonText, { color: '#666' }]}>
                      Already have an account? Sign in
                    </Text>
                  </Link>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Step 2 - Team Name */}
              <Text style={[styles.title, { color: colors.text }]}>
                What&apos;s your team name?
              </Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.floatingLabel, { backgroundColor: colors.background }]}>Team name</Text>
                  <TextInput
                    style={[styles.inputWithLabel, { borderColor: '#E0E0E0', color: colors.text }]}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder={getPlaceholder()}
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Pressable
                  style={[styles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create account</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
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
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    // No gap needed since we removed labels
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
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
    marginTop: -12,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  linkText: {
    textDecorationLine: 'underline',
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 16,
  },
  socialButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});