<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StockReadingApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function cannot_post_reading_without_token(): void
    {
        $response = $this->postJson('/api/readings', [
            'p1' => 10,
            'p2' => 10,
            'p3' => 10,
            'p4' => 10,
        ]);

        $response->assertUnauthorized();
    }

    #[Test]
    public function can_post_reading_with_token_and_get_correct_total_kg(): void
    {
        $user = User::factory()->create([
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'designation' => 'LPG Operator',
            'role' => 'operator',
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/readings', [
            'p1' => 10,
            'p2' => 10,
            'p3' => 10,
            'p4' => 10,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.total_kg', 5600)
            ->assertJsonPath('data.factor_used', 140)
            ->assertJsonPath('data.pressure_unit', 'psi');

        $this->assertDatabaseHas('stock_readings', [
            'created_by_user_id' => $user->id,
            'factor_used' => 140,
            'pressure_unit' => 'psi',
            'total_kg' => 5600.00,
        ]);
    }
}
