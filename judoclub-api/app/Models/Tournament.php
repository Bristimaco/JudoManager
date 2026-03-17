<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tournament extends Model
{
    protected $fillable = [
        'name',
        'address',
        'flyer',
        'date',
        'description',
        'active',
        'phase',
        'invitation_deadline',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'invitation_deadline' => 'date:Y-m-d',
        'active' => 'boolean',
    ];

    // Scope voor actieve toernooien
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    // Scope voor komende toernooien
    public function scopeUpcoming($query)
    {
        return $query->where('date', '>=', now()->toDateString());
    }

    // Scope voor voorbije toernooien  
    public function scopePast($query)
    {
        return $query->where('date', '<', now()->toDateString());
    }

    // Many-to-many relatie met age categories (via lookups)
    public function ageCategories()
    {
        return $this->belongsToMany(
            \App\Models\Lookup::class,
            'tournament_age_category',
            'tournament_id',
            'lookup_id'
        )->where('type', 'age_categories');
    }

    // Participants relatie
    public function participants()
    {
        return $this->hasMany(TournamentParticipant::class);
    }
}
