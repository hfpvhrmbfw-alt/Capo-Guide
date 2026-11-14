// Logik: reine Funktionen. Kein DOM, kein Speicher, keine Uhr. Ergebnisse sind Daten.
import { qualityByName, QUALITIES } from './model.js';

const mod12 = n => ((n % 12) + 12) % 12;

// ---------- Noten und Akkordnamen ----------

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
const ACC = { '#': 1, '♯': 1, b: -1, '♭': -1 };
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_MAJOR_KEYS = [5, 10, 3, 8, 1]; // F, Bb, Eb, Ab, Db

/** Tonhöhenklasse (0 = C) eines Notennamens, sonst null. `notation`: 'int' oder 'de'. */
export function parseNote(letter, acc, notation) {
  if (!(letter in LETTER)) return null;
  if (letter === 'H' && notation !== 'de') return null;
  // Deutsch: B ohne Vorzeichen ist b (10); „Bb“ wird wie international gelesen.
  const base = notation === 'de' && letter === 'B' && !acc ? 10 : LETTER[letter];
  return mod12(base + (acc ? ACC[acc] : 0));
}

/** Notenname einer Tonhöhenklasse. */
export function noteName(pc, flats, notation) {
  pc = mod12(pc);
  if (notation === 'de') {
    if (pc === 11) return 'H';
    if (pc === 10 && flats) return 'B';
  }
  return (flats ? FLATS : SHARPS)[pc];
}

/** Soll eine Tonart mit b statt # geschrieben werden? */
export function prefersFlats(tonic, minor) {
  return FLAT_MAJOR_KEYS.includes(mod12(minor ? tonic + 3 : tonic));
}

// Zusätze, die keine bekannte Akkordart sind, aber sicher wie Akkorde aussehen (7b9, m11, maj7#11, 13 …).
const EXT = /^(maj|min|m|M|dim|aug|sus|add|\+|°|ø|Δ)?(\d{1,2})?((add|sus|maj|[#b+\-])\d{1,2}|\((?:[#b+\-]?\d{1,2},?)+\))*$/;
const CHORD = /^([A-H])([#♯b♭])?(.*?)(?:\/([A-H])([#♯b♭])?)?$/;

/**
 * @typedef {{root:number, suffix:string, quality:string|null, bass:number|null}} Chord
 * `quality` ist die ID aus QUALITIES oder null, wenn der Zusatz unbekannt ist (dann kein Griffbild).
 */
/** @returns {Chord|null} */
export function parseChord(token, notation = 'int') {
  const m = CHORD.exec(token);
  if (!m) return null;
  const root = parseNote(m[1], m[2], notation);
  if (root === null) return null;
  const suffix = m[3];
  const q = qualityByName(suffix);
  if (!q && !EXT.test(suffix)) return null;
  let bass = null;
  if (m[4]) { bass = parseNote(m[4], m[5], notation); if (bass === null) return null; }
  return { root, suffix, quality: q ? q.id : null, bass };
}

export function transposeChord(chord, shift) {
  return { ...chord, root: mod12(chord.root + shift), bass: chord.bass === null ? null : mod12(chord.bass + shift) };
}

export function chordName(chord, flats, notation) {
  return noteName(chord.root, flats, notation) + chord.suffix + (chord.bass === null ? '' : '/' + noteName(chord.bass, flats, notation));
}

// ---------- Liedtext ----------

const PASS = /^(\|+|\/|-|–|%|\.\.\.|x\d+|\(x\d+\)|\d+x|N\.?C\.?|\*)$/i;
const WRAP = /^(\(?)(.*?)(\)?)$/;
const PRO = /\[([^\]\n]+)\]/g;

function chordToken(tok, notation) {
  const [, open, inner, close] = WRAP.exec(tok);
  const c = parseChord(inner, notation);
  return c ? { open, close, chord: c } : null;
}

/** Ist die Zeile eine reine Akkordzeile (nur Akkorde und Taktzeichen, mindestens ein Akkord)? */
export function isChordLine(line, notation) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  let n = 0;
  for (const t of toks) {
    if (chordToken(t, notation)) n++;
    else if (!PASS.test(t)) return false;
  }
  return n > 0;
}

/**
 * Alle Akkorde eines Liedtexts in Reihenfolge (aus Akkordzeilen und [ChordPro]-Klammern).
 * @returns {Chord[]}
 */
export function extractChords(text, notation) {
  const out = [];
  for (const line of text.split('\n')) {
    if (isChordLine(line, notation)) {
      for (const t of line.trim().split(/\s+/)) { const c = chordToken(t, notation); if (c) out.push(c.chord); }
    } else {
      for (const m of line.matchAll(PRO)) { const c = parseChord(m[1].trim(), notation); if (c) out.push(c); }
    }
  }
  return out;
}

/** Verschiedene Akkorde (gleicher Grundton, Zusatz und Bass), in Reihenfolge des ersten Auftretens. */
export function distinctChords(chords) {
  const seen = new Set(), out = [];
  for (const c of chords) { const k = c.root + '|' + c.suffix + '|' + c.bass; if (!seen.has(k)) { seen.add(k); out.push(c); } }
  return out;
}

/**
 * Liedtext transponiert in Zeilen mit Abschnitten. Akkordzeilen behalten ihre Spalten, so gut es geht.
 * @typedef {{s:string, chord?:Chord}} Seg  (chord = transponierter Akkord, s = sein Name bzw. der Text)
 * @returns {{kind:'chords'|'text', segs:Seg[]}[]}
 */
export function renderSong(text, shift, flats, notation) {
  return text.split('\n').map(line => {
    if (isChordLine(line, notation)) {
      const segs = []; let out = 0;
      for (const m of line.matchAll(/\S+/g)) {
        const col = m.index;
        const gap = out === 0 ? col : Math.max(1, col - out);
        if (gap) segs.push({ s: ' '.repeat(gap) });
        out += gap;
        const ct = chordToken(m[0], notation);
        if (ct) {
          const c = transposeChord(ct.chord, shift), name = chordName(c, flats, notation);
          if (ct.open) segs.push({ s: ct.open });
          segs.push({ s: name, chord: c });
          if (ct.close) segs.push({ s: ct.close });
          out += ct.open.length + name.length + ct.close.length;
        } else { segs.push({ s: m[0] }); out += m[0].length; }
      }
      return { kind: 'chords', segs };
    }
    const segs = []; let last = 0;
    for (const m of line.matchAll(PRO)) {
      const c = parseChord(m[1].trim(), notation);
      if (!c) continue;
      if (m.index > last) segs.push({ s: line.slice(last, m.index) });
      const t = transposeChord(c, shift);
      segs.push({ s: chordName(t, flats, notation), chord: t });
      last = m.index + m[0].length;
    }
    if (last < line.length || !segs.length) segs.push({ s: line.slice(last) });
    return { kind: 'text', segs };
  });
}

/** Liedtext als reiner Text (für Kopieren/Teilen), transponiert. */
export function songToText(text, shift, flats, notation) {
  return renderSong(text, shift, flats, notation)
    .map(l => l.segs.map(g => (g.chord && l.kind === 'text' ? '[' + g.s + ']' : g.s)).join('')).join('\n');
}

// ---------- Tonart ----------

const MAJOR_DEGREES = { 0: 'maj', 2: 'min', 4: 'min', 5: 'maj', 7: 'maj', 9: 'min', 11: 'dim' };
const FAMILY = { dur: 'maj', '7': 'maj', maj7: 'maj', '6': 'maj', '9': 'maj', maj9: 'maj', add9: 'maj',
  moll: 'min', m7: 'min', m6: 'min', m9: 'min', madd9: 'min', mmaj7: 'min',
  dim: 'dim', dim7: 'dim', m7b5: 'dim', aug: 'aug', sus2: 'any', sus4: 'any', '7sus4': 'any', '5': 'any' };
const family = c => FAMILY[c.quality] || (/^m(?!aj)/.test(c.suffix) ? 'min' : 'maj');

/**
 * Wahrscheinlichste Tonart nach den Akkorden.
 * @returns {{tonic:number, minor:boolean}|null}
 */
export function detectKey(chords) {
  if (!chords.length) return null;
  const first = chords[0], last = chords[chords.length - 1];
  let best = null;
  for (let k = 0; k < 12; k++) {
    let score = 0;
    for (const c of chords) {
      const deg = MAJOR_DEGREES[mod12(c.root - k)], f = family(c);
      if (deg && (f === deg || f === 'any' || (deg === 'maj' && c.quality === '7' && mod12(c.root - k) === 7))) score += 1;
    }
    for (const [c, w] of [[first, 2], [last, 1]]) {
      const d = mod12(c.root - k), f = family(c);
      if ((d === 0 && f !== 'min') || (d === 9 && f === 'min')) score += w;
    }
    if (!best || score > best.score) best = { k, score };
  }
  const minor = family(first) === 'min' && mod12(first.root - best.k) === 9;
  return { tonic: minor ? mod12(best.k + 9) : best.k, minor };
}

// ---------- Griffe ----------

export const LEVELS = ['leicht', 'mittel', 'schwer'];
const levelOf = score => (score <= 4 ? 'leicht' : score <= 6 ? 'mittel' : 'schwer');

/**
 * Ein Griff: `frets` je Saite von tief nach hoch (null = nicht anschlagen, 0 = leer), relativ zum Sattel bzw. Capo.
 * @typedef {{frets:(number|null)[], fingers:number, barre:number|null, score:number, level:string}} Voicing
 */

const cache = new Map();

/**
 * Die besten Griffe eines Akkords auf einer Gitarre mit den Saiten `strings` (MIDI-Noten).
 * Durchsucht jedes Fenster von vier Bünden (Bund 1 bis 13) mit Leersaiten.
 * @param {Chord} chord  @param {number[]} strings  @returns {Voicing[]} beste zuerst, höchstens `max`
 */
export function findVoicings(chord, strings, max = 3) {
  const q = QUALITY_TONES[chord.quality];
  if (!q) return [];
  const key = strings.join(',') + '|' + chord.root + '|' + chord.quality + '|' + chord.bass + '|' + max;
  if (cache.has(key)) return cache.get(key);

  const tones = q.tones.map(t => mod12(chord.root + t));
  const allowed = new Set(tones);
  if (chord.bass !== null) allowed.add(chord.bass);
  const required = q.tones.filter(t => !q.opt.includes(t)).map(t => mod12(chord.root + t));
  const optional = q.opt.map(t => mod12(chord.root + t));
  const minStrings = q.tones.length <= 2 ? 3 : 4;
  const found = [];

  for (let base = 1; base <= 10; base++) {
    const opts = strings.map(s => {
      const o = [null];
      if (allowed.has(mod12(s))) o.push(0);
      for (let f = base; f < base + 4; f++) if (allowed.has(mod12(s + f))) o.push(f);
      return o;
    });
    const frets = [];
    (function walk(i, allMuted) {
      if (i === strings.length) { const v = rate(frets, strings, base, chord, required, optional, minStrings); if (v) found.push(v); return; }
      for (const f of opts[i]) {
        if (f === null && !allMuted) continue; // nur tiefe Saiten dürfen stumm sein
        frets[i] = f; walk(i + 1, allMuted && f === null);
      }
    })(0, true);
  }
  found.sort((a, b) => a.score - b.score || minFret(a) - minFret(b));
  const out = [], seen = new Set();
  for (const v of found) { const k = v.frets.join(','); if (!seen.has(k)) { seen.add(k); out.push(v); } if (out.length === max) break; }
  cache.set(key, out);
  return out;
}

const minFret = v => Math.min(99, ...v.frets.filter(f => f > 0));

const QUALITY_TONES = {};
for (const q of QUALITIES) QUALITY_TONES[q.id] = q;

function rate(frets, strings, base, chord, required, optional, minStrings) {
  const sounding = [];
  for (let i = 0; i < frets.length; i++) if (frets[i] !== null) sounding.push(i);
  if (sounding.length < minStrings) return null;
  const fretted = sounding.filter(i => frets[i] > 0).map(i => frets[i]);
  const lo = fretted.length ? Math.min(...fretted) : 0, hi = fretted.length ? Math.max(...fretted) : 0;
  if (fretted.length ? lo !== base : base !== 1) return null; // jedes Fenster nur einmal zählen

  const pcs = sounding.map(i => mod12(strings[i] + frets[i]));
  const bassPc = pcs[0];
  let score = 0;
  if (chord.bass !== null) { if (bassPc !== chord.bass) return null; }
  else if (bassPc !== chord.root) { if (bassPc === mod12(chord.root + 7)) score += 1.5; else return null; }
  const have = new Set(pcs);
  if (!required.every(t => have.has(t))) return null;
  score += optional.filter(t => !have.has(t)).length * 0.5;

  // Finger zählen; bei mehr als vier gegriffenen Tönen Barré im untersten Bund versuchen.
  let fingers = fretted.length, barre = null;
  if (fingers > 4) {
    const firstLo = sounding.find(i => frets[i] === lo);
    const blocked = sounding.some(i => i > firstLo && frets[i] === 0);
    const above = fretted.filter(f => f > lo).length;
    if (blocked || above + 1 > 4) return null;
    fingers = above + 1; barre = lo;
  }
  // Stumme Saiten machen den Klang dünner; unnötig, wenn die leere Saite selbst der Basston wäre.
  const want = chord.bass ?? chord.root;
  for (let i = 0; i < sounding[0]; i++) score += mod12(strings[i]) === want ? 1.9 : 0.4;
  score += fingers + (barre ? 2.5 : 0) + Math.max(0, hi - 3) * 0.5 + (hi - lo >= 3 ? 1 : 0);
  score = Math.round(score * 100) / 100;
  return { frets: frets.slice(), fingers, barre, score, level: levelOf(score) };
}

/** Bester Griff oder null. */
export const bestVoicing = (chord, strings) => findVoicings(chord, strings, 1)[0] || null;

// ---------- Capo ----------

/**
 * Bewertet jede Capo-Lage für ein Lied in einer Stimmung.
 * `sounding`: verschiedene Akkorde in Klanghöhe. Griff = Klang − Capo − Stimmungsversatz.
 * @param {Chord[]} sounding  @param {{strings:number[], offset:number}} tuning  @param {{tonic:number, minor:boolean}|null} key
 * @returns {{capo:number, total:number, counts:{leicht:number, mittel:number, schwer:number, ohne:number}, shapeKey:number|null}[]}
 *   sortiert, leichteste zuerst
 */
export function rankCapos(sounding, tuning, key, maxCapo = 9) {
  const res = [];
  for (let capo = 0; capo <= maxCapo; capo++) {
    const counts = { leicht: 0, mittel: 0, schwer: 0, ohne: 0 };
    let total = 0;
    for (const c of sounding) {
      if (!c.quality) continue; // unbekannte Akkordart: in jeder Lage gleich, zählt nicht
      const v = bestVoicing(transposeChord(c, -capo - tuning.offset), tuning.strings);
      if (v) { counts[v.level]++; total += v.score; } else { counts.ohne++; total += 9; }
    }
    total += capo * 0.05; // bei Gleichstand die tiefere Lage
    res.push({ capo, total: Math.round(total * 100) / 100, counts, shapeKey: key ? mod12(key.tonic - capo - tuning.offset) : null });
  }
  return res.sort((a, b) => a.total - b.total || a.capo - b.capo);
}

/**
 * Was die Hand greift: Verschiebung vom geschriebenen Akkord zum Griffnamen.
 * Klang = geschrieben + transpose; Griff = Klang − capo − offset.
 */
export const shapeShift = (transpose, capo, offset) => transpose - capo - offset;
