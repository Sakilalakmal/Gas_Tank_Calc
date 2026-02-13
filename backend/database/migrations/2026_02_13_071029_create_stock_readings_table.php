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
        Schema::create('stock_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('pressure_unit')->default('psi');
            $table->unsignedInteger('factor_used')->default(140);
            $table->decimal('p1', 10, 2)->unsigned();
            $table->decimal('p2', 10, 2)->unsigned();
            $table->decimal('p3', 10, 2)->unsigned();
            $table->decimal('p4', 10, 2)->unsigned();
            $table->decimal('kg1', 12, 2)->unsigned();
            $table->decimal('kg2', 12, 2)->unsigned();
            $table->decimal('kg3', 12, 2)->unsigned();
            $table->decimal('kg4', 12, 2)->unsigned();
            $table->decimal('total_kg', 12, 2)->unsigned();
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->index('recorded_at');
            $table->index('created_by_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_readings');
    }
};
