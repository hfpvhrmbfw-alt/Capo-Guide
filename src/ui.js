// Oberfläche: baut HTML aus Daten. Einzige Stelle mit Anzeigetexten und Formatierung.
import { TUNINGS, tuningById, NOTATIONS } from './model.js';
import * as L from './logic.js';
import { T, TUNING_SHORT, NOTATION_NAMES, LEVEL_NAMES } from './texts.js';

const P = window.Porto;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Zusätzliche Symbole im Strich der Porto-Symbole (24er Raster, runde Enden).
const EXTRA = {
  stift: '<path d="M5 19l1-4L16 5l3 3L9 18z"/><path d="M14 7l3 3"/>',
  kopie: '<rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/>',
  muell: '<path d="M5 7h14M10 4h4M7 7l1 13h8l1-13"/>',
  gitarre: '<path d="M14 10l6-6M18 4l2 2"/><path d="M13.5 10.5a3 3 0 0 0-4.6.4 2.5 2.5 0 0 1-2.3 1.2A3.5 3.5 0 0 0 4 18a3.5 3.5 0 0 0 6 2 2.5 2.5 0 0 1 1.2-2.4 3 3 0 0 0 2.3-7.1z"/><circle cx="9.5" cy="15" r="1.2"/>',
  minus: '<path d="M5 12h14"/>',
};
export const icon = name => (EXTRA[name] ? `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${EXTRA[name]}</svg>` : P.icon(name));

// ---------- Formatierung ----------

export function keyName(key, notation) {
  if (!key) return '–';
  const n = L.noteName(key.tonic, L.prefersFlats(key.tonic, key.minor), notation);
  return key.minor ? n[0].toLowerCase() + n.slice(1) + '-Moll' : n + '-Dur';
}
export function tuningLabel(t, notation) {
  const names = t.strings.map(s => L.noteName(s + t.offset, t.offset < 0, notation)).join(' ');
  return `${TUNING_SHORT[t.id]} · ${names}`;
}
const motifOf = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return P.motifs[h % P.motifs.length]; };

// ---------- Griffbild ----------

/** Griffbild als SVG. `v` = Voicing aus der Logik. */
export function diagram(v, label) {
  const fretted = v.frets.filter(f => f > 0);
  const hi = fretted.length ? Math.max(...fretted) : 0;
  const start = hi <= 4 ? 1 : Math.min(...fretted);
  const X = i => 14 + i * 12, Y = j => 22 + j * 15;
  let s = `<svg class="grip" viewBox="0 0 88 104" role="img" aria-label="${esc(label)}">`;
  for (let i = 0; i < 6; i++) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(4)}" class="g-str"/>`;
  for (let j = 0; j <= 4; j++) s += `<line x1="${X(0)}" y1="${Y(j)}" x2="${X(5)}" y2="${Y(j)}" class="${j === 0 && start === 1 ? 'g-nut' : 'g-fret'}"/>`;
  if (start > 1) s += `<text x="${X(5) + 7}" y="${Y(0) + 11}" class="g-num">${start}</text>`;
  if (v.barre) {
    const on = v.frets.map((f, i) => (f !== null && f >= v.barre ? i : -1)).filter(i => i >= 0);
    const from = v.frets.findIndex(f => f === v.barre), to = Math.max(...on);
    const y = Y(v.barre - start) + 7.5;
    s += `<rect x="${X(from) - 4.5}" y="${y - 4.5}" width="${X(to) - X(from) + 9}" height="9" rx="4.5" class="g-dot"/>`;
  }
  v.frets.forEach((f, i) => {
    if (f === null) s += `<path d="M${X(i) - 3} 8l6 6M${X(i) + 3} 8l-6 6" class="g-x"/>`;
    else if (f === 0) s += `<circle cx="${X(i)}" cy="11" r="3.2" class="g-open"/>`;
    else if (f !== v.barre) s += `<circle cx="${X(i)}" cy="${Y(f - start) + 7.5}" r="4.5" class="g-dot"/>`;
  });
  return s + '</svg>';
}

// ---------- Ansichten ----------

const dock = (active, fab) => `<div class="dock"><div class="pillbar" role="group" aria-label="Bereiche">${[
  ['lieder', 'regal', T.songs], ['akkorde', 'gitarre', T.chords], ['einstellungen', 'zahnrad', T.settings]]
  .map(([r, i, t]) => `<button type="button" data-go="#/${r === 'lieder' ? '' : r}" aria-pressed="${r === active}">${icon(i)}${r === active ? t : `<span class="vh">${t}</span>`}</button>`).join('')}</div>${
  fab ? `<button type="button" class="fab" data-act="new" aria-label="${T.newSong}">${icon('plus')}</button>` : ''}</div>`;

export function songMeta(song, settings) {
  const chords = L.extractChords(song.text, settings.notation);
  const key = L.detectKey(chords);
  return { chords, key, sound: key ? { tonic: (key.tonic + song.transpose + 12) % 12, minor: key.minor } : null };
}

export function viewList(songs, settings) {
  const items = songs.map(s => {
    const { sound } = songMeta(s, settings);
    const t = tuningById(s.tuning);
    const pm = s.capo ? P.postmark({ top: 'CAPO ' + s.capo, bottom: TUNING_SHORT[t.id].toUpperCase(), date: sound ? L.noteName(sound.tonic, L.prefersFlats(sound.tonic, sound.minor), settings.notation) + (sound.minor ? 'm' : '') : '' }) : '';
    return `<button type="button" class="stamp lift${s.capo ? ' is-stamped' : ''}" data-go="#/lied/${esc(s.id)}">
${P.motif(motifOf(s.id))}<span class="stamp-cap"><span class="stamp-title">${esc(s.title || T.untitled)}</span><span class="stamp-sub"><span>${esc(s.artist)}</span><b>${esc(keyName(sound, settings.notation))}</b></span></span>${pm}</button>`;
  }).join('');
  return `<div class="p-head"><span class="eyebrow">${T.appName}</span></div>
<div class="p-top"><h1 class="p-title">${T.songs}</h1><div class="n"><div class="p-hint">${T.songCount(songs.length)}</div></div></div>
${songs.length ? `<div class="shelf m-stagger">${items}</div>` : `<div class="note info"><span class="cap">${T.emptyTitle}</span>${T.emptyText}</div>
<div class="p-actions"><button type="button" class="btn primary" data-act="new">${T.newSong}</button><button type="button" class="btn" data-act="demo">${T.demo}</button></div>`}
${dock('lieder', true)}`;
}

export function viewSong(song, settings, view) {
  const n = settings.notation;
  const tuning = tuningById(song.tuning);
  const { chords, key, sound } = songMeta(song, settings);
  const shift = view.sound ? song.transpose : L.shapeShift(song.transpose, song.capo, tuning.offset);
  const dispTonic = key ? (key.tonic + shift + 120) % 12 : 0;
  const flats = key ? L.prefersFlats(dispTonic, key.minor) : false;
  const lines = L.renderSong(song.text, shift, flats, n);
  const distinct = L.distinctChords(chords);
  const soundChords = distinct.map(c => L.transposeChord(c, song.transpose));
  const ranks = distinct.length ? L.rankCapos(soundChords, tuning, sound).slice(0, 3) : [];
  if (ranks.length && !ranks.some(r => r.capo === song.capo)) {
    const cur = L.rankCapos(soundChords, tuning, sound).find(r => r.capo === song.capo);
    if (cur) ranks.push(cur);
  }
  const shapeName = r => {
    if (r.shapeKey === null) return '–';
    const nm = L.noteName(r.shapeKey, L.prefersFlats(r.shapeKey, sound.minor), n);
    return T.shapeOf(nm + (sound.minor ? 'm' : ''));
  };

  const chBtn = s => `<button type="button" class="ch" data-chord="${esc(s)}">${esc(s)}</button>`;
  const sheet = lines.map(l => {
    if (l.kind === 'chords' || !l.segs.some(g => g.chord)) return l.segs.map(g => (g.chord ? chBtn(g.s) : esc(g.s))).join('');
    // [Am]-Klammern: Akkorde in eine eigene Zeile über die Stelle im Text setzen.
    let top = '', topLen = 0, text = '';
    for (const g of l.segs) {
      if (!g.chord) { text += g.s; continue; }
      const gap = Math.max(topLen ? 1 : 0, text.length - topLen);
      top += ' '.repeat(gap) + chBtn(g.s); topLen += gap + g.s.length;
    }
    return top + '\n' + esc(text);
  }).join('\n');

  const shapeChords = L.distinctChords(distinct.map(c => L.transposeChord(c, L.shapeShift(song.transpose, song.capo, tuning.offset))));
  const shapeFlats = sound ? L.prefersFlats((sound.tonic - song.capo - tuning.offset + 120) % 12, sound.minor) : false;
  const grips = shapeChords.map(c => {
    const name = L.chordName(c, shapeFlats, n);
    const v = c.quality ? L.bestVoicing(c, tuning.strings) : null;
    return `<button type="button" class="gripcard" data-chord="${esc(name)}" data-shape="1"><b>${esc(name)}</b>${v ? diagram(v, name) + `<span class="tag${v.level === 'leicht' ? '' : ' acc'}">${LEVEL_NAMES[v.level]}</span>` : `<span class="p-hint">${c.quality ? T.noGrip : T.unknownChord}</span>`}</button>`;
  }).join('');

  return `<div class="p-head"><button type="button" class="iconbtn" data-go="#/" aria-label="${T.back}">${icon('zurueck')}</button><span class="eyebrow">${esc(TUNING_SHORT[tuning.id])}</span><button type="button" class="iconbtn" data-act="edit" aria-label="${T.edit}">${icon('stift')}</button></div>
<h1 class="p-title">${esc(song.title || T.untitled)}</h1>${song.artist ? `<p class="p-hint">${esc(song.artist)}</p>` : ''}
<div class="facts"><div><b>${esc(keyName(key, n))}</b><span>${T.original}</span></div><div><b>${esc(keyName(sound, n))}</b><span>${T.sounds}</span></div><div><b>${song.capo || T.noCapo}</b><span>${T.capo}</span></div></div>

<div class="controls">
  <div class="stepper"><span class="cap">${T.key}</span><button type="button" class="btn" data-act="tr" data-d="-1" aria-label="${T.transposeDown}">${icon('minus')}</button><output>${T.semis(song.transpose)}</output><button type="button" class="btn" data-act="tr" data-d="1" aria-label="${T.transposeUp}">${icon('plus')}</button></div>
  <div class="stepper"><span class="cap">${T.capo}</span><button type="button" class="btn" data-act="capo" data-d="-1" aria-label="${T.capoDown}" ${song.capo === 0 ? 'disabled' : ''}>${icon('minus')}</button><output>${song.capo ? T.fret(song.capo) : T.noCapo}</output><button type="button" class="btn" data-act="capo" data-d="1" aria-label="${T.capoUp}" ${song.capo >= 11 ? 'disabled' : ''}>${icon('plus')}</button></div>
  <div class="field"><label class="cap" for="tuning">${T.tuning}</label><select id="tuning" data-act="tuning">${TUNINGS.map(t => `<option value="${t.id}"${t.id === tuning.id ? ' selected' : ''}>${esc(tuningLabel(t, n))}</option>`).join('')}</select></div>
</div>

${ranks.length ? `<h2 class="sub">${T.suggestions}</h2><p class="p-hint">${T.suggestionsHint}</p>
<div class="stat-tickets">${ranks.map(r => `<button type="button" class="ticket" data-act="setcapo" data-capo="${r.capo}" aria-pressed="${r.capo === song.capo}"><span class="ticket-body"><span class="ticket-main"><small>${r.capo ? `${T.capo} ${r.capo}` : `${T.capo} ${T.noCapo}`}</small><b>${esc(shapeName(r))}</b><span>${esc(T.counts(r.counts))}</span></span><span class="ticket-stub">${r.capo === song.capo ? T.active : T.take}</span></span></button>`).join('')}</div>` : ''}

<div class="sheet-head"><h2 class="sub">${T.text}</h2>
<div class="pillseg" style="--n:2;--i:${view.sound ? 1 : 0}"><i></i><button type="button" data-act="mode" data-sound="0" aria-pressed="${!view.sound}">${T.showShapes}</button><button type="button" data-act="mode" data-sound="1" aria-pressed="${view.sound}">${T.showSound}</button></div></div>
<p class="p-hint">${view.sound ? T.soundHint : T.shapesHint}</p>
${chords.length ? '' : `<div class="note warn"><span class="cap">${T.chords}</span>${T.noChords}</div>`}
<pre class="songsheet">${sheet}</pre>

${grips ? `<h2 class="sub">${T.grips}</h2><div class="grips">${grips}</div>` : ''}

<div class="p-actions"><button type="button" class="btn" data-act="copy">${icon('kopie')}${T.copy}</button><button type="button" class="btn" data-act="delete">${icon('muell')}${T.delete}</button></div>
${dock('lieder', false)}`;
}

export function viewChords(settings, q) {
  const tuning = tuningById(q.tuning || settings.tuning);
  const c = q.name ? L.parseChord(q.name.trim(), settings.notation) : null;
  const shaped = c ? L.transposeChord(c, -(q.capo || 0) - tuning.offset) : null;
  const vs = shaped && shaped.quality ? L.findVoicings(shaped, tuning.strings, 3) : [];
  return `<div class="p-head"><span class="eyebrow">${T.appName}</span></div>
<h1 class="p-title">${T.chords}</h1><p class="p-hint">${T.chordLookup}</p>
<div class="controls">
  <div class="field"><label class="cap" for="cq">${T.chordInput}</label><input id="cq" data-act="cq" value="${esc(q.name || '')}" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
  <div class="field"><label class="cap" for="ct">${T.tuning}</label><select id="ct" data-act="ct">${TUNINGS.map(t => `<option value="${t.id}"${t.id === tuning.id ? ' selected' : ''}>${esc(tuningLabel(t, settings.notation))}</option>`).join('')}</select></div>
  <div class="stepper"><span class="cap">${T.capo}</span><button type="button" class="btn" data-act="ccapo" data-d="-1" aria-label="${T.capoDown}" ${!q.capo ? 'disabled' : ''}>${icon('minus')}</button><output>${q.capo ? T.fret(q.capo) : T.noCapo}</output><button type="button" class="btn" data-act="ccapo" data-d="1" aria-label="${T.capoUp}" ${q.capo >= 11 ? 'disabled' : ''}>${icon('plus')}</button></div>
</div>
<div id="cres">${chordResult(c, shaped, vs, settings, q)}</div>
${dock('akkorde', false)}`;
}

export function chordResult(c, shaped, vs, settings, q) {
  if (!q.name || !q.name.trim()) return '';
  if (!c) return `<div class="note warn"><span class="cap">${T.chords}</span>${T.chordInvalid}</div>`;
  const name = L.chordName(shaped, L.prefersFlats(shaped.root, /^m(?!aj)/.test(shaped.suffix)), settings.notation);
  const head = shaped.root !== c.root ? `<p class="p-hint">${esc(T.shapeOf(name))}</p>` : '';
  if (!shaped.quality) return head + `<div class="note info"><span class="cap">${T.chords}</span>${T.unknownChord}</div>`;
  if (!vs.length) return head + `<div class="note warn"><span class="cap">${T.chords}</span>${T.noGrip}</div>`;
  return head + `<div class="grips">${vs.map(v => `<div class="gripcard"><b>${esc(name)}</b>${diagram(v, name)}<span class="tag${v.level === 'leicht' ? '' : ' acc'}">${LEVEL_NAMES[v.level]}</span></div>`).join('')}</div>`;
}

export function viewSettings(settings) {
  return `<div class="p-head"><span class="eyebrow">${T.appName}</span></div>
<h1 class="p-title">${T.settings}</h1>
<div class="controls">
  <div class="field"><span class="cap">${T.notation}</span><div class="pillseg" style="--n:2;--i:${NOTATIONS.indexOf(settings.notation)}"><i></i>${NOTATIONS.map(x => `<button type="button" data-act="notation" data-v="${x}" aria-pressed="${x === settings.notation}">${NOTATION_NAMES[x]}</button>`).join('')}</div></div>
  <div class="field"><label class="cap" for="dt">${T.defaultTuning}</label><select id="dt" data-act="deftuning">${TUNINGS.map(t => `<option value="${t.id}"${t.id === settings.tuning ? ' selected' : ''}>${esc(tuningLabel(t, settings.notation))}</option>`).join('')}</select></div>
</div>
<h2 class="sub">${T.backup}</h2>
<div class="note"><span class="cap">${T.backup}</span>${T.backupHint}</div>
<div class="p-actions"><button type="button" class="btn primary" data-act="export">${T.export}</button><label class="btn">${T.import}<input type="file" accept="application/json,.json" data-act="import" class="vh"></label></div>
<p class="p-hint" style="margin-top:24px">${T.designNote}</p>
${dock('einstellungen', false)}`;
}

export function sheetEdit(song) {
  return `<h2>${T.edit}</h2><form method="dialog" class="editform">
<div class="field"><label class="cap" for="et">${T.title}</label><input id="et" name="title" value="${esc(song.title)}" autocomplete="off"></div>
<div class="field"><label class="cap" for="ea">${T.artist}</label><input id="ea" name="artist" value="${esc(song.artist)}" autocomplete="off"></div>
<div class="field"><label class="cap" for="ex">${T.text}</label><textarea id="ex" name="text" rows="12" wrap="off" spellcheck="false" autocapitalize="off">${esc(song.text)}</textarea><span class="p-hint">${T.textHint}</span></div>
<div class="p-actions"><button type="submit" class="btn primary" value="save">${T.save}</button><button type="submit" class="btn" value="cancel">${T.cancel}</button></div></form>`;
}

export function sheetChord(name, chord, tuning, capoForShape, settings) {
  const shaped = L.transposeChord(chord, -capoForShape);
  const vs = shaped.quality ? L.findVoicings(shaped, tuning.strings, 3) : [];
  const shapeLabel = L.chordName(shaped, L.prefersFlats(shaped.root, /^m(?!aj)/.test(shaped.suffix)), settings.notation);
  return `<h2>${esc(name)}</h2><p class="p-hint">${esc(tuningLabel(tuning, settings.notation))}${capoForShape ? ' · ' + esc(T.shapeOf(shapeLabel)) : ''}</p>
${vs.length ? `<div class="grips">${vs.map(v => `<div class="gripcard"><b>${esc(shapeLabel)}</b>${diagram(v, shapeLabel)}<span class="tag${v.level === 'leicht' ? '' : ' acc'}">${LEVEL_NAMES[v.level]}</span></div>`).join('')}</div>`
    : `<div class="note warn"><span class="cap">${T.chords}</span>${shaped.quality ? T.noGrip : T.unknownChord}</div>`}`;
}
