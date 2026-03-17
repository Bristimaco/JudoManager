<?php

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

use App\Models\Tournament;
use App\Models\TournamentParticipant;
use App\Http\Controllers\TournamentController;

$tournament = Tournament::first();
echo "Testing tournament: " . $tournament->name . "\n";

// Check current participants
echo "\nCurrent participants in database:\n";
$currentParticipants = TournamentParticipant::where('tournament_id', $tournament->id)
    ->with('member')
    ->get();

foreach ($currentParticipants as $p) {
    echo "  - " . $p->member->first_name . " " . $p->member->last_name . ": " . $p->status . "\n";
}

// Call eligibleMembers
echo "\nCalling eligibleMembers API...\n";
$controller = new TournamentController();
$response = $controller->eligibleMembers($tournament);
$data = json_decode($response->getContent(), true);

// Check API response
echo "\nAPI Response:\n";
foreach ($data['eligible_members'] as $member) {
    echo "  - " . $member['first_name'] . " " . $member['last_name'] . ": " . $member['participant_status'];
    if (isset($member['invited_at']) && $member['invited_at']) {
        echo " (invited: " . $member['invited_at'] . ")";
    }
    echo "\n";
}

// Check database after API call
echo "\nDatabase after API call:\n";
$afterParticipants = TournamentParticipant::where('tournament_id', $tournament->id)
    ->with('member')
    ->get();

foreach ($afterParticipants as $p) {
    echo "  - " . $p->member->first_name . " " . $p->member->last_name . ": " . $p->status;
    if ($p->invited_at) {
        echo " (invited: " . $p->invited_at . ")";
    }
    echo "\n";
}