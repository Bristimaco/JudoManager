<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uitschrijving Bevestigd</title>
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
            background-color: #d97706;
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
            border-left: 4px solid #d97706;
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
        <h1>🥋 Uitschrijving Bevestigd</h1>
    </div>

    <div class="content">
        <p>Beste {{ $member->first_name }},</p>

        <p>Hierbij bevestigen we dat je <strong>uitgeschreven bent</strong> voor het volgende toernooi:</p>

        <div class="tournament-info">
            <h2>{{ $tournament->name }}</h2>
            @if($tournament->date)
                <p><strong>Datum:</strong> {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}</p>
            @endif
            @if($tournament->location)
                <p><strong>Locatie:</strong> {{ $tournament->location }}</p>
            @endif
        </div>

        <p>Je deelname aan dit toernooi is geannuleerd. Mocht je vragen hebben, neem dan contact op met de judoclub.</p>

        <p>Met vriendelijke groet,<br>
            Het Judoclub Team</p>
    </div>

    <div class="footer">
        <p>Deze email is automatisch verzonden door het Judoclub Management Systeem.</p>
    </div>
</body>

</html>