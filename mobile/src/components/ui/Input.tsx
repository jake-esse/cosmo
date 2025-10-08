import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { BRAND } from '@ampel/shared/constants';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  containerStyle,
  rightIcon,
  onRightIconPress,
  ...textInputProps
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            error ? styles.inputError : undefined,
            rightIcon ? styles.inputWithIcon : undefined,
          ]}
          placeholderTextColor={BRAND.colors.text.muted}
          {...textInputProps}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconContainer}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: BRAND.colors.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: BRAND.colors.border.strong,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: BRAND.colors.text.primary,
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  iconContainer: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
});
