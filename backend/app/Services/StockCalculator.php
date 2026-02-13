<?php

namespace App\Services;

use InvalidArgumentException;

class StockCalculator
{
    public const string DEFAULT_UNIT = 'psi';
    public const int DEFAULT_FACTOR = 140;

    /**
     * @return array<string, float|int|string>
     */
    public function calculateFromPressures(
        float $p1,
        float $p2,
        float $p3,
        float $p4,
        int $factor = self::DEFAULT_FACTOR,
        string $unit = self::DEFAULT_UNIT
    ): array {
        if ($unit !== self::DEFAULT_UNIT) {
            throw new InvalidArgumentException('Unsupported pressure unit.');
        }

        if ($factor <= 0) {
            throw new InvalidArgumentException('Factor must be greater than zero.');
        }

        foreach ([$p1, $p2, $p3, $p4] as $pressure) {
            if ($pressure < 0) {
                throw new InvalidArgumentException('Pressure values cannot be negative.');
            }
        }

        $kg1 = round($p1 * $factor, 2, PHP_ROUND_HALF_UP);
        $kg2 = round($p2 * $factor, 2, PHP_ROUND_HALF_UP);
        $kg3 = round($p3 * $factor, 2, PHP_ROUND_HALF_UP);
        $kg4 = round($p4 * $factor, 2, PHP_ROUND_HALF_UP);
        $totalKg = round(($p1 + $p2 + $p3 + $p4) * $factor, 2, PHP_ROUND_HALF_UP);

        return [
            'pressure_unit' => $unit,
            'factor_used' => $factor,
            'kg1' => $kg1,
            'kg2' => $kg2,
            'kg3' => $kg3,
            'kg4' => $kg4,
            'total_kg' => $totalKg,
        ];
    }
}
