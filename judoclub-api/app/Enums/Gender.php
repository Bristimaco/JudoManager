<?php

namespace App\Enums;

enum Gender: string
{
    case M = 'M';
    case V = 'V';

    public static function options(): array
    {
        return array_map(fn(self $g) => $g->value, self::cases());
    }

    public static function labels(): array
    {
        return [
            self::M->value => 'Man',
            self::V->value => 'Vrouw',
        ];
    }
}
