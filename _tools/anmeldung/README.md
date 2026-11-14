# Wochen-Anmeldung

Quelle: `src/anmeldung.mjs`. Netlify veröffentlicht diesen Ordner als Website, deshalb liegt im Projektwurzelordner kein package.json.
Die Funktion wird vorab zu einer Datei ohne Abhängigkeiten gebündelt:

    cd _tools/anmeldung && npm install
    npx esbuild src/anmeldung.mjs --bundle --platform=node --format=esm --target=node18 --outfile=../../netlify/functions/anmeldung.mjs

Netlify-Umgebungsvariable: `ANMELDUNG_KEY` (mindestens 12 Zeichen), Schlüssel für /anmeldung-liste.
Daten: Netlify Blobs, Store `wochen-anmeldung`. Anmeldungen werden nach 28 Tagen gelöscht, Karten (Schlüssel `karten`) 6 Monate nach Ablauf. Karten-Abbuchungen werden aus den gespeicherten Stunden neu berechnet, solange diese noch da sind.
