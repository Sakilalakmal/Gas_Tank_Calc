<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockReadingRequest;
use App\Http\Resources\StockReadingResource;
use App\Models\StockReading;
use App\Services\StockCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class StockReadingController extends Controller
{
    public function store(StoreStockReadingRequest $request, StockCalculator $calculator): StockReadingResource|JsonResponse
    {
        $validated = $request->validated();

        try {
            $computed = $calculator->calculateFromPressures(
                (float) $validated['p1'],
                (float) $validated['p2'],
                (float) $validated['p3'],
                (float) $validated['p4'],
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $reading = StockReading::query()->create([
            'created_by_user_id' => $request->user()->id,
            'p1' => $validated['p1'],
            'p2' => $validated['p2'],
            'p3' => $validated['p3'],
            'p4' => $validated['p4'],
            'pressure_unit' => $computed['pressure_unit'],
            'factor_used' => $computed['factor_used'],
            'kg1' => $computed['kg1'],
            'kg2' => $computed['kg2'],
            'kg3' => $computed['kg3'],
            'kg4' => $computed['kg4'],
            'total_kg' => $computed['total_kg'],
            'recorded_at' => now(),
        ]);

        return (new StockReadingResource($reading))
            ->response()
            ->setStatusCode(201);
    }

    public function latest(StockCalculator $calculator): StockReadingResource|JsonResponse
    {
        $limits = $calculator->getOperationalLimits();
        $tankCapacityKg = (float) $limits['tank_capacity_kg'];
        $totalCapacityKg = (float) $limits['total_capacity_kg'];

        $latest = StockReading::query()
            ->where('kg1', '<=', $tankCapacityKg)
            ->where('kg2', '<=', $tankCapacityKg)
            ->where('kg3', '<=', $tankCapacityKg)
            ->where('kg4', '<=', $tankCapacityKg)
            ->where('total_kg', '<=', $totalCapacityKg)
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->first();

        if (! $latest) {
            return response()->json([
                'message' => 'No valid readings yet',
            ], 404);
        }

        return new StockReadingResource($latest);
    }

    public function index(Request $request, StockCalculator $calculator)
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'include_invalid' => ['nullable', 'boolean'],
        ]);

        $limit = (int) ($validated['limit'] ?? 20);
        $includeInvalid = (bool) ($validated['include_invalid'] ?? false);

        $query = StockReading::query()
            ->orderByDesc('recorded_at')
            ->orderByDesc('id');

        if (! $includeInvalid) {
            $limits = $calculator->getOperationalLimits();
            $tankCapacityKg = (float) $limits['tank_capacity_kg'];
            $totalCapacityKg = (float) $limits['total_capacity_kg'];

            $query
                ->where('kg1', '<=', $tankCapacityKg)
                ->where('kg2', '<=', $tankCapacityKg)
                ->where('kg3', '<=', $tankCapacityKg)
                ->where('kg4', '<=', $tankCapacityKg)
                ->where('total_kg', '<=', $totalCapacityKg);
        }

        $readings = $query
            ->limit($limit)
            ->get();

        return StockReadingResource::collection($readings);
    }
}
