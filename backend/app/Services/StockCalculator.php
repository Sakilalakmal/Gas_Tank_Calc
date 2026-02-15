<?php

namespace App\Services;

use InvalidArgumentException;

class StockCalculator
{
    public const string DEFAULT_UNIT = 'psi';
    public const int DEFAULT_FACTOR = 140;
    private const float EPSILON = 0.01;

    /**
     * @return array<string, float|int|string>
     */
    public function calculateFromPressures(
        float $p1,
        float $p2,
        float $p3,
        float $p4,
        ?int $factor = null,
        ?string $unit = null
    ): array {
        $factor = $factor ?? $this->getFactor();
        $unit = $unit ?? $this->getPressureUnit();
        $tankCapacityKg = $this->getTankCapacityKg();
        $totalCapacityKg = $this->getTotalCapacityKg();
        $maxTankPressurePsi = $this->getMaxTankPressurePsi();

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

            if ($pressure > $maxTankPressurePsi + self::EPSILON) {
                throw new InvalidArgumentException(sprintf(
                    'Pressure values must not exceed %.2f psi per tank.',
                    $maxTankPressurePsi
                ));
            }
        }

        $kg1 = round($p1 * $factor, 2, PHP_ROUND_HALF_UP);
        $kg2 = round($p2 * $factor, 2, PHP_ROUND_HALF_UP);
        $kg3 = round($p3 * $factor, 2, PHP_ROUND_HALF_UP);
        $kg4 = round($p4 * $factor, 2, PHP_ROUND_HALF_UP);
        $totalKg = round(($p1 + $p2 + $p3 + $p4) * $factor, 2, PHP_ROUND_HALF_UP);

        foreach ([$kg1, $kg2, $kg3, $kg4] as $kgValue) {
            if ($kgValue > $tankCapacityKg + self::EPSILON) {
                throw new InvalidArgumentException(sprintf(
                    'Calculated tank stock exceeds the %.2f kg per-tank capacity.',
                    $tankCapacityKg
                ));
            }
        }

        if ($totalKg > $totalCapacityKg + self::EPSILON) {
            throw new InvalidArgumentException(sprintf(
                'Calculated total stock exceeds the %.2f kg plant capacity.',
                $totalCapacityKg
            ));
        }

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

    /**
     * @return array<string, float|int|string>
     */
    public function getOperationalLimits(): array
    {
        return [
            'pressure_unit' => $this->getPressureUnit(),
            'pressure_to_kg_factor' => $this->getFactor(),
            'tank_count' => $this->getTankCount(),
            'tank_capacity_kg' => round($this->getTankCapacityKg(), 2, PHP_ROUND_HALF_UP),
            'total_capacity_kg' => round($this->getTotalCapacityKg(), 2, PHP_ROUND_HALF_UP),
            'max_tank_pressure_psi' => round($this->getMaxTankPressurePsi(), 2, PHP_ROUND_HALF_UP),
        ];
    }

    public function getPressureUnit(): string
    {
        return (string) config('lpg.pressure_unit', self::DEFAULT_UNIT);
    }

    public function getFactor(): int
    {
        $factor = (int) config('lpg.pressure_to_kg_factor', self::DEFAULT_FACTOR);

        if ($factor <= 0) {
            throw new InvalidArgumentException('Invalid LPG factor configuration.');
        }

        return $factor;
    }

    public function getTankCount(): int
    {
        $tankCount = (int) config('lpg.tank_count', 4);

        if ($tankCount <= 0) {
            throw new InvalidArgumentException('Invalid LPG tank count configuration.');
        }

        return $tankCount;
    }

    public function getTotalCapacityKg(): float
    {
        $totalCapacityKg = (float) config('lpg.total_capacity_kg', 48000);

        if ($totalCapacityKg <= 0) {
            throw new InvalidArgumentException('Invalid LPG total capacity configuration.');
        }

        return $totalCapacityKg;
    }

    public function getTankCapacityKg(): float
    {
        $tankCapacityKg = (float) config('lpg.tank_capacity_kg', 12000);

        if ($tankCapacityKg <= 0) {
            throw new InvalidArgumentException('Invalid LPG per-tank capacity configuration.');
        }

        return $tankCapacityKg;
    }

    public function getMaxTankPressurePsi(): float
    {
        $maxTankPressurePsi = (float) config('lpg.max_tank_pressure_psi', 85.71);

        if ($maxTankPressurePsi <= 0) {
            throw new InvalidArgumentException('Invalid LPG max pressure configuration.');
        }

        return $maxTankPressurePsi;
    }
}
