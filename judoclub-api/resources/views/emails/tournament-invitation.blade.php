<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Toernooi Uitnodiging</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }

        .content {
            background-color: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }

        .tournament-info {
            background-color: white;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            margin: 25px 0;
            justify-content: center;
        }

        .btn {
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            text-align: center;
            min-width: 150px;
        }

        .btn-accept {
            background-color: #10b981;
            color: white;
        }

        .btn-decline {
            background-color: #ef4444;
            color: white;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #64748b;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>🥋 Toernooi Uitnodiging</h1>
    </div>

    <div class="content">
        <p>Beste {{ $member->first_name }},</p>

        <p>Je bent uitgenodigd om deel te nemen aan het volgende toernooi:</p>

        <div class="tournament-info">
            <h2>{{ $tournament->name }}</h2>
            @if($tournament->date)
                <p><strong>Datum:</strong> {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}</p>
            @endif
            @if($tournament->address)
                <p><strong>Locatie:</strong> {{ $tournament->address }}</p>
            @endif
            @if($tournament->description)
                <p><strong>Omschrijving:</strong> {{ $tournament->description }}</p>
            @endif
        </div>

        <p>Op basis van jouw profiel ben je geschikt voor dit toernooi.</p>

        @if($tournament->invitation_deadline)
            <div
                style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin: 16px 0; text-align: center;">
                <p style="margin: 0; color: #92400e; font-weight: bold;">
                    ⏰ Gelieve te antwoorden voor
                    <strong>{{ \Carbon\Carbon::parse($tournament->invitation_deadline)->format('d-m-Y') }}</strong>
                </p>
            </div>
        @endif

        <p style="font-weight: bold; text-align: center; color: #2563eb; margin: 20px 0;">
            Wil je aan dit toernooi deelnemen?
        </p>

        <div class="action-buttons">
            <a href="{{ $acceptUrl }}" class="btn btn-accept">✓ Ja, ik neem deel!</a>
            <a href="{{ $declineUrl }}" class="btn btn-decline">✗ Nee, ik doe niet mee</a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">
            Klik op een van de knoppen hierboven om je antwoord in te stellen.
        </p>

        <p>Veel succes en plezier!</p>

        <p>Met vriendelijke groet,<br>
            Het Judoclub Team</p>
    </div>

    <div class="footer">
        <p>Deze email is automatisch verzonden door het Judoclub Management Systeem.</p>
    </div>
</body>

</html>