<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lookup extends Model
{
    protected $fillable = ['type', 'gender', 'label', 'min_age', 'color', 'sort_order', 'active',];

    protected $casts = [
        'sort_order' => 'integer',
        'min_age' => 'integer',
        'active' => 'boolean',
    ];
}
