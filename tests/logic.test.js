import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../src/logic.js';
import { TUNINGS, QUALITIES, tuningById, parseImport, buildExport, sanitizeSong, emptySong } from '../src/model.js';

const fx = name => JSON.parse(readFileSync(new URL('./fixtures/' + name, import.meta.url)));

test('Akkorde lesen', () => {
  assert.deepEqual(L.parseChord('F#m7'), { root: 6, suffix: 'm7', quality: 'm7', bass: null });
  assert.deepEqual(L.parseChord('D/F#'), { root: 2, suffix: '', quality: 'dur', bass: 6 });
  assert.equal(L.parseChord('Bb').root, 10);
  assert.equal(L.parseChord('C7b9').quality, null); // erkannt, aber ohne Griffbild
  assert.equal(L.parseChord('Bad'), null);
  assert.equal(L.parseChord('H7'), null);
  assert.equal(L.parseChord('H7', 'de').root, 11);
  assert.equal(L.parseChord('B', 'de').root, 10);
});

test('Liedtexte transponieren', () => {
  for (const c of fx('songs.json')) assert.equal(L.songToText(c.text, c.shift, c.flats, c.notation), c.expected, c.name);
});

test('Hin und zurück ergibt dasselbe', () => {
  const t = 'G  D/F#  Em7  Cadd9\n[Am]la [E7]la';
  assert.equal(L.songToText(L.songToText(t, 5, false, 'int'), -5, false, 'int'), t);
});

test('Tonart erkennen', () => {
  const k = s => L.detectKey(L.extractChords(s, 'int'));
  assert.deepEqual(k('G D Em C G'), { tonic: 7, minor: false });
  assert.deepEqual(k('Am F C G Am'), { tonic: 9, minor: true });
  assert.deepEqual(k('E A B7 E'), { tonic: 4, minor: false });
  assert.deepEqual(k('Dm Bb C Dm'), { tonic: 2, minor: true });
  assert.equal(k(''), null);
});

test('b oder # nach Tonart', () => {
  assert.equal(L.prefersFlats(5, false), true);  // F-Dur
  assert.equal(L.prefersFlats(2, true), true);   // d-Moll
  assert.equal(L.prefersFlats(7, false), false); // G-Dur
});

test('Bekannte Griffe werden gefunden', () => {
  const f = fx('voicings.json');
  for (const [tid, chords] of Object.entries(f)) {
    if (tid.startsWith('_')) continue;
    for (const [name, frets] of Object.entries(chords)) {
      assert.deepEqual(L.bestVoicing(L.parseChord(name), tuningById(tid).strings).frets, frets, tid + ' ' + name);
    }
  }
});

test('Jeder Griff klingt nach dem Akkord', () => {
  for (const t of TUNINGS) for (const q of QUALITIES) for (let root = 0; root < 12; root++) {
    const chord = { root, suffix: q.names[0], quality: q.id, bass: null };
    for (const v of L.findVoicings(chord, t.strings, 3)) {
      const pcs = v.frets.map((f, i) => (f === null ? null : (t.strings[i] + f) % 12)).filter(p => p !== null);
      const tones = q.tones.map(x => (root + x) % 12);
      assert.ok(pcs.every(p => tones.includes(p)), `${t.id} ${root}${q.id} ${v.frets}`);
      assert.ok(q.tones.filter(x => !q.opt.includes(x)).every(x => pcs.includes((root + x) % 12)));
      assert.ok(v.fingers <= 4);
    }
  }
});

test('Capo: Ab-Dur geht am leichtesten mit Capo 1 in G-Form', () => {
  const ch = L.distinctChords(L.extractChords('Ab Fm Db Eb', 'int'));
  const best = L.rankCapos(ch, tuningById('standard'), { tonic: 8, minor: false })[0];
  assert.equal(best.capo, 1);
  assert.equal(best.shapeKey, 7);
  assert.equal(best.counts.leicht, 4);
});

test('Capo: Halbton tiefer gestimmt, Eb-Lied', () => {
  const ch = L.distinctChords(L.extractChords('Eb Ab Bb Eb', 'int'));
  const r = L.rankCapos(ch, tuningById('eb'), { tonic: 3, minor: false });
  assert.equal(r.find(x => x.capo === 0).shapeKey, 4); // ohne Capo: E-Form
  assert.equal(r[0].capo, 2); // am leichtesten: Capo 2, D-Form (D G A statt E A B mit Barré)
  assert.equal(r[0].shapeKey, 2);
});

test('Griffverschiebung', () => {
  assert.equal(L.shapeShift(2, 2, 0), 0);
  assert.equal(L.shapeShift(0, 0, -1), 1);
});

test('Import und Export', () => {
  const s = emptySong('a1', '2026-11-14T10:00:00Z');
  const ex = buildExport([s], { notation: 'de', tuning: 'dropd' }, '2026-11-14T10:00:00Z');
  const r = parseImport(JSON.stringify(ex));
  assert.equal(r.ok, true); assert.deepEqual(r.songs, [s]); assert.equal(r.settings.tuning, 'dropd');
  assert.deepEqual(parseImport('kaputt'), { ok: false, error: 'json' });
  assert.deepEqual(parseImport(JSON.stringify({ ...ex, version: 99 })), { ok: false, error: 'newer' });
  assert.deepEqual(parseImport(JSON.stringify({ ...ex, app: 'x' })), { ok: false, error: 'app' });
  assert.equal(sanitizeSong({ id: 'x', capo: 40, tuning: 'quatsch' }).capo, 0);
  assert.equal(sanitizeSong({ id: 'x', tuning: 'quatsch' }).tuning, 'standard');
  assert.equal(sanitizeSong({}), null);
});
