<?php

use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\TournamentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Enums\Gender;
use App\Http\Controllers\Api\MemberImportExportController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => 'JudoClub API',
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/members/export', [MemberImportExportController::class, 'export']);
    Route::post('/members/import', [MemberImportExportController::class, 'import']);
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
    Route::apiResource('tournaments', TournamentController::class);

    // Age category bulk update
    Route::post('/members/update-age-categories', function (Request $request) {
        $request->validate([
            'dry_run' => ['sometimes', 'boolean'],
            'year' => ['sometimes', 'integer', 'min:1900', 'max:2100'],
        ]);

        $dryRun = $request->boolean('dry_run', false);
        $year = $request->input('year', date('Y'));

        try {
            // Run the Artisan command and capture output
            $command = 'members:update-age-categories';
            if ($dryRun) {
                $command .= ' --dry-run';
            }
            if ($request->has('year')) {
                $command .= " --year={$year}";
            }

            \Illuminate\Support\Facades\Artisan::call($command);
            $output = \Illuminate\Support\Facades\Artisan::output();

            // Parse the output to extract summary information
            $lines = explode("\n", $output);
            $summary = [];
            $changes = [];

            $capturing = false;
            foreach ($lines as $line) {
                if (strpos($line, 'Samenvatting') !== false) {
                    $capturing = true;
                    continue;
                }
                if ($capturing && trim($line)) {
                    if (strpos($line, ':') !== false) {
                        $summary[] = trim($line);
                    }
                }
                // Capture individual member changes
                if (preg_match('/^(.+?) \(geboren \d+, wordt \d+ op .+?\): (.+?) → (.+?)$/', trim($line), $matches)) {
                    $changes[] = [
                        'member' => $matches[1],
                        'from' => $matches[2] === '(geen)' ? null : $matches[2],
                        'to' => $matches[3],
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'dry_run' => $dryRun,
                'year' => $year,
                'summary' => $summary,
                'changes' => $changes,
                'full_output' => $output,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Er is een fout opgetreden: ' . $e->getMessage(),
            ], 500);
        }
    });
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