import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/useAuth';
import { GasStockScreen } from '../screens/GasStockScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { colors, typography } from '../theme';

type AuthStackParamList = {
  Login: undefined;
};

type AppStackParamList = {
  GasStock: undefined;
  Home: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.authBackground },
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen
        name="GasStock"
        component={GasStockScreen}
      />
    </AppStack.Navigator>
  );
}

function SplashScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loadingText}>Restoring session...</Text>
    </View>
  );
}

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? <AppStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 8,
  },
  loadingText: {
    ...typography.body,
    color: colors.mutedText,
  },
});
