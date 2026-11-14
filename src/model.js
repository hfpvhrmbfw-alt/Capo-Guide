// Modell: Stammdaten, Validierung, Export/Import. Keine Abhängigkeiten, keine Anzeigetexte.

export const SCHEMA_VERSION = 1;
export const APP_ID = 'capo-guide';

/** Notenschreibweise: international (B = h) oder deutsch (H = h, B = b). */
export const NOTATIONS = ['int', 'de'];

/**
 * Gitarrenstimmungen. `strings`: MIDI-Noten der leeren Saiten von tief nach hoch, in der Grundstimmung.
 * `offset`: ganze Stimmung tiefer gestimmt (z. B. -1 = Halbton tiefer). Griffe und Griffnamen gelten dann
 * wie in der Grundstimmung, der Klang liegt `offset` Halbtöne tiefer (so denken Gitarristen bei Eb-Stimmung).
 * IDs nie umbenennen, nur ergänzen.
 * @typedef {{id:string, strings:number[], offset:number}} Tuning
 */
export const TUNINGS = [
  { id: 'standard', strings: [40, 45, 50, 55, 59, 64], offset: 0 },
  { id: 'eb',       strings: [40, 45, 50, 55, 59, 64], offset: -1 },
  { id: 'd',        strings: [40, 45, 50, 55, 59, 64], offset: -2 },
  { id: 'dropd',    strings: [38, 45, 50, 55, 59, 64], offset: 0 },
  { id: 'dropc',    strings: [38, 45, 50, 55, 59, 64], offset: -2 },
  { id: 'dadgad',   strings: [38, 45, 50, 55, 57, 62], offset: 0 },
  { id: 'openg',    strings: [38, 43, 50, 55, 59, 62], offset: 0 },
  { id: 'opend',    strings: [38, 45, 50, 54, 57, 62], offset: 0 },
  { id: 'opene',    strings: [40, 47, 52, 56, 59, 64], offset: 0 },
  { id: 'openc',    strings: [36, 43, 48, 55, 60, 64], offset: 0 },
];
export const tuningById = id => TUNINGS.find(t => t.id === id) || TUNINGS[0];

/**
 * Akkordarten: Intervalle über dem Grundton. `opt`: Töne, die ein Griff weglassen darf (meist die Quinte).
 * Reihenfolge der Schreibweisen: die erste ist die Standardschreibweise.
 */
export const QUALITIES = [
  { id: 'dur',    names: [''],                     tones: [0, 4, 7],        opt: [7] },
  { id: 'moll',   names: ['m', 'min', '-'],        tones: [0, 3, 7],        opt: [7] },
  { id: '7',      names: ['7'],                    tones: [0, 4, 7, 10],    opt: [7] },
  { id: 'maj7',   names: ['maj7', 'M7', 'Δ', 'j7', 'Maj7'], tones: [0, 4, 7, 11], opt: [7] },
  { id: 'm7',     names: ['m7', 'min7', '-7'],     tones: [0, 3, 7, 10],    opt: [7] },
  { id: 'mmaj7',  names: ['mmaj7', 'mM7', 'm(maj7)'], tones: [0, 3, 7, 11], opt: [7] },
  { id: '6',      names: ['6'],                    tones: [0, 4, 7, 9],     opt: [7] },
  { id: 'm6',     names: ['m6'],                   tones: [0, 3, 7, 9],     opt: [7] },
  { id: '9',      names: ['9'],                    tones: [0, 4, 7, 10, 2], opt: [7] },
  { id: 'm9',     names: ['m9'],                   tones: [0, 3, 7, 10, 2], opt: [7] },
  { id: 'maj9',   names: ['maj9'],                 tones: [0, 4, 7, 11, 2], opt: [7] },
  { id: 'add9',   names: ['add9', 'add2'],         tones: [0, 4, 7, 2],     opt: [7] },
  { id: 'madd9',  names: ['madd9', 'madd2'],       tones: [0, 3, 7, 2],     opt: [7] },
  { id: 'sus2',   names: ['sus2'],                 tones: [0, 2, 7],        opt: [] },
  { id: 'sus4',   names: ['sus4', 'sus'],          tones: [0, 5, 7],        opt: [] },
  { id: '7sus4',  names: ['7sus4', '7sus'],        tones: [0, 5, 7, 10],    opt: [7] },
  { id: 'dim',    names: ['dim', '°', 'o'],        tones: [0, 3, 6],        opt: [] },
  { id: 'dim7',   names: ['dim7', '°7', 'o7'],     tones: [0, 3, 6, 9],     opt: [] },
  { id: 'm7b5',   names: ['m7b5', 'ø', 'ø7', 'm7(b5)'], tones: [0, 3, 6, 10], opt: [] },
  { id: 'aug',    names: ['aug', '+'],             tones: [0, 4, 8],        opt: [] },
  { id: '5',      names: ['5'],                    tones: [0, 7],           opt: [] },
];
const QUALITY_BY_NAME = new Map(QUALITIES.flatMap(q => q.names.map(n => [n, q])));
export const qualityByName = name => QUALITY_BY_NAME.get(name) || null;

export const DEFAULT_SETTINGS = { notation: 'int', tuning: 'standard' };

/**
 * @typedef {{id:string, title:string, artist:string, text:string, transpose:number, capo:number,
 *   tuning:string, createdAt:string, updatedAt:string}} Song
 */

/** Neues leeres Lied. `id` und `now` (ISO-Zeit) kommen von außen. */
export function emptySong(id, now, tuning = 'standard') {
  return { id, title: '', artist: '', text: '', transpose: 0, capo: 0, tuning, createdAt: now, updatedAt: now };
}

const str = (v, max) => (typeof v === 'string' ? v : '').slice(0, max);
const int = (v, lo, hi, dflt) => (Number.isInteger(v) && v >= lo && v <= hi ? v : dflt);

/** @returns {Song|null} */
export function sanitizeSong(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id.slice(0, 64),
    title: str(raw.title, 200),
    artist: str(raw.artist, 200),
    text: str(raw.text, 50000),
    transpose: int(raw.transpose, -11, 11, 0),
    capo: int(raw.capo, 0, 11, 0),
    tuning: TUNINGS.some(t => t.id === raw.tuning) ? raw.tuning : 'standard',
    createdAt: str(raw.createdAt, 40),
    updatedAt: str(raw.updatedAt, 40),
  };
}

export function sanitizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    notation: NOTATIONS.includes(r.notation) ? r.notation : DEFAULT_SETTINGS.notation,
    tuning: TUNINGS.some(t => t.id === r.tuning) ? r.tuning : DEFAULT_SETTINGS.tuning,
  };
}

/** Ältere Datenformen auf den aktuellen Stand heben. Idempotent. Bisher gibt es nur Version 1. */
export function upgradeRaw(raw) {
  return raw;
}

/** Export-Objekt. `now` = ISO-Zeitstempel von außen. */
export function buildExport(songs, settings, now) {
  return { app: APP_ID, version: SCHEMA_VERSION, exportedAt: now, settings, songs };
}

/** @returns {{ok:true, songs:Song[], settings:object} | {ok:false, error:string}} */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, error: 'json' }; }
  if (!data || data.app !== APP_ID) return { ok: false, error: 'app' };
  if (!Number.isInteger(data.version) || data.version < 1) return { ok: false, error: 'version' };
  if (data.version > SCHEMA_VERSION) return { ok: false, error: 'newer' };
  data = upgradeRaw(data);
  const songs = (Array.isArray(data.songs) ? data.songs : []).map(sanitizeSong).filter(Boolean);
  return { ok: true, songs, settings: sanitizeSettings(data.settings) };
}
