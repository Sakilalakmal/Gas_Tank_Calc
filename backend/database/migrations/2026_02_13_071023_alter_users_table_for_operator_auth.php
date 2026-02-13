<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->unique();
            }

            if (! Schema::hasColumn('users', 'epf_number')) {
                $table->string('epf_number')->unique();
            }

            if (! Schema::hasColumn('users', 'designation')) {
                $table->string('designation');
            }

            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('operator');
            }
        });

        $columnsToDrop = array_filter([
            Schema::hasColumn('users', 'name') ? 'name' : null,
            Schema::hasColumn('users', 'email_verified_at') ? 'email_verified_at' : null,
            Schema::hasColumn('users', 'email') ? 'email' : null,
            Schema::hasColumn('users', 'remember_token') ? 'remember_token' : null,
        ]);

        if ($columnsToDrop !== []) {
            Schema::table('users', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'name')) {
                $table->string('name');
            }

            if (! Schema::hasColumn('users', 'email')) {
                $table->string('email')->unique();
            }

            if (! Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable();
            }

            if (! Schema::hasColumn('users', 'remember_token')) {
                $table->rememberToken();
            }
        });

        $columnsToDrop = array_filter([
            Schema::hasColumn('users', 'username') ? 'username' : null,
            Schema::hasColumn('users', 'epf_number') ? 'epf_number' : null,
            Schema::hasColumn('users', 'designation') ? 'designation' : null,
            Schema::hasColumn('users', 'role') ? 'role' : null,
        ]);

        if ($columnsToDrop !== []) {
            Schema::table('users', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }
};
