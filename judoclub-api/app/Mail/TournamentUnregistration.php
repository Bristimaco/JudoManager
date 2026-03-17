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

class TournamentUnregistration extends Mailable
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
            subject: "Uitschrijving bevestigd: {$this->tournament->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tournament-unregistration',
            with: [
                'tournament' => $this->tournament,
                'member' => $this->member,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
