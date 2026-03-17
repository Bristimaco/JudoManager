<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Member;
use App\Models\Lookup;
use App\Models\TournamentParticipant;
use App\Mail\TournamentInvitation;
use App\Mail\TournamentCancellation;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class TournamentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Tournament::query();

        // Filter op actief/inactief
        if ($request->has('active')) {
            $active = $request->boolean('active');
            $query->where('active', $active);
        }

        // Filter op status (komend/voorbij)
        if ($request->has('status')) {
            if ($request->status === 'upcoming') {
                $query->upcoming();
            } elseif ($request->status === 'past') {
                $query->past();
            }
        }

        // Zoeken op naam
        if ($request->filled('q')) {
            $query->where('name', 'like', '%' . $request->q . '%');
        }

        // Filter op leeftijdscategorieën
        if ($request->filled('age_category_ids')) {
            $categoryIds = explode(',', $request->age_category_ids);
            $categoryIds = array_map('trim', $categoryIds);
            $categoryIds = array_filter($categoryIds, 'is_numeric');

            if (!empty($categoryIds)) {
                $query->whereHas('ageCategories', function ($q) use ($categoryIds) {
                    $q->whereIn('lookups.id', $categoryIds);
                });
            }
        }

        // Sorteer op datum (nieuwste eerst)
        $query->orderBy('date', 'desc');

        // Eager load age categories
        $query->with('ageCategories');

        // Paginatie
        $tournaments = $query->paginate($request->get('per_page', 15));

        return response()->json($tournaments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'flyer' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // max 5MB
            'date' => 'required|date|after_or_equal:today',
            'age_category_ids' => 'required|array|min:1',
            'age_category_ids.*' => 'required|exists:lookups,id',
            'description' => 'nullable|string',
            'active' => 'boolean',
        ]);

        // Handle flyer upload
        $flyerPath = null;
        if ($request->hasFile('flyer')) {
            $flyerPath = $request->file('flyer')->store('tournament-flyers', 'public');
        }

        // Maak tournament zonder age_category_ids en flyer file
        $tournamentData = collect($validated)->except(['age_category_ids', 'flyer'])->toArray();
        if ($flyerPath) {
            $tournamentData['flyer'] = $flyerPath;
        }
        $tournament = Tournament::create($tournamentData);

        // Koppel de age categories via pivot table
        $tournament->ageCategories()->attach($validated['age_category_ids']);

        // Laad de age categories voor de response
        $tournament->load('ageCategories');

        return response()->json($tournament, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Tournament $tournament)
    {
        $tournament->load('ageCategories');
        return response()->json($tournament);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'flyer' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // max 5MB
            'date' => 'required|date',
            'age_category_ids' => 'required|array|min:1',
            'age_category_ids.*' => 'required|exists:lookups,id',
            'description' => 'nullable|string',
            'active' => 'boolean',
        ]);

        // Handle flyer upload
        $flyerPath = $tournament->flyer; // behoud huidige flyer
        if ($request->hasFile('flyer')) {
            // Verwijder oude flyer als er een nieuwe wordt geüpload
            if ($tournament->flyer && \Storage::disk('public')->exists($tournament->flyer)) {
                \Storage::disk('public')->delete($tournament->flyer);
            }
            $flyerPath = $request->file('flyer')->store('tournament-flyers', 'public');
        }

        // Update tournament zonder age_category_ids en flyer file
        $tournamentData = collect($validated)->except(['age_category_ids', 'flyer'])->toArray();
        $tournamentData['flyer'] = $flyerPath;
        $tournament->update($tournamentData);

        // Sync de age categories via pivot table
        $tournament->ageCategories()->sync($validated['age_category_ids']);

        // Laad de age categories voor de response
        $tournament->load('ageCategories');

        return response()->json($tournament);
    }

    /**
     * Get eligible members for a tournament based on age categories on tournament date.
     * Saves eligible members as participants and returns them.
     */
    public function eligibleMembers(Tournament $tournament)
    {
        $tournament->load('ageCategories');

        if ($tournament->ageCategories->isEmpty()) {
            return response()->json(['message' => 'Geen leeftijdscategorieën gekonfigureerd voor dit toernooi.'], 400);
        }

        $tournamentDate = Carbon::parse($tournament->date);
        $tournamentYear = $tournamentDate->year;

        // Haal bestaande participants op voor dit toernooi (met member data)
        $participants = TournamentParticipant::with('member')
            ->where('tournament_id', $tournament->id)
            ->get();

        $eligibleMembers = [];
        foreach ($participants as $participant) {
            $member = $participant->member;
            if (!$member->birthdate)
                continue;

            $birthYear = Carbon::parse($member->birthdate)->year;
            $ageOnTournamentYear = $tournamentYear - $birthYear;
            $memberAgeCategory = $this->determineAgeCategory($ageOnTournamentYear);

            $memberData = $member->toArray();
            $memberData['age_on_tournament'] = $ageOnTournamentYear;
            $memberData['calculated_age_category'] = $memberAgeCategory->label ?? '';
            $memberData['participant_status'] = $participant->status;
            $memberData['invited_at'] = $participant->invited_at;
            $eligibleMembers[] = $memberData;
        }

        // Sorteer op achternaam, dan voornaam
        usort($eligibleMembers, function ($a, $b) {
            $lastNameComparison = strcmp($a['last_name'], $b['last_name']);
            if ($lastNameComparison === 0) {
                return strcmp($a['first_name'], $b['first_name']);
            }
            return $lastNameComparison;
        });

        return response()->json([
            'tournament' => $tournament,
            'eligible_members' => $eligibleMembers,
            'total_eligible' => count($eligibleMembers)
        ]);
    }

    /**
     * Bepaal age category op basis van leeftijd
     */
    private function determineAgeCategory($age)
    {
        $ageCategories = Lookup::where('type', 'age_categories')
            ->where('active', true)
            ->orderBy('min_age', 'asc')
            ->get();

        $matchingCategory = null;
        foreach ($ageCategories as $category) {
            if ($age >= $category->min_age) {
                $matchingCategory = $category;
            } else {
                break;
            }
        }

        return $matchingCategory;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Tournament $tournament)
    {
        // Verwijder de flyer file als deze bestaat
        if ($tournament->flyer && Storage::disk('public')->exists($tournament->flyer)) {
            Storage::disk('public')->delete($tournament->flyer);
        }

        $tournament->delete();

        return response()->json(['message' => 'Tournament deleted successfully']);
    }

    /**
     * Send invitation emails to tournament participants
     */
    public function sendInvitations(Tournament $tournament)
    {
        // Get all eligible participants who haven't been invited yet
        $participants = TournamentParticipant::where('tournament_id', $tournament->id)
            ->where('status', 'eligible')
            ->with('member')
            ->get();

        $invitedCount = 0;
        $errors = [];

        foreach ($participants as $participant) {
            $member = $participant->member;

            // Check if member has email
            if (!$member->email) {
                $errors[] = "Geen email adres voor {$member->first_name} {$member->last_name}";
                continue;
            }

            try {
                // Send email
                Mail::to($member->email)->send(new TournamentInvitation($tournament, $member));

                // Update participant status
                $participant->update([
                    'status' => 'invited',
                    'invited_at' => now()
                ]);

                $invitedCount++;
            } catch (\Exception $e) {
                $errors[] = "Email verzenden mislukt voor {$member->first_name} {$member->last_name}: {$e->getMessage()}";
            }
        }

        return response()->json([
            'message' => "Uitnodigingen verzonden naar {$invitedCount} deelnemers",
            'invited_count' => $invitedCount,
            'errors' => $errors
        ]);
    }

    /**
     * Remove a participant from a tournament
     * Sends cancellation email if participant was invited
     */
    public function removeParticipant(Tournament $tournament, Member $member)
    {
        // Find the participant
        $participant = TournamentParticipant::where('tournament_id', $tournament->id)
            ->where('member_id', $member->id)
            ->first();

        if (!$participant) {
            return response()->json([
                'message' => 'Deelnemer niet gevonden voor dit toernooi'
            ], 404);
        }

        $wasInvited = $participant->status === 'invited';
        $memberName = "{$member->first_name} {$member->last_name}";

        // If participant was invited, send cancellation email first
        if ($wasInvited && $member->email) {
            try {
                Mail::to($member->email)->send(new TournamentCancellation($tournament, $member));
            } catch (\Exception $e) {
                return response()->json([
                    'message' => "Email verzenden mislukt voor {$memberName}: {$e->getMessage()}"
                ], 500);
            }
        }

        // Remove the participant
        $participant->delete();

        $message = $wasInvited
            ? "Deelnemer {$memberName} is afgezegd en afgemeld van het toernooi"
            : "Deelnemer {$memberName} is verwijderd van het toernooi";

        return response()->json([
            'message' => $message,
            'was_invited' => $wasInvited
        ]);
    }

    /**
     * Send invitation email to a specific participant
     */
    public function sendInvitationToMember(Tournament $tournament, Member $member)
    {
        // Find the participant
        $participant = TournamentParticipant::where('tournament_id', $tournament->id)
            ->where('member_id', $member->id)
            ->first();

        if (!$participant) {
            return response()->json([
                'message' => 'Deelnemer niet gevonden voor dit toernooi'
            ], 404);
        }

        if (!$member->email) {
            return response()->json([
                'message' => "Geen email adres voor {$member->first_name} {$member->last_name}"
            ], 400);
        }

        $memberName = "{$member->first_name} {$member->last_name}";

        try {
            // Send invitation email
            Mail::to($member->email)->send(new TournamentInvitation($tournament, $member));

            // Update participant status to invited if not already
            $participant->update([
                'status' => 'invited',
                'invited_at' => now()
            ]);

            return response()->json([
                'message' => "Uitnodiging verstuurd naar {$memberName}"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => "Email verzenden mislukt: {$e->getMessage()}"
            ], 500);
        }
    }

    /**
     * Add a member as participant to a tournament
     */
    public function addParticipant(Tournament $tournament, Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id'
        ]);

        $memberId = $request->member_id;
        $member = Member::findOrFail($memberId);

        // Check if already a participant
        $existingParticipant = TournamentParticipant::where('tournament_id', $tournament->id)
            ->where('member_id', $memberId)
            ->first();

        if ($existingParticipant) {
            return response()->json([
                'message' => "{$member->first_name} {$member->last_name} is al een deelnemer van dit toernooi"
            ], 422);
        }

        // Add as eligible participant
        TournamentParticipant::create([
            'tournament_id' => $tournament->id,
            'member_id' => $memberId,
            'status' => 'eligible'
        ]);

        return response()->json([
            'message' => "{$member->first_name} {$member->last_name} is toegevoegd aan het toernooi"
        ]);
    }

    /**
     * Get available members that can be added to tournament
     */
    public function availableMembers(Tournament $tournament)
    {
        $tournament->load('ageCategories');

        if ($tournament->ageCategories->isEmpty()) {
            return response()->json(['available_members' => [], 'total_available' => 0]);
        }

        $tournamentDate = Carbon::parse($tournament->date);
        $tournamentYear = $tournamentDate->year;

        // Get all active members interested in competition
        $allMembers = Member::where('active', true)
            ->where('interested_in_competition', true)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'birthdate']);

        $availableMembers = [];

        foreach ($allMembers as $member) {
            // Skip if no birthdate
            if (!$member->birthdate) {
                continue;
            }

            // Calculate age on tournament year
            $birthYear = Carbon::parse($member->birthdate)->year;
            $ageOnTournamentYear = $tournamentYear - $birthYear;

            // Determine age category
            $memberAgeCategory = $this->determineAgeCategory($ageOnTournamentYear);

            if (!$memberAgeCategory) {
                continue;
            }

            // Check if member's age category matches tournament age categories
            $isEligible = $tournament->ageCategories->contains('id', $memberAgeCategory->id);

            if (!$isEligible) {
                continue;
            }

            // Check if member is already a participant
            $isAlreadyParticipant = TournamentParticipant::where('tournament_id', $tournament->id)
                ->where('member_id', $member->id)
                ->exists();

            if ($isAlreadyParticipant) {
                continue;
            }

            // Add to available members
            $memberData = $member->toArray();
            $memberData['age_on_tournament'] = $ageOnTournamentYear;
            $memberData['calculated_age_category'] = $memberAgeCategory->label ?? '';
            $availableMembers[] = $memberData;
        }

        return response()->json([
            'available_members' => $availableMembers,
            'total_available' => count($availableMembers)
        ]);
    }
}
