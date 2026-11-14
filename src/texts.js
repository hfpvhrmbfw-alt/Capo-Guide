// Texte der Oberfläche zu den IDs aus dem Modell. Später in Swift: String Catalog.

export const TUNING_SHORT = {
  standard: 'Standard', eb: 'Eb', d: 'D-Stimmung', dropd: 'Drop D', dropc: 'Drop C',
  dadgad: 'DADGAD', openg: 'Open G', opend: 'Open D', opene: 'Open E', openc: 'Open C',
};
export const NOTATION_NAMES = { int: 'International (B)', de: 'Deutsch (H)' };
export const LEVEL_NAMES = { leicht: 'leicht', mittel: 'mittel', schwer: 'schwer', ohne: 'ohne Griff' };

export const IMPORT_ERRORS = {
  json: 'Die Datei ist keine gültige Sicherung.',
  app: 'Die Datei stammt nicht aus Capo Guide.',
  version: 'Die Datei hat kein gültiges Format.',
  newer: 'Die Sicherung stammt aus einer neueren Version von Capo Guide. Bitte zuerst die App aktualisieren.',
};

export const T = {
  appName: 'Capo Guide',
  songs: 'Lieder',
  chords: 'Akkorde',
  settings: 'Einstellungen',
  newSong: 'Neues Lied',
  untitled: 'Ohne Titel',
  emptyTitle: 'Noch keine Lieder',
  emptyText: 'Füge ein Lied mit Akkorden ein. Capo Guide transponiert es, schlägt Capo-Lagen vor und zeigt die Griffe, auch in anderen Stimmungen.',
  demo: 'Beispiel laden',
  original: 'Original',
  sounds: 'Klingt in',
  capo: 'Capo',
  key: 'Tonart',
  tuning: 'Stimmung',
  noCapo: 'ohne',
  suggestions: 'Capo-Vorschläge',
  suggestionsHint: 'Gleiche Tonart, andere Griffe. Antippen übernimmt die Lage.',
  active: 'gewählt',
  take: 'wählen',
  showShapes: 'Griffe',
  showSound: 'Klang',
  shapesHint: 'Zeigt, was du greifst.',
  soundHint: 'Zeigt, wie es klingt, z. B. für die Band.',
  grips: 'Griffbilder',
  noGrip: 'kein Griff gefunden',
  unknownChord: 'Akkordart unbekannt, nur transponiert',
  edit: 'Bearbeiten',
  save: 'Speichern',
  cancel: 'Abbrechen',
  delete: 'Lied löschen',
  confirmDelete: 'Dieses Lied wirklich löschen?',
  copy: 'Text kopieren',
  copied: 'Kopiert',
  title: 'Titel',
  artist: 'Interpret',
  text: 'Text mit Akkorden',
  textHint: 'Akkorde in eigene Zeilen über den Text schreiben oder in Klammern wie [Am] in den Text.',
  noChords: 'In diesem Text wurden noch keine Akkorde erkannt.',
  chordLookup: 'Akkord nachschlagen',
  chordInput: 'Akkord, z. B. F#m7 oder D/F#',
  chordInvalid: 'Diesen Akkord kenne ich nicht.',
  notation: 'Notenschreibweise',
  defaultTuning: 'Stimmung für neue Lieder',
  backup: 'Sicherung',
  backupHint: 'Deine Lieder liegen nur auf diesem Gerät. Exportiere ab und zu eine Sicherung.',
  export: 'Exportieren',
  import: 'Importieren',
  imported: n => `${n} ${n === 1 ? 'Lied' : 'Lieder'} importiert.`,
  confirmImport: n => `${n} ${n === 1 ? 'Lied' : 'Lieder'} aus der Sicherung übernehmen? Lieder mit gleicher Kennung werden ersetzt.`,
  back: 'Zurück',
  transposeDown: 'Halbton tiefer',
  transposeUp: 'Halbton höher',
  capoDown: 'Capo tiefer',
  capoUp: 'Capo höher',
  reset: 'Zurücksetzen',
  songCount: n => `${n} ${n === 1 ? 'Lied' : 'Lieder'}`,
  semis: n => (n === 0 ? '±0' : (n > 0 ? '+' : '−') + Math.abs(n)),
  shapeOf: name => `${name}-Form`,
  counts: c => [c.leicht && `${c.leicht} leicht`, c.mittel && `${c.mittel} mittel`, c.schwer && `${c.schwer} schwer`, c.ohne && `${c.ohne} ohne Griff`].filter(Boolean).join(' · '),
  fret: n => `${n}. Bund`,
  designNote: 'Gestaltung: Castra, Stil Porto.',
};

export const DEMO = {
  title: 'Beispiel-Lied',
  artist: 'Capo Guide',
  text: `[Strophe]
Ab        Fm         Db        Eb
Hier steht dein Text unter den Akkorden
Ab        Fm         Db   Eb   Ab
Capo Guide findet die leichtesten Griffe

[Refrain]
[Db]Oder schreib die [Eb]Akkorde in [Ab]Klammern
[Fm]direkt in den [Db]Text, so [Eb]wie hier`,
};
