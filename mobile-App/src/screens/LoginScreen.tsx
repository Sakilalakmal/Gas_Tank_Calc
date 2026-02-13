import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/useAuth';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme';

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [epfNumber, setEpfNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onLoginPress = async () => {
    if (isEmpty(username) || isEmpty(epfNumber) || isEmpty(password)) {
      setErrorMessage('Please fill all fields');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({
        username: username.trim(),
        epf_number: epfNumber.trim(),
        password,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Operator Login</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={colors.mutedText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EPF Number</Text>
          <TextInput
            value={epfNumber}
            onChangeText={setEpfNumber}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="Enter EPF number"
            placeholderTextColor={colors.mutedText}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            placeholder="Enter password"
            placeholderTextColor={colors.mutedText}
          />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AppButton
          title="Login"
          onPress={() => {
            void onLoginPress();
          }}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.mutedText,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  errorText: {
    ...typography.body,
    color: colors.fail,
  },
  button: {
    width: '100%',
  },
});
