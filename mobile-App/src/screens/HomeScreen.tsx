import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/useAuth';
import { isReadingWithinOperationalLimits, lpgConfig } from '../config/lpg';
import { apiClient, ReadingRecord } from '../services/api/apiClient';
import { colors, fonts, spacing, typography } from '../theme';

type AppStackParamList = {
  Home: undefined;
  GasStock: undefined;
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;

type TankReadingKey = 'kg1' | 'kg2' | 'kg3' | 'kg4';

const TANK_CAPACITY_KG = lpgConfig.perTankCapacityKg;
const TOTAL_CAPACITY_KG = lpgConfig.totalCapacityKg;
const HISTORY_LIMIT = 90;

const tankRows: Array<{ key: string; label: string; readingKey: TankReadingKey }> = [
  { key: 'tank1', label: 'Tank 1', readingKey: 'kg1' },
  { key: 'tank2', label: 'Tank 2', readingKey: 'kg2' },
  { key: 'tank3', label: 'Tank 3', readingKey: 'kg3' },
  { key: 'tank4', label: 'Tank 4', readingKey: 'kg4' },
];

function formatKg(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(2);
}

function parseIsoDate(isoTimestamp: string | null | undefined): Date | null {
  if (!isoTimestamp) {
    return null;
  }

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateTime(isoTimestamp: string | null | undefined): string {
  const date = parseIsoDate(isoTimestamp);
  if (!date) {
    return '-';
  }

  return date.toLocaleString();
}

function formatDateLabel(isoTimestamp: string | null | undefined): string {
  const date = parseIsoDate(isoTimestamp);
  if (!date) {
    return '-';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeLabel(isoTimestamp: string | null | undefined): string {
  const date = parseIsoDate(isoTimestamp);
  if (!date) {
    return '-';
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getReadingTimestamp(reading: ReadingRecord): string | null {
  return reading.recorded_at ?? reading.created_at ?? null;
}

function getPercent(value: number | undefined, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || max <= 0) {
    return 0;
  }

  const raw = (value / max) * 100;
  return Math.max(0, Math.min(100, raw));
}

function formatPercent(value: number | undefined, max: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || max <= 0) {
    return '--';
  }

  return `${((value / max) * 100).toFixed(1)}%`;
}

function buildDailyHistory(readings: ReadingRecord[]): ReadingRecord[] {
  const sorted = [...readings].sort((a, b) => {
    const aTime = parseIsoDate(getReadingTimestamp(a))?.getTime() ?? 0;
    const bTime = parseIsoDate(getReadingTimestamp(b))?.getTime() ?? 0;
    return bTime - aTime;
  });

  const seenDays = new Set<string>();
  const dailyReadings: ReadingRecord[] = [];

  for (const reading of sorted) {
    const date = parseIsoDate(getReadingTimestamp(reading));
    if (!date) {
      continue;
    }

    const dayKey = toDayKey(date);
    if (seenDays.has(dayKey)) {
      continue;
    }

    seenDays.add(dayKey);
    dailyReadings.push(reading);
  }

  return dailyReadings;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, signOut } = useAuth();
  const [latestReading, setLatestReading] = useState<ReadingRecord | null>(null);
  const [dailyHistory, setDailyHistory] = useState<ReadingRecord[]>([]);
  const [ignoredInvalidCount, setIgnoredInvalidCount] = useState<number>(0);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    setDashboardError(null);

    const [latestResult, historyResult] = await Promise.allSettled([
      apiClient.getLatestReading(),
      apiClient.getReadings(HISTORY_LIMIT, true),
    ]);

    const historyReadings = historyResult.status === 'fulfilled' ? historyResult.value : [];
    const safeHistoryReadings = historyReadings.filter((reading) =>
      isReadingWithinOperationalLimits(reading)
    );
    const latestFromHistory = safeHistoryReadings.length > 0 ? safeHistoryReadings[0] : null;
    const latestDirect =
      latestResult.status === 'fulfilled' &&
      latestResult.value &&
      isReadingWithinOperationalLimits(latestResult.value)
        ? latestResult.value
        : null;

    setIgnoredInvalidCount(historyReadings.length - safeHistoryReadings.length);
    setLatestReading(latestDirect ?? latestFromHistory);
    setDailyHistory(buildDailyHistory(safeHistoryReadings));

    if (latestResult.status === 'rejected' && historyResult.status === 'rejected') {
      setDashboardError('Unable to load dashboard.');
    }

    setIsLoadingDashboard(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData])
  );

  const totalKg = latestReading?.total_kg;
  const totalPercent = getPercent(totalKg, TOTAL_CAPACITY_KG);

  const tankCards = useMemo(
    () =>
      tankRows.map((tank) => {
        const kg = latestReading?.[tank.readingKey];
        return {
          ...tank,
          kg: typeof kg === 'number' ? kg : undefined,
          percent: getPercent(kg, TANK_CAPACITY_KG),
        };
      }),
    [latestReading]
  );

  const latestTimestamp = latestReading ? formatDateTime(getReadingTimestamp(latestReading)) : '-';
  const operatorName = user?.username ?? '-';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.badge}>GAS STOCK</Text>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.operatorText}>{operatorName}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.ghostButton} onPress={() => navigation.navigate('GasStock')}>
              <Text style={styles.ghostButtonText}>Calculate</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={() => void signOut()}>
              <Text style={styles.ghostButtonText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{formatKg(totalKg)}</Text>
              <Text style={styles.kpiUnit}>kg</Text>
            </View>
            <Text style={styles.kpiMeta}>
              {formatPercent(totalKg, TOTAL_CAPACITY_KG)} / {formatKg(TOTAL_CAPACITY_KG)} kg
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${totalPercent}%` }]} />
            </View>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Last Check</Text>
            <Text style={styles.kpiTime}>{latestTimestamp}</Text>
            <Text style={styles.kpiMeta}>{isLoadingDashboard ? 'Syncing...' : 'Synced'}</Text>
            {dashboardError ? <Text style={styles.errorText}>{dashboardError}</Text> : null}
          </View>
        </View>

        {ignoredInvalidCount > 0 ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{ignoredInvalidCount} invalid readings hidden.</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tanks</Text>
          <View style={styles.tankGrid}>
            {tankCards.map((tank) => (
              <View key={tank.key} style={styles.tankCard}>
                <Text style={styles.tankName}>{tank.label}</Text>
                <Text style={styles.tankValue}>{formatKg(tank.kg)} kg</Text>
                <Text style={styles.tankMeta}>{formatPercent(tank.kg, TANK_CAPACITY_KG)}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${tank.percent}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>History</Text>
            <Pressable onPress={() => void loadDashboardData()}>
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>
          {dailyHistory.length === 0 ? (
            <Text style={styles.emptyText}>{isLoadingDashboard ? 'Loading...' : 'No history'}</Text>
          ) : (
            dailyHistory.slice(0, 14).map((reading) => (
              <View key={reading.id} style={styles.historyItem}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyDate}>{formatDateLabel(getReadingTimestamp(reading))}</Text>
                  <Text style={styles.historyTime}>{formatTimeLabel(getReadingTimestamp(reading))}</Text>
                </View>
                <Text style={styles.historyTotal}>
                  Total {formatKg(reading.total_kg)} kg ({formatPercent(reading.total_kg, TOTAL_CAPACITY_KG)})
                </Text>
                <View style={styles.historyTankLine}>
                  {tankRows.map((tank) => (
                    <Text key={`${reading.id}-${tank.key}`} style={styles.historyTankText}>
                      {tank.label.replace('Tank ', 'T')}: {formatKg(reading[tank.readingKey])}
                    </Text>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECECEC',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  badge: {
    ...typography.caption,
    color: '#FFFFFF',
    backgroundColor: '#111111',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  title: {
    ...typography.sectionTitle,
    color: '#111111',
    fontFamily: fonts.bold,
  },
  operatorText: {
    ...typography.caption,
    color: '#5E5E5E',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ghostButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#C9C9C9',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
  },
  ghostButtonText: {
    ...typography.caption,
    color: '#1C1C1C',
    fontFamily: fonts.semibold,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    gap: spacing.xs,
  },
  kpiLabel: {
    ...typography.caption,
    color: '#4A4A4A',
    fontFamily: fonts.medium,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  kpiValue: {
    ...typography.title,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 32,
    color: '#111111',
  },
  kpiUnit: {
    ...typography.caption,
    color: '#444444',
    marginBottom: 3,
  },
  kpiMeta: {
    ...typography.caption,
    color: '#646464',
  },
  kpiTime: {
    ...typography.body,
    color: '#111111',
    fontFamily: fonts.medium,
  },
  errorText: {
    ...typography.caption,
    color: colors.fail,
  },
  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E7E7E7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#161616',
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6B5B5',
    backgroundColor: '#FDF4F4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warningText: {
    ...typography.caption,
    color: '#8A1C1C',
    fontFamily: fonts.medium,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: '#111111',
    fontFamily: fonts.semibold,
  },
  tankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tankCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FAFAFA',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  tankName: {
    ...typography.caption,
    color: '#4C4C4C',
    fontFamily: fonts.medium,
  },
  tankValue: {
    ...typography.body,
    color: '#111111',
    fontFamily: fonts.semibold,
  },
  tankMeta: {
    ...typography.caption,
    color: '#666666',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  historyItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    backgroundColor: '#FAFAFA',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    ...typography.caption,
    color: '#111111',
    fontFamily: fonts.semibold,
  },
  historyTime: {
    ...typography.caption,
    color: '#666666',
  },
  historyTotal: {
    ...typography.caption,
    color: '#202020',
    fontFamily: fonts.semibold,
  },
  historyTankLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  historyTankText: {
    ...typography.caption,
    color: '#555555',
  },
  emptyText: {
    ...typography.caption,
    color: '#646464',
  },
});
