import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components/AppButton';
import { apiConfig } from '../services/api/config';
import {
  formatErrorForDebug,
  normalizeError,
  NormalizedError,
} from '../services/api/errors';
import { checkHealth, HealthResponse } from '../services/api/health';
import { colors, spacing, typography } from '../theme';
import { logDebug, logError } from '../utils/logger';

type CheckStatus = 'idle' | 'loading' | 'ok' | 'fail';

function buildFriendlyErrorMessage(error: NormalizedError | null): string | null {
  if (!error) {
    return null;
  }

  if (error.kind === 'NetworkError') {
    return error.isTimeout
      ? 'Network error: Request timed out after 8 seconds. Please retry.'
      : 'Network error: Cannot reach server. Check phone/laptop WiFi and API Base URL.';
  }

  if (error.kind === 'ApiError') {
    if (error.code === 'UNAUTHORIZED') {
      return 'Unauthorized (401).';
    }

    if (error.code === 'SERVER_ERROR') {
      return 'Server error (500+).';
    }

    return `Request failed with HTTP ${error.status}.`;
  }

  return 'Unexpected issue happened. Please retry.';
}

export function SystemCheckScreen() {
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [healthResponse, setHealthResponse] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<NormalizedError | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const runCheck = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const response = await checkHealth();
      setHealthResponse(response);
      setStatus('ok');
      logDebug('Health check succeeded', response);
    } catch (unknownError) {
      const normalizedError = normalizeError(unknownError);
      setHealthResponse(null);
      setError(normalizedError);
      setStatus('fail');
      logError('Health check failed', formatErrorForDebug(normalizedError));
    } finally {
      setLastCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const friendlyErrorMessage = buildFriendlyErrorMessage(error);

  const statusLabel = useMemo(() => {
    if (status === 'ok') {
      return 'OK';
    }
    if (status === 'fail') {
      return 'FAIL';
    }
    if (status === 'loading') {
      return 'CHECKING';
    }
    return 'IDLE';
  }, [status]);

  const rawOutput = useMemo(() => {
    if (healthResponse) {
      return JSON.stringify(healthResponse, null, 2);
    }

    if (error) {
      return JSON.stringify(formatErrorForDebug(error), null, 2);
    }

    return '{}';
  }, [error, healthResponse]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>System Check</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>API Base URL</Text>
          <Text style={styles.value}>{apiConfig.baseUrl}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Platform</Text>
          <Text style={styles.value}>{apiConfig.platform}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <View
            style={[
              styles.badge,
              status === 'ok'
                ? styles.badgeOk
                : status === 'fail'
                  ? styles.badgeFail
                  : styles.badgeIdle,
            ]}
          >
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Last Checked</Text>
          <Text style={styles.value}>
            {lastCheckedAt ? lastCheckedAt.toLocaleString() : 'Not yet'}
          </Text>
        </View>

        <View style={styles.rawContainer}>
          <Text style={styles.label}>Raw Status JSON</Text>
          <Text style={styles.rawText}>{rawOutput}</Text>
        </View>

        {friendlyErrorMessage ? (
          <Text style={styles.errorText}>{friendlyErrorMessage}</Text>
        ) : null}

        {status === 'loading' ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Checking backend...</Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <AppButton
            title="Run Check"
            onPress={() => {
              void runCheck();
            }}
            loading={status === 'loading'}
            disabled={status === 'loading'}
            style={styles.mainButton}
          />
          {status === 'fail' ? (
            <AppButton
              title="Retry"
              onPress={() => {
                void runCheck();
              }}
              variant="danger"
              style={styles.retryButton}
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.mutedText,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
  },
  badgeFail: {
    backgroundColor: '#FEE2E2',
  },
  badgeIdle: {
    backgroundColor: '#E5E7EB',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  rawContainer: {
    gap: spacing.xs,
  },
  rawText: {
    ...typography.mono,
    color: colors.text,
    backgroundColor: '#F9FAFB',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.fail,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.mutedText,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  mainButton: {
    width: '100%',
  },
  retryButton: {
    width: '100%',
  },
});
