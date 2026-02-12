<?php

namespace App\DataManagement\Exports;

use App\Models\Member;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MembersExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return Member::query()
            ->orderBy('id') // <-- sorteren op id (ASC standaard)
            ->get();
    }

    public function headings(): array
    {
        // Houd dit stabiel voor import
        return [
            'id',
            'license_number',
            'first_name',
            'last_name',
            'gender',        // M/V
            'birthdate',     // YYYY-MM-DD
            'belt',
            'age_category',
            'weight_category',
            'active',        // 1/0
        ];
    }

    public function map($m): array
    {
        return [
            $m->id,
            $m->license_number,
            $m->first_name,
            $m->last_name,
            $m->gender,
            optional($m->birthdate)->format('Y-m-d'),
            $m->belt,
            $m->age_category,
            $m->weight_category,
            $m->active ? 1 : 0,
        ];
    }
}
