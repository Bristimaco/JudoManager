<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Member;
use App\Models\Lookup;
use App\Models\TournamentParticipant;
use App\Mail\TournamentInvitation;
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

        // Haal alle actieve leden op die interesse hebben in competitie
        $members = Member::where('active', true)
            ->where('interested_in_competition', true)
            ->get();

        $eligibleMemberIds = [];

        foreach ($members as $member) {
            if (!$member->birthdate)
                continue;

            // Bereken leeftijd op 1 januari van het toernooi jaar (calendar year system)
            $birthYear = Carbon::parse($member->birthdate)->year;
            $ageOnTournamentYear = $tournamentYear - $birthYear;

            // Bepaal in welke age category dit lid valt
            $memberAgeCategory = $this->determineAgeCategory($ageOnTournamentYear);

            if (!$memberAgeCategory)
                continue;

            // Check of de member's age category matcht met een van de tournament age categories
            $isEligible = $tournament->ageCategories->contains('id', $memberAgeCategory->id);

            if ($isEligible) {
                $eligibleMemberIds[] = $member->id;
            }
        }

        // Verwijder bestaande participants voor dit toernooi
        TournamentParticipant::where('tournament_id', $tournament->id)->delete();

        // Maak nieuwe participants aan
        foreach ($eligibleMemberIds as $memberId) {
            TournamentParticipant::create([
                'tournament_id' => $tournament->id,
                'member_id' => $memberId,
                'status' => 'eligible'
            ]);
        }

        // Haal participants op met member data
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
}
