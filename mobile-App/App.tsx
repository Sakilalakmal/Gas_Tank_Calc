import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getApiBaseUrlOrThrow } from './src/services/api/config';
import { fontAssets, typography } from './src/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // noop
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {
        // noop
      });
    }
  }, [fontError, fontsLoaded]);

  let startupError: Error | null = null;

  try {
    getApiBaseUrlOrThrow();
  } catch (error) {
    startupError = error instanceof Error ? error : new Error(String(error));
  }

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (startupError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Configuration Error</Text>
          <Text style={styles.errorText}>
            API Base URL not configured. Set EXPO_PUBLIC_API_BASE_URL in .env
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    ...typography.title,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorText: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
