<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Toernooi Afmelding</title>
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
            background-color: #dc2626;
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
            border-left: 4px solid #dc2626;
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
        <h1>🥋 Toernooi Afmelding</h1>
    </div>

    <div class="content">
        <p>Beste {{ $member->first_name }},</p>

        <p>Hierbij laten we je weten dat je <strong>niet langer bent uitgenodigd</strong> voor het volgende toernooi:
        </p>

        <div class="tournament-info">
            <h2>{{ $tournament->name }}</h2>
            @if($tournament->date)
                <p><strong>Datum:</strong> {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}</p>
            @endif
            @if($tournament->location)
                <p><strong>Locatie:</strong> {{ $tournament->location }}</p>
            @endif
        </div>

        <p>Je uitnodiging voor dit toernooi is ingetrokken door de organisatie. Dit kan verschillende redenen hebben,
            zoals wijzigingen in de tournament planning of criteria.</p>

        <p>Mocht je vragen hebben over deze afmelding, neem dan contact op met de judoclub voor meer informatie.</p>

        <p>Met vriendelijke groet,<br>
            Het Judoclub Team</p>
    </div>

    <div class="footer">
        <p>Deze email is automatisch verzonden door het Judoclub Management Systeem.</p>
    </div>
</body>

</html>