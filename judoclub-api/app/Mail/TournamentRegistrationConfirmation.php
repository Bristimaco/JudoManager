<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Tournament;
use App\Models\Member;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Storage;

class TournamentRegistrationConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public Tournament $tournament;
    public Member $member;

    public function __construct(Tournament $tournament, Member $member)
    {
        $this->tournament = $tournament;
        $this->member = $member;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Inschrijving bevestigd: {$this->tournament->name}",
        );
    }

    public function content(): Content
    {
        $mapsUrl = null;
        $staticMapUrl = null;

        if ($this->tournament->address) {
            $mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' . urlencode($this->tournament->address);
            $coords = $this->geocode($this->tournament->address);
            if ($coords) {
                [$lat, $lon] = $coords;
                $staticMapUrl = "https://staticmap.openstreetmap.de/staticmap.php?center={$lat},{$lon}&zoom=14&size=560x200&markers={$lat},{$lon},red-pushpin";
            }
        }

        return new Content(
            view: 'emails.tournament-registration-confirmation',
            with: [
                'tournament' => $this->tournament,
                'member' => $this->member,
                'mapsUrl' => $mapsUrl,
                'staticMapUrl' => $staticMapUrl,
            ],
        );
    }

    private function geocode(string $address): ?array
    {
        try {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 4,
                    'header' => "User-Agent: JudoClub/1.0\r\n",
                ]
            ]);
            $url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' . urlencode($address);
            $response = file_get_contents($url, false, $context);
            $data = json_decode($response, true);
            if (!empty($data[0]['lat'])) {
                return [(float) $data[0]['lat'], (float) $data[0]['lon']];
            }
        } catch (\Exception $e) {
            // silent fail
        }
        return null;
    }

    public function attachments(): array
    {
        $attachments = [];

        if ($this->tournament->flyer && Storage::disk('public')->exists($this->tournament->flyer)) {
            $extension = pathinfo($this->tournament->flyer, PATHINFO_EXTENSION);
            $attachments[] = Attachment::fromStorageDisk('public', $this->tournament->flyer)
                ->as('flyer.' . $extension);
        }

        return $attachments;
    }
}
