import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Chat input component with multi-line support
 * Auto-grows up to 5 lines, then becomes scrollable
 * Send button enabled only when text is entered
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Message...',
  maxLength = 2000,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [inputHeight, setInputHeight] = useState(40);

  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const { height } = e.nativeEvent.contentSize;
      const newHeight = Math.min(Math.max(40, height), 120); // Min 40, max 120 (5 lines)
      setInputHeight(newHeight);
    },
    []
  );

  const handleSend = useCallback(() => {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0 || disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmedValue);
    setValue('');
    setInputHeight(40); // Reset height
  }, [value, disabled, onSend]);

  const isSendEnabled = value.trim().length > 0 && !disabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { height: inputHeight }]}
            value={value}
            onChangeText={setValue}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={maxLength}
            editable={!disabled}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendButton, isSendEnabled ? styles.sendButtonEnabled : styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!isSendEnabled}
          >
            <Feather
              name="send"
              size={20}
              color={isSendEnabled ? '#FFFFFF' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    fontSize: 16,
    color: '#111827',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonEnabled: {
    backgroundColor: '#6366F1',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});
