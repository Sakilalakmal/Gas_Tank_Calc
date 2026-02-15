<?php

namespace Tests\Feature;

use App\Models\StockReading;
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

    #[Test]
    public function cannot_post_reading_above_operational_pressure_limit(): void
    {
        $user = User::factory()->create([
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'designation' => 'LPG Operator',
            'role' => 'operator',
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/readings', [
            'p1' => 200,
            'p2' => 10,
            'p3' => 10,
            'p4' => 10,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('errors.p1.0', 'Pressure p1 exceeds the allowed operational limit.');
    }

    #[Test]
    public function index_endpoint_excludes_invalid_readings_by_default(): void
    {
        $user = User::factory()->create([
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'designation' => 'LPG Operator',
            'role' => 'operator',
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        StockReading::query()->create([
            'created_by_user_id' => $user->id,
            'pressure_unit' => 'psi',
            'factor_used' => 140,
            'p1' => 10,
            'p2' => 10,
            'p3' => 10,
            'p4' => 10,
            'kg1' => 1400,
            'kg2' => 1400,
            'kg3' => 1400,
            'kg4' => 1400,
            'total_kg' => 5600,
            'recorded_at' => now()->subMinute(),
        ]);

        StockReading::query()->create([
            'created_by_user_id' => $user->id,
            'pressure_unit' => 'psi',
            'factor_used' => 140,
            'p1' => 1000,
            'p2' => 1000,
            'p3' => 1000,
            'p4' => 1000,
            'kg1' => 140000,
            'kg2' => 140000,
            'kg3' => 140000,
            'kg4' => 140000,
            'total_kg' => 560000,
            'recorded_at' => now(),
        ]);

        $defaultResponse = $this->withToken($token)->getJson('/api/readings?limit=20');
        $defaultResponse
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.total_kg', 5600);

        $withInvalidResponse = $this->withToken($token)->getJson('/api/readings?limit=20&include_invalid=1');
        $withInvalidResponse
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
