const DEFAULT_TOTAL_CAPACITY_KG = 48000;
const DEFAULT_TANK_COUNT = 4;
const DEFAULT_FACTOR = 140;

function readPositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const totalCapacityKg = readPositiveNumber(
  process.env.EXPO_PUBLIC_LPG_TOTAL_CAPACITY_KG,
  DEFAULT_TOTAL_CAPACITY_KG
);

const tankCount = DEFAULT_TANK_COUNT;

const pressureToKgFactor = readPositiveNumber(
  process.env.EXPO_PUBLIC_LPG_PRESSURE_TO_KG_FACTOR,
  DEFAULT_FACTOR
);

const perTankCapacityKg = totalCapacityKg / tankCount;

const derivedMaxPressurePsi = perTankCapacityKg / pressureToKgFactor;
const maxPressurePsi = readPositiveNumber(
  process.env.EXPO_PUBLIC_LPG_MAX_TANK_PRESSURE_PSI,
  derivedMaxPressurePsi
);

export const lpgConfig = {
  totalCapacityKg,
  tankCount,
  perTankCapacityKg,
  pressureToKgFactor,
  maxPressurePsi,
} as const;

export function isReadingWithinOperationalLimits(reading: {
  kg1: number;
  kg2: number;
  kg3: number;
  kg4: number;
  total_kg: number;
}): boolean {
  return (
    reading.kg1 <= lpgConfig.perTankCapacityKg &&
    reading.kg2 <= lpgConfig.perTankCapacityKg &&
    reading.kg3 <= lpgConfig.perTankCapacityKg &&
    reading.kg4 <= lpgConfig.perTankCapacityKg &&
    reading.total_kg <= lpgConfig.totalCapacityKg
  );
}
