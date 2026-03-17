<?php

namespace App\Console\Commands;

use App\Models\Lookup;
use Illuminate\Console\Command;

class UpdateAgeCategories extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'age-categories:manage {--update : Update age categories with min_age values}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage age categories and their minimum age requirements';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Huidige leeftijdscategorieën ===');

        $ageCategories = Lookup::where('type', 'age_categories')->orderBy('id')->get();

        if ($ageCategories->isEmpty()) {
            $this->warn('Geen leeftijdscategorieën gevonden.');
            return 0;
        }

        $headers = ['ID', 'Label', 'Min Age'];
        $rows = [];

        foreach ($ageCategories as $cat) {
            $rows[] = [
                $cat->id,
                $cat->label,
                $cat->min_age ?? 'NULL'
            ];
        }

        $this->table($headers, $rows);

        if ($this->option('update')) {
            $this->updateAgeCategories($ageCategories);
        } else {
            $this->info('');
            $this->info('Om de minimum leeftijden bij te werken, gebruik: php artisan age-categories:manage --update');
        }

        return 0;
    }

    private function updateAgeCategories($categories)
    {
        $this->info('=== Bijwerken minimum leeftijden ===');

        // Standaard mapping van age category labels naar minimum leeftijden
        $defaultAges = [
            'U11' => 6,    // Van 6 tot en met 10 jaar
            'U13' => 11,   // Van 11 tot en met 12 jaar  
            'U15' => 13,   // Van 13 tot en met 14 jaar
            'U18' => 15,   // Van 15 tot en met 17 jaar
            'U21' => 18,   // Van 18 tot en met 20 jaar
            'Senior' => 21, // Vanaf 21 jaar
        ];

        foreach ($categories as $cat) {
            // Zoek naar een match in de default mapping
            $defaultAge = null;
            foreach ($defaultAges as $pattern => $age) {
                if (stripos($cat->label, $pattern) !== false) {
                    $defaultAge = $age;
                    break;
                }
            }

            $currentAge = $cat->min_age ?? 'NULL';

            if ($defaultAge !== null) {
                $suggested = $defaultAge;
                $message = "Voor '{$cat->label}' (huidig: {$currentAge}) -> voorstel: {$suggested}";
            } else {
                $suggested = '';
                $message = "Voor '{$cat->label}' (huidig: {$currentAge}) -> geen voorstel, voer handmatig in";
            }

            $this->line($message);

            $newAge = $this->ask("Nieuwe minimum leeftijd voor '{$cat->label}'", $suggested);

            if (is_numeric($newAge) && $newAge >= 0) {
                $cat->min_age = (int) $newAge;
                $cat->save();
                $this->info("✓ '{$cat->label}' bijgewerkt naar minimum leeftijd: {$newAge}");
            } elseif (empty($newAge)) {
                $this->info("- '{$cat->label}' overgeslagen");
            } else {
                $this->warn("! '{$cat->label}' niet bijgewerkt (ongeldige invoer: {$newAge})");
            }
        }

        $this->info('=== Bijwerken voltooid ===');
    }
}
