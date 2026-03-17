<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

$tournament = \App\Models\Tournament::first();
$member = \App\Models\Member::first();

echo "Tournament: " . $tournament->name . " (ID: " . $tournament->id . ")\n";
echo "Member: " . $member->first_name . " " . $member->last_name . " (ID: " . $member->id . ")\n";

$controller = new \App\Http\Controllers\TournamentController();
$response = $controller->removeParticipant($tournament, $member);
$data = json_decode($response->getContent(), true);

echo "\nResponse:\n";
print_r($data);
