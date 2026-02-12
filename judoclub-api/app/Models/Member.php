<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'birthdate',
        'belt',
        'active',
        'age_category',
        'weight_category',
        'gender',
    ];

    protected $casts = [
        'birthdate' => 'date:Y-m-d',
        'active' => 'boolean',
    ];
}
