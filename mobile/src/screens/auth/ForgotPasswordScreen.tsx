import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BRAND } from '@ampel/shared/constants';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorText } from '@/components/ui/ErrorText';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/validators/auth';
import type { AuthStackParamList } from '@/navigation/types';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { resetPassword } = useAuth();
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setApiError('');

    const response = await resetPassword(data.email);

    setIsLoading(false);

    if (response.success) {
      setEmailSent(true);
    } else if (response.error) {
      setApiError(response.error.message);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent you a password reset link. Please check your email and follow the
            instructions to reset your password.
          </Text>
          <Button
            title="Back to Login"
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
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

            <Button
              title="Send Reset Link"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={!isValid || isLoading}
              style={styles.submitButton}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: BRAND.colors.text.secondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  submitButton: {
    marginBottom: 24,
  },
  backLink: {
    alignSelf: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: BRAND.colors.primary,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BRAND.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: BRAND.colors.text.secondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    marginTop: 24,
  },
});
