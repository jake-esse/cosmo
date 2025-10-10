import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { BRAND } from '@ampel/shared/constants';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';
import { signupSchema, type SignupFormData } from '@/validators/auth';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setApiError('');

    const response = await signUp({
      email: data.email,
      password: data.password,
      referralCode: data.referralCode || undefined,
    });

    setIsLoading(false);

    if (!response.success && response.error) {
      setApiError(response.error.message);
    }
    // If success, navigation happens automatically via index.tsx
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Ampel and start earning equity</Text>
          </View>

          <View style={styles.form}>
            {apiError ? <ErrorText message={apiError} /> : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="At least 8 characters with 1 number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                  rightIcon={
                    <Text style={styles.iconText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                  rightIcon={
                    <Text style={styles.iconText}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  }
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              )}
            />

            <Controller
              control={control}
              name="referralCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Referral Code (Optional)"
                  placeholder="Enter 8-character code"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.referralCode?.message}
                  autoCapitalize="characters"
                  maxLength={8}
                  editable={!isLoading}
                />
              )}
            />

            <Controller
              control={control}
              name="acceptTerms"
              render={({ field: { onChange, value } }) => (
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => onChange(!value)}
                    disabled={isLoading}
                  >
                    <View
                      style={[styles.checkboxBox, value && styles.checkboxBoxChecked]}
                    >
                      {value && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I accept the{' '}
                      <Text style={styles.link}>Terms of Service</Text> and{' '}
                      <Text style={styles.link}>Privacy Policy</Text>
                    </Text>
                  </TouchableOpacity>
                  {errors.acceptTerms && (
                    <Text style={styles.checkboxError}>{errors.acceptTerms.message}</Text>
                  )}
                </View>
              )}
            />

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={!isValid || isLoading}
              style={styles.submitButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BRAND.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: BRAND.colors.text.secondary,
  },
  form: {
    flex: 1,
  },
  iconText: {
    fontSize: 14,
    color: BRAND.colors.primary,
    fontWeight: '500',
  },
  checkboxContainer: {
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: BRAND.colors.border.strong,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: BRAND.colors.primary,
    borderColor: BRAND.colors.primary,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: BRAND.colors.text.secondary,
    lineHeight: 20,
  },
  checkboxError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 36,
  },
  link: {
    color: BRAND.colors.primary,
    fontWeight: '500',
  },
  submitButton: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 14,
    color: BRAND.colors.text.secondary,
  },
  footerLink: {
    fontSize: 14,
    color: BRAND.colors.primary,
    fontWeight: '600',
  },
});
