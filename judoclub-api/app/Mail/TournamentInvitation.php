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

class TournamentInvitation extends Mailable
{
    use Queueable, SerializesModels;

    public Tournament $tournament;
    public Member $member;
    public string $invitationToken;

    /**
     * Create a new message instance.
     */
    public function __construct(Tournament $tournament, Member $member, string $invitationToken = '')
    {
        $this->tournament = $tournament;
        $this->member = $member;
        $this->invitationToken = $invitationToken;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Uitnodiging voor toernooi: {$this->tournament->name}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $baseUrl = config('app.url');

        return new Content(
            view: 'emails.tournament-invitation',
            with: [
                'tournament' => $this->tournament,
                'member' => $this->member,
                'acceptUrl' => "{$baseUrl}/api/invitations/accept?token=" . $this->invitationToken,
                'declineUrl' => "{$baseUrl}/api/invitations/decline?token=" . $this->invitationToken,
                'invitationToken' => $this->invitationToken,
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
