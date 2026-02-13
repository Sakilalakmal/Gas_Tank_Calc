<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StockReadingController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/readings', [StockReadingController::class, 'store']);
    Route::get('/readings/latest', [StockReadingController::class, 'latest']);
    Route::get('/readings', [StockReadingController::class, 'index']);
});
