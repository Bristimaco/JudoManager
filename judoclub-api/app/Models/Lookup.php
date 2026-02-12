<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lookup extends Model
{
    protected $fillable = ['type', 'gender', 'label', 'sort_order', 'active',];

    protected $casts = [
        'sort_order' => 'integer',
        'active' => 'boolean',
    ];
}
