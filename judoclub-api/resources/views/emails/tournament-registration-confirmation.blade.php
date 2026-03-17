<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inschrijving Bevestigd</title>
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
            background-color: #10b981;
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
            border-left: 4px solid #10b981;
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
        <h1>🥋 Inschrijving Bevestigd</h1>
    </div>

    <div class="content">
        <p>Beste {{ $member->first_name }},</p>

        <p>Jouw inschrijving voor het volgende toernooi is officieel bevestigd:</p>

        <div class="tournament-info">
            <h2>{{ $tournament->name }}</h2>
            @if($tournament->date)
                <p><strong>Datum:</strong> {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}</p>
            @endif
            @if($tournament->address)
                <p><strong>Locatie:</strong> {{ $tournament->address }}</p>
                @if($staticMapUrl)
                    <div style="margin-top: 12px;">
                        <a href="{{ $mapsUrl }}" target="_blank">
                            <img src="{{ $staticMapUrl }}" alt="Kaart van {{ $tournament->address }}" width="560"
                                style="width:100%;max-width:560px;border-radius:6px;border:1px solid #e2e8f0;display:block;" />
                        </a>
                    </div>
                @endif
                @if($mapsUrl)
                    <div style="margin-top: 8px; text-align: center;">
                        <a href="{{ $mapsUrl }}" style="color: #10b981; font-size: 13px; text-decoration: none;">📍 Bekijk
                            locatie op Google Maps →</a>
                    </div>
                @endif
            @endif
            @if($tournament->description)
                <p style="margin-top: 12px;"><strong>Omschrijving:</strong> {{ $tournament->description }}</p>
            @endif
        </div>

        <p>✅ Je bent officieel ingeschreven voor dit toernooi. Wij kijken ernaar uit je te zien!</p>

        <p>Vergeet niet tijdig aanwezig te zijn op de locatie. Voor vragen kun je contact opnemen met het Judoclub team.
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