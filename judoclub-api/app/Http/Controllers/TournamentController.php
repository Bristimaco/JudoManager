<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'date' => 'required|date|after_or_equal:today',
            'age_category_ids' => 'required|array|min:1',
            'age_category_ids.*' => 'required|exists:lookups,id',
            'description' => 'nullable|string',
            'active' => 'boolean',
        ]);
        
        // Maak tournament zonder age_category_ids
        $tournamentData = collect($validated)->except('age_category_ids')->toArray();
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
            'date' => 'required|date',
            'age_category_ids' => 'required|array|min:1',
            'age_category_ids.*' => 'required|exists:lookups,id',
            'description' => 'nullable|string',
            'active' => 'boolean',
        ]);
        
        // Update tournament zonder age_category_ids
        $tournamentData = collect($validated)->except('age_category_ids')->toArray();
        $tournament->update($tournamentData);
        
        // Sync de age categories via pivot table
        $tournament->ageCategories()->sync($validated['age_category_ids']);
        
        // Laad de age categories voor de response
        $tournament->load('ageCategories');
        
        return response()->json($tournament);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Tournament $tournament)
    {
        $tournament->delete();
        
        return response()->json(['message' => 'Tournament deleted successfully']);
    }
}
