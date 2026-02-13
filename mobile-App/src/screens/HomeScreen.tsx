import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/useAuth';
import { AppButton } from '../components/AppButton';
import { colors, spacing, typography } from '../theme';

type UserDetailRowProps = {
  label: string;
  value: string;
};

function UserDetailRow({ label, value }: UserDetailRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Authenticated</Text>
        <Text style={styles.subtitle}>Phase 2 home placeholder</Text>

        <View style={styles.details}>
          <UserDetailRow label="ID" value={user ? String(user.id) : 'N/A'} />
          <UserDetailRow label="Username" value={user?.username ?? 'N/A'} />
          <UserDetailRow label="EPF Number" value={user?.epf_number ?? 'N/A'} />
          <UserDetailRow label="Designation" value={user?.designation ?? 'N/A'} />
          <UserDetailRow label="Role" value={user?.role ?? 'N/A'} />
        </View>

        <AppButton
          title="Logout"
          variant="danger"
          onPress={() => {
            void signOut();
          }}
          style={styles.button}
        />
      </View>
    </View>
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
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
  },
  details: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    gap: 2,
  },
  label: {
    ...typography.caption,
    color: colors.mutedText,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  button: {
    width: '100%',
  },
});
