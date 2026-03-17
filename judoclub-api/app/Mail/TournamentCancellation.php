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

class TournamentCancellation extends Mailable
{
    use Queueable, SerializesModels;

    public Tournament $tournament;
    public Member $member;

    /**
     * Create a new message instance.
     */
    public function __construct(Tournament $tournament, Member $member)
    {
        $this->tournament = $tournament;
        $this->member = $member;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Afmelding toernooi: {$this->tournament->name}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.tournament-cancellation',
            with: [
                'tournament' => $this->tournament,
                'member' => $this->member,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
