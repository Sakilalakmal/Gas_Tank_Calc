<?php

$tankCount = 4;

$totalCapacityKg = (float) env('LPG_TOTAL_CAPACITY_KG', 48000);
$totalCapacityKg = $totalCapacityKg > 0 ? $totalCapacityKg : 48000;

$pressureToKgFactor = (int) env('LPG_PRESSURE_TO_KG_FACTOR', 140);
$pressureToKgFactor = $pressureToKgFactor > 0 ? $pressureToKgFactor : 140;

$tankCapacityKg = $totalCapacityKg / $tankCount;

$derivedMaxPressure = $tankCapacityKg / $pressureToKgFactor;
$maxTankPressurePsi = (float) env('LPG_MAX_TANK_PRESSURE_PSI', $derivedMaxPressure);
$maxTankPressurePsi = $maxTankPressurePsi > 0 ? $maxTankPressurePsi : $derivedMaxPressure;

return [
    'pressure_unit' => env('LPG_PRESSURE_UNIT', 'psi'),
    'tank_count' => $tankCount,
    'total_capacity_kg' => $totalCapacityKg,
    'tank_capacity_kg' => $tankCapacityKg,
    'pressure_to_kg_factor' => $pressureToKgFactor,
    'max_tank_pressure_psi' => $maxTankPressurePsi,
];
