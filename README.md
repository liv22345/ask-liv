# Frag Liv – KI-Agent zu Liv Wohralik

Ein kleiner KI-Agent, der Fragen zu Livs Lebenslauf beantwortet. Er liest über ein Tool gezielt Abschnitte aus ihrem Profil und erfindet keine Antworten.

## Aufbau
- `index.html` – die Seite mit dem Chat
- `api/chat.js` – Serverless-Funktion, die die Claude API aufruft (Tool Use mit `get_section`)

## Sicherheit
- Der API-Schlüssel liegt nur als Umgebungsvariable `ANTHROPIC_API_KEY` bei Vercel, nie im Repository.
- Begrenzung: 500 Zeichen pro Frage, 12 Nachrichten pro Gespräch, 30 Fragen pro Stunde und IP, max. 400 Tokens pro Antwort.
