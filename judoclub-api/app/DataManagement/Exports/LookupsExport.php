<?php

namespace App\DataManagement\Exports;

use App\Models\Lookup;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Illuminate\Support\Collection;

class LookupsExport implements FromCollection, WithHeadings, WithMapping
{
    private string $type;

    public function __construct(string $type)
    {
        $this->type = $type;
    }

    public function collection()
    {
        return Lookup::query()
            ->where('type', $this->type)
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();
    }

    public function headings(): array
    {
        // Standaard velden voor alle lookup types
        $baseHeadings = ['id', 'label', 'sort_order', 'active'];

        // Extra velden afhankelijk van type
        if ($this->type === 'weight_categories') {
            return array_merge(['gender', 'age_category'], $baseHeadings);
        }

        if ($this->type === 'age_categories') {
            return array_merge($baseHeadings, ['min_age']);
        }

        if ($this->type === 'belts') {
            return array_merge($baseHeadings, ['color']);
        }

        return $baseHeadings;
    }

    public function map($lookup): array
    {
        $base = [
            $lookup->id,
            $lookup->label,
            $lookup->sort_order,
            $lookup->active ? 1 : 0,
        ];

        if ($this->type === 'weight_categories') {
            return [
                $lookup->gender ?? '',
                $lookup->age_category ?? '',
                ...$base,
            ];
        }

        if ($this->type === 'age_categories') {
            return [...$base, $lookup->min_age ?? ''];
        }

        if ($this->type === 'belts') {
            return [...$base, $lookup->color ?? ''];
        }

        return $base;
    }
}
