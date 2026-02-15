<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockReadingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxTankPressurePsi = (float) config('lpg.max_tank_pressure_psi', 85.71);

        return [
            'p1' => ['required', 'numeric', 'min:0', 'max:'.$maxTankPressurePsi],
            'p2' => ['required', 'numeric', 'min:0', 'max:'.$maxTankPressurePsi],
            'p3' => ['required', 'numeric', 'min:0', 'max:'.$maxTankPressurePsi],
            'p4' => ['required', 'numeric', 'min:0', 'max:'.$maxTankPressurePsi],
            'pressure_unit' => ['prohibited'],
            'factor_used' => ['prohibited'],
            'factor' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'p1.required' => 'Pressure p1 is required.',
            'p2.required' => 'Pressure p2 is required.',
            'p3.required' => 'Pressure p3 is required.',
            'p4.required' => 'Pressure p4 is required.',
            'p1.numeric' => 'Pressure p1 must be numeric.',
            'p2.numeric' => 'Pressure p2 must be numeric.',
            'p3.numeric' => 'Pressure p3 must be numeric.',
            'p4.numeric' => 'Pressure p4 must be numeric.',
            'p1.min' => 'Pressure p1 cannot be negative.',
            'p2.min' => 'Pressure p2 cannot be negative.',
            'p3.min' => 'Pressure p3 cannot be negative.',
            'p4.min' => 'Pressure p4 cannot be negative.',
            'p1.max' => 'Pressure p1 exceeds the allowed operational limit.',
            'p2.max' => 'Pressure p2 exceeds the allowed operational limit.',
            'p3.max' => 'Pressure p3 exceeds the allowed operational limit.',
            'p4.max' => 'Pressure p4 exceeds the allowed operational limit.',
            'pressure_unit.prohibited' => 'pressure_unit is controlled by the server.',
            'factor_used.prohibited' => 'factor_used is controlled by the server.',
            'factor.prohibited' => 'factor is controlled by the server.',
        ];
    }
}
