<?php

namespace App\Console\Commands;

use App\Models\Lookup;
use App\Models\Member;
use Illuminate\Console\Command;
use Carbon\Carbon;

class UpdateMemberAgeCategories extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'members:update-age-categories {--dry-run : Show changes without applying them} {--year= : Year to calculate age for (default: current year)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update member age categories based on the age they turn in the specified year';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $year = (int) ($this->option('year') ?? date('Y'));
        
        $this->info("=== Age Category Update voor jaar {$year} ===");
        
        if ($dryRun) {
            $this->warn('DRY RUN MODE - Er worden geen wijzigingen opgeslagen');
        }

        // Haal alle actieve age categories op, gesorteerd op min_age
        $ageCategories = Lookup::where('type', 'age_categories')
            ->where('active', true)
            ->whereNotNull('min_age')
            ->orderBy('min_age', 'desc') // Hoogste min_age eerst voor correcte matching
            ->get();

        if ($ageCategories->isEmpty()) {
            $this->error('Geen actieve leeftijdscategorieën met min_age gevonden.');
            $this->info('Gebruik eerst: php artisan age-categories:manage --update');
            return 1;
        }

        $this->info('Beschikbare leeftijdscategorieën:');
        foreach ($ageCategories->reverse() as $cat) {
            $this->line("  {$cat->label} (min_age: {$cat->min_age})");
        }
        $this->info('');

        // Haal alle leden op met geboortedatum
        $members = Member::whereNotNull('birthdate')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        if ($members->isEmpty()) {
            $this->warn('Geen leden met geboortedatum gevonden.');
            return 0;
        }

        $this->info("Verwerken van {$members->count()} leden...");
        $this->info('');

        $updates = 0;
        $noChanges = 0;
        $errors = 0;

        $progressBar = $this->output->createProgressBar($members->count());
        $progressBar->start();

        foreach ($members as $member) {
            $progressBar->advance();

            try {
                $result = $this->updateMemberAgeCategory($member, $ageCategories, $year, $dryRun);
                
                if ($result === 'updated') {
                    $updates++;
                } elseif ($result === 'no-change') {
                    $noChanges++;
                }
            } catch (\Exception $e) {
                $errors++;
                $this->newLine();
                $this->error("Fout bij {$member->first_name} {$member->last_name}: " . $e->getMessage());
            }
        }

        $progressBar->finish();
        $this->newLine(2);

        // Samenvatting
        $this->info('=== Samenvatting ===');
        $this->info("Verwerkt: {$members->count()} leden");
        $this->info("Bijgewerkt: {$updates} leden");
        $this->info("Geen wijziging: {$noChanges} leden");
        if ($errors > 0) {
            $this->error("Fouten: {$errors} leden");
        }

        if ($dryRun && $updates > 0) {
            $this->info('');
            $this->info('Om de wijzigingen daadwerkelijk toe te passen:');
            $this->info("php artisan members:update-age-categories" . ($this->option('year') ? " --year={$year}" : ""));
        }

        return 0;
    }

    private function updateMemberAgeCategory($member, $ageCategories, $year, $dryRun)
    {
        // Bereken de leeftijd die iemand WORDT in het opgegeven jaar (op zijn verjaardag)
        $birthdate = Carbon::parse($member->birthdate);
        $birthdayInYear = Carbon::create($year, $birthdate->month, $birthdate->day);
        $ageInYear = $birthdate->diffInYears($birthdayInYear);

        // Zoek de juiste leeftijdscategorie
        // De categorie met de hoogste min_age die nog steeds <= ageInYear is
        $targetCategory = null;
        
        foreach ($ageCategories as $category) {
            if ($category->min_age <= $ageInYear) {
                $targetCategory = $category;
                break; // Eerste match is de beste (hoogste min_age door desc sortering)
            }
        }

        if (!$targetCategory) {
            // Geen geschikte categorie gevonden, misschien te jong
            // Zoek de categorie met de laagste min_age
            $targetCategory = $ageCategories->last();
        }

        $currentCategory = $member->age_category;
        $newCategory = $targetCategory->label;

        // Check of er een wijziging nodig is
        if ($currentCategory === $newCategory) {
            return 'no-change';
        }

        // Log de wijziging
        $birthYear = $birthdate->year;
        $this->newLine();
        $this->line(sprintf(
            '%s %s (geboren %s, wordt %d in %d): %s → %s',
            $member->first_name,
            $member->last_name, 
            $birthdate->format('d/m/Y'),
            $ageInYear,
            $year,
            $currentCategory ?: '(geen)',
            $newCategory
        ));

        // Voer de update uit (alleen als niet dry run)
        if (!$dryRun) {
            $member->age_category = $newCategory;
            $member->save();
        }

        return 'updated';
    }
}
