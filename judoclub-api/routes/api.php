<?php

use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\LookupController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Enums\Gender;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => 'JudoClub API',
    ]);
});

Route::middleware('auth:sanctum')->get('/meta', function () {
    return response()->json([
        'genders' => [
            'values' => Gender::options(),
            'labels' => Gender::labels(),
        ],
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn(Request $request) => $request->user());

    Route::apiResource('members', MemberController::class);
    Route::apiResource('lookups', LookupController::class)->except(['show']);
});

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json(['message' => 'Invalid credentials'], 422);
    }
    $request->session()->regenerate();

    return response()->json(['message' => 'Logged in']);
});

Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['message' => 'Logged out']);
});