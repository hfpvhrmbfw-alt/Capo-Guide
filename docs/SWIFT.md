# Capo Guide in Swift

Die PWA ist so geschnitten, dass Modell, Logik und Testfälle 1:1 nach Swift wandern.

| Datei | Schicht | In Swift |
|---|---|---|
| `src/model.js` | Modell: Stimmungen, Akkordarten, Lied, Validierung, Export/Import | 1:1: `enum`/`struct`, `Codable` |
| `src/logic.js` | Logik: Akkorde lesen, transponieren, Tonart, Griffsuche, Capo-Rangliste | 1:1 als reine Funktionen |
| `tests/fixtures/*.json` | Testfälle | unverändert in XCTest laden |
| `src/storage.js` | Speicher (IndexedDB) | neu: SwiftData oder JSON-Datei |
| `src/texts.js` | Beschriftungen | neu: String Catalog |
| `src/ui.js`, `src/main.js`, `styles.css`, `porto/` | Oberfläche (Castra Porto) | neu: SwiftUI |

## Datentypen (Skizze)

```swift
struct Tuning { let id: String; let strings: [Int]; let offset: Int }        // MIDI-Noten tief → hoch
struct Chord { let root: Int; let suffix: String; let quality: String?; let bass: Int? }
struct Voicing { let frets: [Int?]; let fingers: Int; let barre: Int?; let score: Double; let level: String }
struct Song: Codable { let id: String; var title, artist, text: String
  var transpose: Int; var capo: Int; var tuning: String; var createdAt, updatedAt: String }
```

## Regeln

- Klang = geschriebener Akkord + `transpose`. Griff = Klang − `capo` − `tuning.offset`.
- Tonhöhen als Zahl 0–11 (0 = C). Schreibweise (# oder b, B oder H) entscheidet nur die Anzeige.
- Zeitstempel als ISO-String, nur in der Oberfläche erzeugt.
- Austauschformat: JSON `{ app: "capo-guide", version: 1, exportedAt, settings, songs }`. Neuere Versionen werden abgelehnt.
