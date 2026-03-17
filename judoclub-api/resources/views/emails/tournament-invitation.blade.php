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

        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
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
            @if($tournament->location)
                <p><strong>Locatie:</strong> {{ $tournament->location }}</p>
            @endif
            @if($tournament->description)
                <p><strong>Omschrijving:</strong> {{ $tournament->description }}</p>
            @endif
            @if($tournament->age_category)
                <p><strong>Leeftijdscategorie:</strong> {{ $tournament->age_category }}</p>
            @endif
            @if($tournament->weight_category)
                <p><strong>Gewichtscategorie:</strong> {{ $tournament->weight_category }}</p>
            @endif
        </div>

        <p>Op basis van jouw profiel (leeftijd: {{ $member->age_category ?? 'onbekend' }}, gewicht:
            {{ $member->weight_category ?? 'onbekend' }}, gordel: {{ $member->belt ?? 'onbekend' }}) ben je geschikt
            voor dit toernooi.</p>

        <p>Neem contact op met de judoclub om je deelname te bevestigen of af te zeggen.</p>

        <p>Veel succes en plezier!</p>

        <p>Met vriendelijke groet,<br>
            Het Judoclub Team</p>
    </div>

    <div class="footer">
        <p>Deze email is automatisch verzonden door het Judoclub Management Systeem.</p>
    </div>
</body>

</html>