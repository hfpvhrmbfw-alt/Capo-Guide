# Capo Guide

PWA für Gitarristen: Akkorde eines Lieds transponieren, Capo-Lagen mit leichteren Griffen finden und Griffbilder sehen, in Standard- und neun weiteren Stimmungen (Eb, D, Drop D, Drop C, DADGAD, Open G/D/E/C). Gestaltung: Castra, Stil Porto.

## Benutzen

- **Lied anlegen:** Plus-Knopf, Text einfügen. Akkorde entweder in eigene Zeilen über den Text oder in Klammern wie `[Am]` in den Text.
- **Transponieren:** Tonart mit − / + in Halbtönen verschieben. Original- und Zieltonart stehen oben.
- **Capo:** Die Vorschläge zeigen für dieselbe Klangtonart, mit welchem Capo und welcher Griff-Form es am leichtesten geht. Antippen übernimmt die Lage.
- **Griffe / Klang:** zeigt im Liedblatt entweder, was du greifst, oder wie es klingt (für die Band).
- **Stimmung:** je Lied wählbar. Bei „Halbton/Ganzton tiefer“ heißen die Griffe wie in Standardstimmung.
- **Akkorde:** einzelnen Akkord in jeder Stimmung und mit Capo nachschlagen.
- **Einstellungen:** Schreibweise B oder H, Stimmung für neue Lieder, Sicherung exportieren/importieren.

Alle Daten bleiben auf dem Gerät (IndexedDB). Ab und zu eine Sicherung exportieren.

## Aufbau

```
index.html, styles.css         Oberfläche (App-eigenes CSS)
porto/porto.css, porto/porto.js Castra Porto, unverändert aus dem Designsystem übernommen
src/model.js                    Stammdaten, Validierung, Export/Import
src/logic.js                    reine Musik-Logik (ohne DOM, Speicher, Uhr)
src/storage.js                  IndexedDB mit localStorage als Rückfall
src/texts.js                    alle Beschriftungen
src/ui.js, src/main.js          Ansichten und Aktionen
sw.js, manifest.webmanifest     PWA (offline)
tests/                          node --test, Testfälle als JSON
docs/SWIFT.md                   Weg nach Swift
```

## Starten und testen

ES-Module brauchen einen Server, `file://` geht nicht:

```
npx serve .        # oder: python3 -m http.server
npm test           # Logik-Tests, keine Abhängigkeiten
```

Bei jeder Änderung an Dateien `VERSION` in `sw.js` hochzählen, sonst laden installierte Apps die alten Dateien.

## Aufs iPhone

1. Ordner auf GitHub Pages (oder einen anderen HTTPS-Host) legen.
2. In Safari öffnen, „Teilen → Zum Home-Bildschirm“.
3. Vom Icon starten. Nach dem ersten Start läuft die App auch offline.

Grenzen auf dem iPhone: keine Mitteilungen ohne Server, Schriften erst nach dem ersten Laden mit Netz offline verfügbar (vorher Systemschrift).
