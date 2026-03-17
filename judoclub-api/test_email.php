<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

$tournament = \App\Models\Tournament::first();
$participant = $tournament->participants()->first();

if ($participant) {
    $member = $participant->member;
    echo "Testing email to: " . $member->email . "\n";
    
    try {
        \Illuminate\Support\Facades\Mail::to($member->email)
            ->send(new \App\Mail\TournamentInvitation($tournament, $member));
        echo "✓ Email sent successfully!\n";
    } catch (Exception $e) {
        echo "✗ Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "No participants found\n";
}
