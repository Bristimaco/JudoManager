<?php

namespace App\DataManagement\Imports;

use App\Models\Lookup;
use App\Enums\Gender;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Illuminate\Validation\Rule;

class LookupsImport implements ToCollection, WithHeadingRow, SkipsEmptyRows
{
    public int $inserted = 0;
    public int $updated = 0;
    public int $skipped = 0;
    public array $errors = [];
    private string $type;

    public function __construct(string $type)
    {
        $this->type = $type;
    }

    public function headingRow(): int
    {
        return 1;
    }

    public function collection(Collection $rows)
    {
        DB::transaction(function () use ($rows) {
            foreach ($rows as $i => $row) {
                $excelRowNumber = $i + $this->headingRow() + 1;

                $id = isset($row['id']) ? (int) trim((string) $row['id']) : null;
                $label = isset($row['label']) ? trim((string) $row['label']) : '';

                if ($label === '') {
                    $this->errors[] = [
                        'row' => $excelRowNumber,
                        'field' => 'label',
                        'message' => 'Label is verplicht.',
                    ];
                    $this->skipped++;
                    continue;
                }

                $sortOrder = isset($row['sort_order']) && $row['sort_order'] !== ''
                    ? (int) trim((string) $row['sort_order'])
                    : 0;

                $active = isset($row['active']) && in_array(strtolower(trim((string) $row['active'])), ['1', 'true', 'ja', 'yes'], true)
                    ? true
                    : false;

                $data = [
                    'type' => $this->type,
                    'label' => $label,
                    'sort_order' => $sortOrder,
                    'active' => $active,
                ];

                // Type-specific fields
                if ($this->type === 'weight_categories') {
                    $gender = isset($row['gender']) && $row['gender'] !== ''
                        ? trim((string) $row['gender'])
                        : null;

                    if (!is_null($gender) && !in_array($gender, Gender::options(), true)) {
                        $this->errors[] = [
                            'row' => $excelRowNumber,
                            'field' => 'gender',
                            'message' => 'Geslacht moet M of V zijn.',
                        ];
                        $this->skipped++;
                        continue;
                    }

                    $data['gender'] = $gender;
                    $data['age_category'] = isset($row['age_category']) && $row['age_category'] !== ''
                        ? trim((string) $row['age_category'])
                        : null;
                }

                if ($this->type === 'age_categories') {
                    $data['min_age'] = isset($row['min_age']) && $row['min_age'] !== ''
                        ? (int) trim((string) $row['min_age'])
                        : null;
                }

                if ($this->type === 'belts') {
                    $data['color'] = isset($row['color']) && $row['color'] !== ''
                        ? trim((string) $row['color'])
                        : null;
                }

                // Create or update
                if ($id && Lookup::where('id', $id)->exists()) {
                    Lookup::where('id', $id)->update($data);
                    $this->updated++;
                } else {
                    Lookup::create($data);
                    $this->inserted++;
                }
            }
        });
    }
}
