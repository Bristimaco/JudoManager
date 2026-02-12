<?php

namespace App\DataManagement\Imports;

use App\Models\Member;
use App\Enums\Gender;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;

class MembersImport implements ToCollection, WithHeadingRow, SkipsEmptyRows
{
    public int $inserted = 0;
    public int $updated = 0;
    public int $skipped = 0;
    public array $errors = [];

    /**
     * Als jouw Excel eerst een titelrij heeft (bv. "Leden export"),
     * zet dit naar 2.
     */
    public function headingRow(): int
    {
        return 1;
    }

    public function collection(Collection $rows)
    {
        DB::transaction(function () use ($rows) {
            foreach ($rows as $i => $row) {
                // Excel rijnummer voor foutmeldingen:
                $excelRowNumber = $i + $this->headingRow() + 1;

                // Extra safeguard: als om één of andere reden de header toch als data doorkomt
                // (bv. verkeerd headingRow), skip hem.
                $possibleHeader = strtolower(trim((string) ($row['first_name'] ?? '')));
                if ($possibleHeader === 'first_name' || $possibleHeader === 'voornaam') {
                    $this->skipped++;
                    continue;
                }

                $licensenumber = trim(string: (string) ($row['license_number'] ?? ''));

                $first = trim((string) ($row['first_name'] ?? ''));
                $last = trim((string) ($row['last_name'] ?? ''));

                if ($first === '' || $last === '') {
                    $this->errors[] = [
                        'row' => $excelRowNumber,
                        'field' => 'first_name/last_name',
                        'message' => 'Voornaam en achternaam zijn verplicht.',
                    ];
                    $this->skipped++;
                    continue;
                }

                $gender = isset($row['gender']) && $row['gender'] !== ''
                    ? trim((string) $row['gender'])
                    : null;

                if (!is_null($gender) && !in_array($gender, Gender::options(), true)) {
                    $this->errors[] = [
                        'row' => $excelRowNumber,
                        'field' => 'gender',
                        'message' => 'Geslacht moet M of V zijn (of leeg).',
                    ];
                    $this->skipped++;
                    continue;
                }

                $birthdate = isset($row['birthdate']) && $row['birthdate'] !== ''
                    ? trim((string) $row['birthdate'])
                    : null;

                if (!is_null($birthdate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
                    $this->errors[] = [
                        'row' => $excelRowNumber,
                        'field' => 'birthdate',
                        'message' => 'Geboortedatum moet YYYY-MM-DD zijn (of leeg).',
                    ];
                    $this->skipped++;
                    continue;
                }

                $weightCategory = isset($row['weight_category']) && $row['weight_category'] !== ''
                    ? trim((string) $row['weight_category'])
                    : null;

                if (empty($gender) && !empty($weightCategory)) {
                    $this->errors[] = [
                        'row' => $excelRowNumber,
                        'field' => 'weight_category',
                        'message' => 'Gewichtscategorie mag niet zonder geslacht.',
                    ];
                    $this->skipped++;
                    continue;
                }

                $data = [
                    'license_number' => $licensenumber,
                    'first_name' => $first,
                    'last_name' => $last,
                    'gender' => $gender,
                    'birthdate' => $birthdate,
                    'belt' => isset($row['belt']) && $row['belt'] !== '' ? trim((string) $row['belt']) : null,
                    'age_category' => isset($row['age_category']) && $row['age_category'] !== '' ? trim((string) $row['age_category']) : null,
                    'weight_category' => $weightCategory,
                    'active' => isset($row['active']) ? (bool) intval($row['active']) : true,
                ];

                $id = isset($row['id']) && $row['id'] !== '' ? (int) $row['id'] : null;

                $id = isset($row['id']) && $row['id'] !== '' ? (int) $row['id'] : null;

                if ($id) {
                    $member = Member::find($id);

                    if ($member) {
                        // update bestaande
                        $member->update($data);
                        $this->updated++;
                        continue;
                    }

                    // id bestaat niet -> CREATE nieuw record (negeer id uit Excel)
                    Member::create($data);
                    $this->inserted++;
                    continue;
                }

                // geen id -> create
                Member::create($data);
                $this->inserted++;
            }
        });
    }
}
