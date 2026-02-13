<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function login_success_returns_token(): void
    {
        $user = User::factory()->create([
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'designation' => 'LPG Operator',
            'role' => 'operator',
            'password' => Hash::make('secret-123'),
        ]);

        $response = $this->postJson('/api/login', [
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'password' => 'secret-123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'username', 'epf_number', 'designation', 'role'],
            ])
            ->assertJsonPath('user.id', $user->id);
    }

    #[Test]
    public function login_fail_returns_401(): void
    {
        User::factory()->create([
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'designation' => 'LPG Operator',
            'role' => 'operator',
            'password' => Hash::make('secret-123'),
        ]);

        $response = $this->postJson('/api/login', [
            'username' => 'operator1',
            'epf_number' => 'EPF1001',
            'password' => 'wrong-password',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Invalid credentials',
            ]);
    }
}
