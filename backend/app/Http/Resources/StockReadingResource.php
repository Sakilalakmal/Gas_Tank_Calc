<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockReadingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created_by_user_id' => $this->created_by_user_id,
            'pressure_unit' => $this->pressure_unit,
            'factor_used' => (int) $this->factor_used,
            'p1' => (float) $this->p1,
            'p2' => (float) $this->p2,
            'p3' => (float) $this->p3,
            'p4' => (float) $this->p4,
            'kg1' => (float) $this->kg1,
            'kg2' => (float) $this->kg2,
            'kg3' => (float) $this->kg3,
            'kg4' => (float) $this->kg4,
            'total_kg' => (float) $this->total_kg,
            'recorded_at' => optional($this->recorded_at)->toISOString(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
