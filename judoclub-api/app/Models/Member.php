<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    protected $fillable = [
        'license_number',
        'first_name',
        'last_name',
        'birthdate',
        'belt',
        'active',
        'interested_in_competition',
        'age_category',
        'weight_category',
        'gender',
    ];

    protected $casts = [
        'birthdate' => 'date:Y-m-d',
        'active' => 'boolean',
        'interested_in_competition' => 'boolean',
    ];
}
