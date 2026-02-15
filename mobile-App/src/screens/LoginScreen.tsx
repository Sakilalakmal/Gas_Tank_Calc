import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/useAuth';
import { colors, fonts, spacing, typography } from '../theme';

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const designationRef = useRef<TextInput>(null);
  const epfRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [designation, setDesignation] = useState('');
  const [epfNumber, setEpfNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onLoginPress = async () => {
    if (isEmpty(username) || isEmpty(epfNumber) || isEmpty(password)) {
      setErrorMessage('Please fill all fields');
      return;
    }

    Keyboard.dismiss();
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.card}>
              <Text style={styles.brandTitle}>Noritake</Text>
              <Text style={styles.welcomeText}>Welcome back</Text>

              <Image
                source={require('../../assets/gas.png')}
                style={styles.illustration}
                resizeMode="contain"
              />

              <Text style={styles.sectionTitle}>Log in to Account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor={colors.authMuted}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    designationRef.current?.focus();
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Designation</Text>
                <TextInput
                  ref={designationRef}
                  value={designation}
                  onChangeText={setDesignation}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="Enter designation"
                  placeholderTextColor={colors.authMuted}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    epfRef.current?.focus();
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EPF Number</Text>
                <TextInput
                  ref={epfRef}
                  value={epfNumber}
                  onChangeText={setEpfNumber}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="Enter EPF number"
                  placeholderTextColor={colors.authMuted}
                  keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    passwordRef.current?.focus();
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    style={styles.passwordInput}
                    secureTextEntry={!showPassword}
                    placeholder="Enter password"
                    placeholderTextColor={colors.authMuted}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void onLoginPress();
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      setShowPassword((previous) => !previous);
                    }}
                    hitSlop={10}
                  >
                    <Text style={styles.passwordToggle}>
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.errorContainer}>
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
              </View>

              <Pressable
                onPress={() => {
                  void onLoginPress();
                }}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && !isSubmitting && styles.loginButtonPressed,
                  isSubmitting && styles.loginButtonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.authCard} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Log IN</Text>
                )}
              </Pressable>

              <Text style={styles.helperText}>Internal operator access only</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.authCard,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.authCard,
  },
  card: {
    backgroundColor: colors.authCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.authBorder,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  brandTitle: {
    ...typography.title,
    fontFamily: fonts.brand,
    fontSize: 48,
    lineHeight: 54,
    color: colors.authText,
    textAlign: 'center',
  },
  welcomeText: {
    ...typography.body,
    fontFamily: fonts.brand,
    fontSize: 24,
    lineHeight: 30,
    color: colors.authText,
    textAlign: 'center',
    marginTop: -spacing.md,
  },
  illustration: {
    width: '100%',
    height: 200,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontFamily: fonts.medium,
    color: colors.authText,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.body,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.authText,
  },
  input: {
    ...typography.body,
    fontFamily: fonts.regular,
    backgroundColor: colors.authInput,
    borderColor: colors.authBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.authText,
    minHeight: 48,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.authInput,
    borderColor: colors.authBorder,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingRight: spacing.md,
  },
  passwordInput: {
    ...typography.body,
    fontFamily: fonts.regular,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.authText,
  },
  passwordToggle: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.authMuted,
  },
  errorContainer: {
    minHeight: 22,
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    fontFamily: fonts.medium,
    color: colors.fail,
  },
  loginButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.authPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonPressed: {
    opacity: 0.88,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    ...typography.button,
    fontFamily: fonts.medium,
    color: colors.authCard,
  },
  helperText: {
    ...typography.caption,
    fontFamily: fonts.regular,
    color: colors.authMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
