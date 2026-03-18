<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Member;
use App\Models\Lookup;
use App\Models\TournamentParticipant;
use App\Mail\TournamentInvitation;
use App\Mail\TournamentCancellation;
use App\Mail\TournamentRegistrationConfirmation;
use App\Mail\TournamentUnregistration;
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
        $tournament->load('ageCategories', 'participants.member');
        $tournamentDate = Carbon::parse($tournament->date);
        $tournamentYear = $tournamentDate->year;

        // Format participants for response with all member info
        $participants = $tournament->participants()->with('member')->get()->map(function ($participant) use ($tournamentYear) {
            $member = $participant->member;
            $birthYear = $member->birthdate ? Carbon::parse($member->birthdate)->year : null;
            $ageOnTournament = $birthYear ? $tournamentYear - $birthYear : null;

            // Determine age category
            $ageCategories = Lookup::where('type', 'age_categories')
                ->where('active', true)
                ->orderBy('min_age', 'asc')
                ->get();

            $ageCategory = null;
            if ($ageOnTournament) {
                foreach ($ageCategories as $category) {
                    if ($ageOnTournament >= $category->min_age) {
                        $ageCategory = $category;
                    } else {
                        break;
                    }
                }
            }

            return [
                'id' => $member->id,
                'first_name' => $member->first_name,
                'last_name' => $member->last_name,
                'gender' => $member->gender,
                'email' => $member->email,
                'license_number' => $member->license_number,
                'weight_category' => $member->weight_category,
                'age_on_tournament' => $ageOnTournament,
                'calculated_age_category' => $ageCategory ? $ageCategory->label : '',
                'is_participant' => true,  // These are current participants
                'participant_status' => $participant->status,
                'response_status' => $participant->response_status,
                'registration_status' => $participant->registration_status,
                'invitation_token' => $participant->invitation_token
            ];
        });

        $response = $tournament->toArray();
        $response['eligible_members'] = $participants->toArray();

        return response()->json($response);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'flyer' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'date' => 'required|date',
            'age_category_ids' => 'required|array|min:1',
            'age_category_ids.*' => 'required|exists:lookups,id',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'phase' => 'nullable|in:voorbereiding,inschrijvingen_uitvoeren,inschrijvingen_compleet,afgelopen',
            'invitation_deadline' => 'nullable|date',
        ]);

        // Handle flyer upload
        $flyerPath = $tournament->flyer;
        if ($request->hasFile('flyer')) {
            if ($tournament->flyer && \Storage::disk('public')->exists($tournament->flyer)) {
                \Storage::disk('public')->delete($tournament->flyer);
            }
            $flyerPath = $request->file('flyer')->store('tournament-flyers', 'public');
        }

        $tournamentData = collect($validated)->except(['age_category_ids', 'flyer'])->toArray();
        $tournamentData['flyer'] = $flyerPath;
        $tournament->update($tournamentData);

        $tournament->ageCategories()->sync($validated['age_category_ids']);
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

        // Haal alle actieve leden op die geïnteresseerd zijn in competitie
        $allMembers = Member::where('active', true)
            ->where('interested_in_competition', true)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        // Haal bestaande participants op voor dit toernooi (geïndexeerd op member_id)
        $participants = TournamentParticipant::where('tournament_id', $tournament->id)
            ->get()
            ->keyBy('member_id');

        $eligibleMembers = [];

        foreach ($allMembers as $member) {
            if (!$member->birthdate)
                continue;

            $birthYear = Carbon::parse($member->birthdate)->year;
            $ageOnTournamentYear = $tournamentYear - $birthYear;
            $memberAgeCategory = $this->determineAgeCategory($ageOnTournamentYear);

            if (!$memberAgeCategory)
                continue;

            // Controleer of de leeftijdscategorie van het lid overeenkomt met de toernooi leeftijdscategorieën
            if (!$tournament->ageCategories->contains('id', $memberAgeCategory->id))
                continue;

            $participant = $participants->get($member->id);

            $memberData = $member->toArray();
            $memberData['age_on_tournament'] = $ageOnTournamentYear;
            $memberData['calculated_age_category'] = $memberAgeCategory->label ?? '';
            $memberData['participant_status'] = $participant ? $participant->status : null;
            $memberData['response_status'] = $participant ? $participant->response_status : null;
            $memberData['invited_at'] = $participant ? $participant->invited_at : null;
            $memberData['is_participant'] = $participant !== null;
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
                // Generate unique token if not already present
                if (!$participant->invitation_token) {
                    $participant->invitation_token = \Illuminate\Support\Str::random(32);
                    $participant->response_status = 'pending';
                    $participant->save();
                }

                // Send email
                Mail::to($member->email)->send(new TournamentInvitation($tournament, $member, $participant->invitation_token));

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
     * Accept tournament invitation via token
     */
    public function acceptInvitation(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'Ongeldig token',
                'tournament' => null
            ]);
        }

        $participant = TournamentParticipant::where('invitation_token', $token)->first();

        if (!$participant) {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'Uitnodiging niet gevonden',
                'tournament' => null
            ]);
        }

        // Check if tournament phase allows acceptance
        $tournament = $participant->tournament;
        if ($tournament->phase !== 'voorbereiding') {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'De inschrijvingsperiode voor dit toernooi is gesloten.',
                'tournament' => $tournament
            ]);
        }

        // Check if invitation deadline has passed
        if ($tournament->invitation_deadline && Carbon::today()->gt(Carbon::parse($tournament->invitation_deadline))) {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'De deadline voor het accepteren van uitnodigingen (' . Carbon::parse($tournament->invitation_deadline)->format('d-m-Y') . ') is verstreken.',
                'tournament' => $tournament
            ]);
        }

        $participant->update([
            'response_status' => 'accepted',
            'status' => 'confirmed'
        ]);

        return view('invitation-response', [
            'status' => 'accepted',
            'tournament' => $tournament
        ]);
    }

    /**
     * Decline tournament invitation via token
     */
    public function declineInvitation(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'Ongeldig token',
                'tournament' => null
            ]);
        }

        $participant = TournamentParticipant::where('invitation_token', $token)->first();

        if (!$participant) {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'Uitnodiging niet gevonden',
                'tournament' => null
            ]);
        }

        // Check if tournament phase allows declining
        $tournament = $participant->tournament;
        if ($tournament->phase !== 'voorbereiding') {
            return view('invitation-response', [
                'status' => 'error',
                'message' => 'De inschrijvingsperiode voor dit toernooi is gesloten.',
                'tournament' => $tournament
            ]);
        }

        $participant->update([
            'response_status' => 'declined',
            'status' => 'declined'
        ]);

        return view('invitation-response', [
            'status' => 'declined',
            'tournament' => $tournament
        ]);
    }

    /**
     * Remove a participant from a tournament
     * Sends cancellation email if participant was invited
     */
    public function removeParticipant(Tournament $tournament, Member $member)
    {
        if ($tournament->phase !== 'voorbereiding') {
            return response()->json(['message' => 'Deelnemers kunnen niet worden verwijderd in de huidige fase.'], 403);
        }

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
            // Generate unique token if not already present
            if (!$participant->invitation_token) {
                $participant->invitation_token = \Illuminate\Support\Str::random(32);
                $participant->response_status = 'pending';
                $participant->save();
            }

            // Send invitation email
            Mail::to($member->email)->send(new TournamentInvitation($tournament, $member, $participant->invitation_token));

            // Update participant status to invited if not already
            $participant->update([
                'status' => 'invited',
                'invited_at' => now(),
                'response_status' => 'pending'
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
        if ($tournament->phase !== 'voorbereiding') {
            return response()->json(['message' => 'Deelnemers kunnen niet worden toegevoegd in de huidige fase.'], 403);
        }

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

    /**
     * Confirm registration of an accepted participant and send confirmation email
     */
    public function confirmRegistration(Tournament $tournament, Member $member)
    {
        if ($tournament->phase !== 'inschrijvingen_uitvoeren') {
            return response()->json(['message' => 'Inschrijvingen bevestigen is alleen mogelijk in de fase "Inschrijvingen uitvoeren".'], 403);
        }

        $participant = $tournament->participants()->where('member_id', $member->id)->first();

        if (!$participant) {
            return response()->json(['message' => 'Deelnemer niet gevonden.'], 404);
        }

        if ($participant->response_status !== 'accepted') {
            return response()->json(['message' => 'Alleen deelnemers die hebben geaccepteerd kunnen worden ingeschreven.'], 422);
        }

        if (!$member->email) {
            return response()->json(['message' => "Geen email adres voor {$member->first_name} {$member->last_name}"], 422);
        }

        try {
            Mail::to($member->email)->send(new TournamentRegistrationConfirmation($tournament, $member));
            $participant->update(['registration_status' => 'ingeschreven']);
            return response()->json(['message' => "Inschrijvingsbevestiging verstuurd naar {$member->first_name} {$member->last_name}"]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Email versturen mislukt: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Unregister a participant (send unregistration email, set status to uitgeschreven)
     */
    public function unregisterParticipant(Tournament $tournament, Member $member)
    {
        if ($tournament->phase !== 'inschrijvingen_uitvoeren') {
            return response()->json(['message' => 'Uitschrijven is alleen mogelijk in de fase "Inschrijvingen uitvoeren".'], 403);
        }

        $participant = $tournament->participants()->where('member_id', $member->id)->first();

        if (!$participant) {
            return response()->json(['message' => 'Deelnemer niet gevonden.'], 404);
        }

        if ($participant->registration_status !== 'ingeschreven') {
            return response()->json(['message' => 'Alleen ingeschreven deelnemers kunnen worden uitgeschreven.'], 422);
        }

        if (!$member->email) {
            return response()->json(['message' => "Geen email adres voor {$member->first_name} {$member->last_name}"], 422);
        }

        try {
            Mail::to($member->email)->send(new TournamentUnregistration($tournament, $member));
            $participant->update(['registration_status' => 'uitgeschreven']);
            return response()->json(['message' => "{$member->first_name} {$member->last_name} is uitgeschreven en werd verwittigd per mail."]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Email versturen mislukt: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove participant from confirmed list (move to overige deelnemers)
     */
    public function removeFromRegistrationList(Tournament $tournament, Member $member)
    {
        $participant = $tournament->participants()->where('member_id', $member->id)->first();

        if (!$participant) {
            return response()->json(['message' => 'Deelnemer niet gevonden.'], 404);
        }

        $participant->update(['registration_status' => 'verwijderd']);
        return response()->json(['message' => "{$member->first_name} {$member->last_name} is verplaatst naar de lijst met overige deelnemers."]);
    }

    /**
     * Transition tournament to 'inschrijvingen_compleet' after verifying all accepted participants are ingeschreven.
     */
    public function completeRegistrations(Tournament $tournament)
    {
        if ($tournament->phase !== 'inschrijvingen_uitvoeren') {
            return response()->json(['message' => 'Fase wijzigen naar "inschrijvingen compleet" is alleen mogelijk vanuit de fase "Inschrijvingen uitvoeren".'], 422);
        }

        // Find accepted participants whose registration is not yet confirmed or have been unregistered
        // These are participants in the "bevestigde deelnemers" list (not in "overige deelnemers")
        $notRegistered = $tournament->participants()
            ->where('response_status', 'accepted')
            ->where(function ($q) {
                $q->whereNull('registration_status')
                    ->orWhere('registration_status', 'uitgeschreven');
            })
            ->with('member')
            ->get();

        if ($notRegistered->isNotEmpty()) {
            $names = $notRegistered->map(fn($p) => $p->member->first_name . ' ' . $p->member->last_name)->join(', ');
            return response()->json([
                'message' => "Niet alle deelnemers zijn ingeschreven. Nog niet ingeschreven: {$names}.",
                'not_registered' => $notRegistered->map(fn($p) => [
                    'id' => $p->member_id,
                    'name' => $p->member->first_name . ' ' . $p->member->last_name,
                ])->values(),
            ], 422);
        }

        $tournament->update(['phase' => 'inschrijvingen_compleet']);
        return response()->json(['message' => 'Inschrijvingen zijn afgesloten. Fase gewijzigd naar "Inschrijvingen compleet".']);
    }
}
