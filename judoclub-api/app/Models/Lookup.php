<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lookup extends Model
{
    protected $fillable = ['type', 'gender', 'label', 'min_age', 'color', 'sort_order', 'active', 'age_category'];

    protected $casts = [
        'sort_order' => 'integer',
        'min_age' => 'integer',
        'active' => 'boolean',
    ];
}
