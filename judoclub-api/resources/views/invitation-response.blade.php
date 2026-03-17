<!DOCTYPE html>
<html lang="nl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uitnodiging {{ $status === 'accepted' ? 'Bevestigd' : ($status === 'error' ? 'Gesloten' : 'Afgewezen') }}
    </title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }

        .status-icon {
            font-size: 60px;
            margin-bottom: 20px;
            animation: scaleIn 0.6s ease-out;
        }

        @keyframes scaleIn {
            from {
                transform: scale(0);
                opacity: 0;
            }

            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        h1 {
            font-size: 28px;
            margin-bottom: 12px;
            color: #1f2937;
        }

        .message {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 30px;
        }

        .tournament-info {
            background: #f3f4f6;
            border-left: 4px solid #2563eb;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 30px;
            text-align: left;
        }

        .tournament-info h3 {
            font-size: 14px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 6px;
        }

        .tournament-info p {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
        }

        .actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .btn {
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            border: none;
            transition: opacity 0.2s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .btn-primary {
            background: #2563eb;
            color: white;
        }

        .btn-secondary {
            background: #e5e7eb;
            color: #1f2937;
        }

        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
        }

        .success-color {
            color: #10b981;
        }

        .error-color {
            color: #ef4444;
        }

        .warning-color {
            color: #f59e0b;
        }
    </style>
</head>

<body>
    <div class="container">
        @if ($status === 'accepted')
            <div class="status-icon success-color">✓</div>
            <h1>Bedankt!</h1>
            <p class="message">Je inschrijving voor het toernooi is bevestigd.</p>

            @if ($tournament)
                <div class="tournament-info">
                    <h3>Toernooi</h3>
                    <p>{{ $tournament->name }}</p>
                    @if ($tournament->date)
                        <p style="margin-top: 8px; font-size: 14px; font-weight: normal; color: #6b7280;">
                            📅 {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}
                        </p>
                    @endif
                </div>
            @endif

            <p class="message" style="margin-bottom: 20px; color: #374151;">
                Zien we je op het toernooi! Voor vragen kun je contact opnemen met het Judoclub team.
            </p>
        @elseif ($status === 'error')
            <div class="status-icon warning-color">⚠️</div>
            <h1>Inschrijvingen gesloten</h1>
            <p class="message">{{ $message ?? 'Dit toernooi aanvaardt geen nieuwe inschrijvingen meer.' }}</p>

            @if ($tournament)
                <div class="tournament-info">
                    <h3>Toernooi</h3>
                    <p>{{ $tournament->name }}</p>
                    @if ($tournament->date)
                        <p style="margin-top: 8px; font-size: 14px; font-weight: normal; color: #6b7280;">
                            📅 {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}
                        </p>
                    @endif
                </div>
            @endif
        @else
            <div class="status-icon error-color">✕</div>
            <h1>Afgemeld</h1>
            <p class="message">Je hebt je afgemeld voor het toernooi.</p>

            @if ($tournament)
                <div class="tournament-info">
                    <h3>Toernooi</h3>
                    <p>{{ $tournament->name }}</p>
                    @if ($tournament->date)
                        <p style="margin-top: 8px; font-size: 14px; font-weight: normal; color: #6b7280;">
                            📅 {{ \Carbon\Carbon::parse($tournament->date)->format('d-m-Y') }}
                        </p>
                    @endif
                </div>
            @endif

            <p class="message" style="margin-bottom: 20px; color: #374151;">
                We hopen je op een ander moment op een toernooi te zien!
            </p>
        @endif

        <div class="footer">
            <p>Dit is een automatisch gegenereerd bericht van het Judoclub Management Systeem.</p>
        </div>
    </div>
</body>

</html>