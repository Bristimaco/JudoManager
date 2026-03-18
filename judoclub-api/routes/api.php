<?php

use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\TournamentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Enums\Gender;
use App\Http\Controllers\Api\MemberImportExportController;
use App\Http\Controllers\Api\LookupImportExportController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => 'JudoClub API',
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/members/export', [MemberImportExportController::class, 'export']);
    Route::post('/members/import', [MemberImportExportController::class, 'import']);

    Route::get('/lookups/export', [LookupImportExportController::class, 'export']);
    Route::post('/lookups/import', [LookupImportExportController::class, 'import']);
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
    Route::post('/members/{member}/photo', [MemberController::class, 'uploadPhoto']);
    Route::delete('/members/{member}/photo', [MemberController::class, 'deletePhoto']);

    Route::apiResource('lookups', LookupController::class)->except(['show']);
    Route::get('/tournaments/active', [TournamentController::class, 'activeTournament']);
    Route::apiResource('tournaments', TournamentController::class);

    // Tournament eligible members
    Route::get('/tournaments/{tournament}/eligible-members', [TournamentController::class, 'eligibleMembers']);

    // Tournament invitation emails
    Route::post('/tournaments/{tournament}/send-invitations', [TournamentController::class, 'sendInvitations']);

    // Tournament participant management
    Route::delete('/tournaments/{tournament}/participants/{member}', [TournamentController::class, 'removeParticipant']);
    Route::post('/tournaments/{tournament}/participants/{member}/send-invitation', [TournamentController::class, 'sendInvitationToMember']);
    Route::post('/tournaments/{tournament}/participants/{member}/confirm-registration', [TournamentController::class, 'confirmRegistration']);
    Route::post('/tournaments/{tournament}/participants/{member}/unregister', [TournamentController::class, 'unregisterParticipant']);
    Route::post('/tournaments/{tournament}/participants/{member}/remove-from-registration-list', [TournamentController::class, 'removeFromRegistrationList']);
    Route::post('/tournaments/{tournament}/complete-registrations', [TournamentController::class, 'completeRegistrations']);
    Route::post('/tournaments/{tournament}/start', [TournamentController::class, 'startTournament']);
    Route::post('/tournaments/{tournament}/stop', [TournamentController::class, 'stopTournament']);
    Route::post('/tournaments/{tournament}/reset-phase', [TournamentController::class, 'resetPhase']);
    Route::post('/tournaments/{tournament}/participants', [TournamentController::class, 'addParticipant']);
    Route::get('/tournaments/{tournament}/available-members', [TournamentController::class, 'availableMembers']);

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

// Public invitation response endpoints (no authentication required)
Route::get('/invitations/accept', [TournamentController::class, 'acceptInvitation'])->name('invitations.accept');
Route::get('/invitations/decline', [TournamentController::class, 'declineInvitation'])->name('invitations.decline');