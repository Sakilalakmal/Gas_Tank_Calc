<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/db-check', function () {
    try {
        DB::select('SELECT 1');

        return response()->json(['db' => 'ok']);
    } catch (Throwable $e) {
        return response()->json([
            'db' => 'fail',
            'error' => $e->getMessage(),
        ], 500);
    }
});
