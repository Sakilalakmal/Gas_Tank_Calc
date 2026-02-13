<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockReading extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by_user_id',
        'pressure_unit',
        'factor_used',
        'p1',
        'p2',
        'p3',
        'p4',
        'kg1',
        'kg2',
        'kg3',
        'kg4',
        'total_kg',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'factor_used' => 'integer',
            'p1' => 'decimal:2',
            'p2' => 'decimal:2',
            'p3' => 'decimal:2',
            'p4' => 'decimal:2',
            'kg1' => 'decimal:2',
            'kg2' => 'decimal:2',
            'kg3' => 'decimal:2',
            'kg4' => 'decimal:2',
            'total_kg' => 'decimal:2',
            'recorded_at' => 'datetime',
        ];
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
