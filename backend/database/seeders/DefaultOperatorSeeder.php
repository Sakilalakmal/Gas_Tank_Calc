<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DefaultOperatorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $username = (string) env('DEFAULT_OPERATOR_USERNAME', '');
        $epfNumber = (string) env('DEFAULT_OPERATOR_EPF', '');
        $designation = (string) env('DEFAULT_OPERATOR_DESIGNATION', '');
        $password = (string) env('DEFAULT_OPERATOR_PASSWORD', '');
        $role = (string) env('DEFAULT_OPERATOR_ROLE', 'operator');

        if ($username === '' || $epfNumber === '' || $designation === '' || $password === '') {
            throw new RuntimeException(
                'Missing default operator env values. Set DEFAULT_OPERATOR_USERNAME, DEFAULT_OPERATOR_EPF, DEFAULT_OPERATOR_DESIGNATION, and DEFAULT_OPERATOR_PASSWORD.'
            );
        }

        $existingUsers = User::query()->count();

        if ($existingUsers > 1) {
            throw new RuntimeException('Expected at most one user in users table for single-operator mode.');
        }

        $user = User::query()->first();

        if (! $user) {
            User::query()->create([
                'username' => $username,
                'epf_number' => $epfNumber,
                'designation' => $designation,
                'role' => $role,
                'password' => Hash::make($password),
            ]);

            return;
        }

        $user->update([
            'username' => $username,
            'epf_number' => $epfNumber,
            'designation' => $designation,
            'role' => $role,
            'password' => Hash::make($password),
        ]);
    }
}
