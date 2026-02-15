import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { isReadingWithinOperationalLimits, lpgConfig } from '../config/lpg';
import {
  apiClient,
  CreateReadingRequest,
  ReadingRecord,
} from '../services/api/apiClient';
import { colors, fonts, spacing, typography } from '../theme';

type AppStackParamList = {
  Home: undefined;
  GasStock: undefined;
};

type GasStockScreenProps = NativeStackScreenProps<AppStackParamList, 'GasStock'>;

type PressureField = 'p1' | 'p2' | 'p3' | 'p4';
type InputMode = 'kg' | 'psi';

type FlowState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; retryable: boolean };

type FieldErrors = Partial<Record<PressureField, string>>;

const fieldOrder: PressureField[] = ['p1', 'p2', 'p3', 'p4'];

const fieldLabels: Record<PressureField, string> = {
  p1: 'Tank 1',
  p2: 'Tank 2',
  p3: 'Tank 3',
  p4: 'Tank 4',
};

function formatKg(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(2);
}

function formatLastUpdated(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) {
    return '-';
  }

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

function extractServerMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  if ('message' in data && typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

  if ('errors' in data && typeof data.errors === 'object' && data.errors !== null) {
    const errors = Object.values(data.errors as Record<string, unknown>);
    const firstErrorSet = errors.find((item) => Array.isArray(item) && item.length > 0);
    if (Array.isArray(firstErrorSet) && typeof firstErrorSet[0] === 'string') {
      return firstErrorSet[0];
    }
  }

  return null;
}

function normalizeRequestError(error: unknown): { message: string; retryable: boolean } {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return {
        message: 'Session expired. Please sign in again.',
        retryable: false,
      };
    }

    if (!error.response) {
      return {
        message: 'Cannot reach the server. Please check your network and retry.',
        retryable: true,
      };
    }

    if (error.response.status === 422) {
      return {
        message: extractServerMessage(error.response.data) ?? 'Please check the pressure values.',
        retryable: false,
      };
    }

    if (error.response.status >= 500) {
      return {
        message: 'Server error while calculating stock. Please try again.',
        retryable: true,
      };
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      message: error.message,
      retryable: true,
    };
  }

  return {
    message: 'Unable to calculate stock right now. Please try again.',
    retryable: true,
  };
}

export function GasStockScreen({ navigation }: GasStockScreenProps) {
  const { signOut } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('kg');
  const [inputs, setInputs] = useState<Record<PressureField, string>>({
    p1: '',
    p2: '',
    p3: '',
    p4: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [flowState, setFlowState] = useState<FlowState>({ status: 'idle' });
  const [lastReading, setLastReading] = useState<ReadingRecord | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

  const p1Ref = useRef<TextInput>(null);
  const p2Ref = useRef<TextInput>(null);
  const p3Ref = useRef<TextInput>(null);
  const p4Ref = useRef<TextInput>(null);

  const inputRefs: Record<PressureField, React.RefObject<TextInput | null>> = {
    p1: p1Ref,
    p2: p2Ref,
    p3: p3Ref,
    p4: p4Ref,
  };

  useEffect(() => {
    let isMounted = true;

    const loadLatestReading = async () => {
      setIsBootstrapping(true);

      try {
        const reading = await apiClient.getLatestReading();
        if (isMounted) {
          setLastReading(
            reading && isReadingWithinOperationalLimits(reading) ? reading : null
          );
        }
      } catch {
        // Best effort. User can still calculate a new reading.
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadLatestReading();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalKg = lastReading?.total_kg;
  const lastUpdatedLabel = formatLastUpdated(lastReading?.recorded_at);

  const tankProgress = useMemo(
    () =>
      fieldOrder.map((field, index) => {
        const key = `kg${index + 1}` as 'kg1' | 'kg2' | 'kg3' | 'kg4';
        const value = lastReading?.[key];
        const total = lastReading?.total_kg ?? 0;
        const ratio = typeof value === 'number' && total > 0 ? (value / total) * 100 : 0;
        const widthPercent = ratio > 0 ? Math.max(8, Math.min(100, ratio)) : 0;

        return {
          field,
          label: fieldLabels[field],
          value: typeof value === 'number' ? value : undefined,
          widthPercent,
        };
      }),
    [lastReading]
  );

  const statusText = useMemo(() => {
    if (flowState.status === 'success' || flowState.status === 'error') {
      return flowState.message;
    }

    if (isBootstrapping) {
      return 'Loading...';
    }

    if (!lastReading) {
      if (inputMode === 'kg') {
        return `Input kg (max ${lpgConfig.perTankCapacityKg.toFixed(0)} / tank)`;
      }

      return `Input psi (max ${lpgConfig.maxPressurePsi.toFixed(2)} / tank)`;
    }

    return lastUpdatedLabel;
  }, [flowState, inputMode, isBootstrapping, lastReading, lastUpdatedLabel]);

  const validateAndBuildPayload = (): {
    payload: CreateReadingRequest;
    projectedTotalKg: number;
  } | null => {
    const nextErrors: FieldErrors = {};
    const parsedValues: Partial<Record<PressureField, number>> = {};

    for (const field of fieldOrder) {
      const rawValue = inputs[field].trim();

      if (!rawValue) {
        nextErrors[field] = 'Required';
        continue;
      }

      const normalized = rawValue.replace(',', '.');
      const parsed = Number(normalized);

      if (!Number.isFinite(parsed)) {
        nextErrors[field] = 'Enter a valid number';
        continue;
      }

      if (parsed < 0) {
        nextErrors[field] = 'Cannot be negative';
        continue;
      }

      if (inputMode === 'kg') {
        if (parsed > lpgConfig.perTankCapacityKg) {
          nextErrors[field] = `Max ${lpgConfig.perTankCapacityKg.toFixed(0)} kg`;
          continue;
        }
      } else {
        if (parsed > lpgConfig.maxPressurePsi) {
          if (parsed <= lpgConfig.perTankCapacityKg) {
            nextErrors[field] = 'Looks like KG value. Switch to KG mode.';
          } else {
            nextErrors[field] = `Max ${lpgConfig.maxPressurePsi.toFixed(2)} psi`;
          }
          continue;
        }
      }

      parsedValues[field] = parsed;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    if (inputMode === 'kg') {
      const kg1 = parsedValues.p1 as number;
      const kg2 = parsedValues.p2 as number;
      const kg3 = parsedValues.p3 as number;
      const kg4 = parsedValues.p4 as number;
      const projectedTotalKg = kg1 + kg2 + kg3 + kg4;

      return {
        payload: {
          p1: kg1 / lpgConfig.pressureToKgFactor,
          p2: kg2 / lpgConfig.pressureToKgFactor,
          p3: kg3 / lpgConfig.pressureToKgFactor,
          p4: kg4 / lpgConfig.pressureToKgFactor,
        },
        projectedTotalKg,
      };
    }

    const psiPayload = {
      p1: parsedValues.p1 as number,
      p2: parsedValues.p2 as number,
      p3: parsedValues.p3 as number,
      p4: parsedValues.p4 as number,
    };
    const projectedTotalKg =
      (psiPayload.p1 + psiPayload.p2 + psiPayload.p3 + psiPayload.p4) * lpgConfig.pressureToKgFactor;

    return {
      payload: psiPayload,
      projectedTotalKg,
    };
  };

  const onCalculate = async () => {
    if (flowState.status === 'loading') {
      return;
    }

    const validated = validateAndBuildPayload();
    if (!validated) {
      setFlowState({
        status: 'error',
        message: 'Check highlighted values or switch input mode.',
        retryable: false,
      });
      return;
    }

    if (validated.projectedTotalKg > lpgConfig.totalCapacityKg) {
      setFlowState({
        status: 'error',
        message: `Projected total exceeds ${lpgConfig.totalCapacityKg.toFixed(2)} kg plant capacity.`,
        retryable: false,
      });
      return;
    }

    Keyboard.dismiss();
    setFlowState({ status: 'loading' });

    try {
      const reading = await apiClient.createReading(validated.payload);
      setLastReading(reading);
      setFlowState({
        status: 'success',
        message: 'Stock calculated and saved.',
      });
    } catch (error) {
      const normalized = normalizeRequestError(error);
      setFlowState({
        status: 'error',
        message: normalized.message,
        retryable: normalized.retryable,
      });
    }
  };

  const onPressureChange = (field: PressureField, value: string) => {
    setInputs((previous) => ({ ...previous, [field]: value }));

    if (fieldErrors[field]) {
      setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    }

    if (flowState.status === 'error') {
      setFlowState({ status: 'idle' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.badge}>GAS STOCK</Text>
                <Text style={styles.pageTitle}>Gas Stock Calculator</Text>
                <Text style={styles.pageCaption}>
                  {inputMode.toUpperCase()} mode
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={styles.headerActionButton}
                  onPress={() => {
                    navigation.navigate('Home');
                  }}
                >
                  <Text style={styles.headerActionText}>Home</Text>
                </Pressable>
                <Pressable
                  style={styles.headerActionButton}
                  onPress={() => {
                    void signOut();
                  }}
                >
                  <Text style={styles.headerActionText}>Logout</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Verified Total</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalValue}>{formatKg(totalKg)}</Text>
                <Text style={styles.totalUnit}>kg</Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  flowState.status === 'error' ? styles.statusTextError : null,
                  flowState.status === 'success' ? styles.statusTextSuccess : null,
                ]}
              >
                {statusText}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Tank {lpgConfig.perTankCapacityKg.toFixed(0)} kg
                </Text>
                <Text style={styles.metaText}>
                  Plant {lpgConfig.totalCapacityKg.toFixed(0)} kg
                </Text>
              </View>
              {flowState.status === 'error' && flowState.retryable ? (
                <Pressable
                  onPress={() => {
                    void onCalculate();
                  }}
                >
                  <Text style={styles.retryText}>Retry calculation</Text>
                </Pressable>
              ) : null}
            </View>

            {lastReading ? (
              <View style={styles.tankSummaryCard}>
                <Text style={styles.sectionTitle}>Per Tank KG</Text>
                {tankProgress.map((tank) => (
                  <View key={tank.field} style={styles.tankSummaryRow}>
                    <View style={styles.tankSummaryHeader}>
                      <Text style={styles.tankLabel}>{tank.label}</Text>
                      <Text style={styles.tankValue}>{formatKg(tank.value)} kg</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${tank.widthPercent}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.inputsCard}>
              <View style={styles.modeHeader}>
                <Text style={styles.sectionTitle}>
                  {inputMode === 'kg' ? 'Tank Input' : 'Tank Input'}
                </Text>
                <View style={styles.modeSwitch}>
                  <Pressable
                    style={[
                      styles.modeButton,
                      inputMode === 'kg' ? styles.modeButtonActive : null,
                    ]}
                    onPress={() => {
                      setInputMode('kg');
                      setFieldErrors({});
                      if (flowState.status !== 'loading') {
                        setFlowState({ status: 'idle' });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        inputMode === 'kg' ? styles.modeButtonTextActive : null,
                      ]}
                    >
                      KG
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modeButton,
                      inputMode === 'psi' ? styles.modeButtonActive : null,
                    ]}
                    onPress={() => {
                      setInputMode('psi');
                      setFieldErrors({});
                      if (flowState.status !== 'loading') {
                        setFlowState({ status: 'idle' });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        inputMode === 'psi' ? styles.modeButtonTextActive : null,
                      ]}
                    >
                      PSI
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.modeHelpText}>
                {inputMode === 'kg'
                  ? `Max ${lpgConfig.perTankCapacityKg.toFixed(0)} kg per tank`
                  : `Max ${lpgConfig.maxPressurePsi.toFixed(2)} psi per tank`}
              </Text>
              {fieldOrder.map((field, index) => {
                const isLast = index === fieldOrder.length - 1;
                const nextField = fieldOrder[index + 1];
                const fieldError = fieldErrors[field];

                return (
                  <View key={field} style={styles.inputRow}>
                    <Text style={styles.inputLabel}>{fieldLabels[field]}</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        fieldError ? styles.inputContainerError : null,
                      ]}
                    >
                      <TextInput
                        ref={inputRefs[field]}
                        style={styles.input}
                        value={inputs[field]}
                        editable={flowState.status !== 'loading'}
                        onChangeText={(value) => {
                          onPressureChange(field, value);
                        }}
                        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                        inputMode="decimal"
                        placeholder="0"
                        placeholderTextColor="#9B9B9B"
                        returnKeyType={isLast ? 'done' : 'next'}
                        blurOnSubmit={isLast}
                        onSubmitEditing={() => {
                          if (isLast) {
                            void onCalculate();
                            return;
                          }

                          if (nextField) {
                            inputRefs[nextField].current?.focus();
                          }
                        }}
                      />
                      <Text style={styles.unitText}>{inputMode === 'kg' ? 'kg' : 'psi'}</Text>
                    </View>
                    {fieldError ? <Text style={styles.fieldErrorText}>{fieldError}</Text> : null}
                  </View>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.calculateButton,
                flowState.status === 'loading' ? styles.calculateButtonDisabled : null,
              ]}
              onPress={() => {
                void onCalculate();
              }}
              disabled={flowState.status === 'loading'}
            >
              {flowState.status === 'loading' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.calculateButtonText}>Calculate Stock</Text>
              )}
            </Pressable>

            {flowState.status === 'success' ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.secondaryButtonText}>View Daily History</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECECEC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  headerTextBlock: {
    flex: 1,
    gap: 2,
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
  pageTitle: {
    ...typography.sectionTitle,
    fontFamily: fonts.bold,
    color: '#111111',
  },
  pageCaption: {
    ...typography.caption,
    color: '#666666',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#C9C9C9',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
  },
  headerActionText: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: '#222222',
  },
  totalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  totalLabel: {
    ...typography.body,
    fontFamily: fonts.medium,
    color: '#222222',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  totalValue: {
    ...typography.title,
    fontFamily: fonts.bold,
    fontSize: 42,
    lineHeight: 46,
    color: '#111111',
  },
  totalUnit: {
    ...typography.body,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 24,
    color: '#444444',
    marginBottom: 4,
  },
  statusText: {
    ...typography.caption,
    color: '#676767',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.caption,
    color: '#4E4E4E',
    fontFamily: fonts.medium,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusTextSuccess: {
    color: '#15703A',
  },
  statusTextError: {
    color: colors.fail,
  },
  retryText: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  tankSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: '#181818',
  },
  tankSummaryRow: {
    gap: spacing.xs,
  },
  tankSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tankLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: '#2A2A2A',
  },
  tankValue: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: '#111111',
  },
  track: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E7E7E7',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#161616',
  },
  inputsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D1D1',
    overflow: 'hidden',
  },
  modeButton: {
    minHeight: 30,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
    paddingHorizontal: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: '#111111',
  },
  modeButtonText: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: '#333333',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  modeHelpText: {
    ...typography.caption,
    color: '#5F5F5F',
  },
  inputRow: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: '#2B2B2B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D1D1',
    backgroundColor: '#F7F7F7',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  inputContainerError: {
    borderColor: colors.fail,
  },
  input: {
    ...typography.body,
    fontFamily: fonts.regular,
    flex: 1,
    color: '#111111',
    paddingVertical: spacing.sm,
  },
  unitText: {
    ...typography.body,
    fontFamily: fonts.medium,
    color: '#505050',
  },
  fieldErrorText: {
    ...typography.caption,
    color: colors.fail,
  },
  calculateButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  calculateButtonDisabled: {
    opacity: 0.7,
  },
  calculateButtonText: {
    ...typography.button,
    fontFamily: fonts.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    ...typography.button,
    fontFamily: fonts.semibold,
    color: '#111111',
  },
});
