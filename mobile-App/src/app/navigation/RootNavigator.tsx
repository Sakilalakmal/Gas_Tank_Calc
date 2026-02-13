import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { SystemCheckScreen } from '../../screens/SystemCheckScreen';
import { colors } from '../../theme';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
          title: 'System Check',
        }}
      >
        <Stack.Screen name="SystemCheck" component={SystemCheckScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
