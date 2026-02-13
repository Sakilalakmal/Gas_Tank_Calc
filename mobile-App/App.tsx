import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { RootNavigator } from './src/app/navigation/RootNavigator';
import { apiConfig, getApiBaseUrlOrThrow } from './src/services/api/config';

export default function App() {
  let startupError: Error | null = null;
  let baseUrl = '';

  try {
    baseUrl = getApiBaseUrlOrThrow();
  } catch (error) {
    startupError = error instanceof Error ? error : new Error(String(error));
  }

  useEffect(() => {
    if (startupError) {
      return;
    }

    console.log('API BASE URL:', baseUrl);
    console.log('Platform:', Platform.OS);
  }, [baseUrl, startupError]);

  if (startupError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorText}>
          API Base URL not configured. Set EXPO_PUBLIC_API_BASE_URL in .env
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
    </>
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
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
