// Start, Navigation und Aktionen. Liest als einzige Stelle die Uhr.
import * as S from './storage.js';
import { emptySong, sanitizeSong, sanitizeSettings, DEFAULT_SETTINGS, buildExport, parseImport, tuningById } from './model.js';
import * as L from './logic.js';
import * as U from './ui.js';
import { T, DEMO, IMPORT_ERRORS } from './texts.js';

const app = document.getElementById('app');
const dlg = document.getElementById('sheet');
const state = { songs: new Map(), settings: { ...DEFAULT_SETTINGS }, view: { sound: false }, chordQ: { name: '', tuning: null, capo: 0 } };

const now = () => new Date().toISOString();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const sorted = () => [...state.songs.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
const route = () => { const h = location.hash.replace(/^#\/?/, ''); const [name, id] = h.split('/'); return { name: name || 'lieder', id: id ? decodeURIComponent(id) : null }; };
const current = () => { const r = route(); return r.name === 'lied' ? state.songs.get(r.id) : null; };

function render(animate = false) {
  const r = route();
  const y = scrollY;
  if (r.name === 'lied') {
    const s = state.songs.get(r.id);
    if (!s) { location.hash = '#/'; return; }
    app.innerHTML = U.viewSong(s, state.settings, state.view);
    document.title = (s.title || T.untitled) + ' · ' + T.appName;
  } else if (r.name === 'akkorde') {
    app.innerHTML = U.viewChords(state.settings, state.chordQ);
    document.title = T.chords + ' · ' + T.appName;
  } else if (r.name === 'einstellungen') {
    app.innerHTML = U.viewSettings(state.settings);
    document.title = T.settings + ' · ' + T.appName;
  } else {
    app.innerHTML = U.viewList(sorted(), state.settings);
    document.title = T.appName;
  }
  if (animate) { scrollTo(0, 0); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); } else scrollTo(0, y);
}

async function saveSong(s) {
  s.updatedAt = now();
  state.songs.set(s.id, s);
  await S.putSong(s);
}
async function saveSettings() { await S.setMeta('settings', state.settings); }

function openSheet(html, onClose) {
  dlg.classList.remove('closing');
  dlg.innerHTML = html;
  dlg.onclose = () => onClose?.(dlg.returnValue);
  dlg.returnValue = '';
  dlg.showModal();
}
function closeSheet(value = '') {
  if (!dlg.open) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { dlg.close(value); return; }
  dlg.classList.add('closing');
  dlg.addEventListener('animationend', () => { if (!dlg.classList.contains('closing')) return; dlg.classList.remove('closing'); dlg.close(value); }, { once: true });
}
dlg.addEventListener('click', e => { if (e.target === dlg) closeSheet(); }); // Tipp auf den Hintergrund
dlg.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });

/** Rückfrage im eigenen Sheet statt confirm() (läuft auch dort, wo Browser-Dialoge gesperrt sind). */
function ask(text, okLabel, cancelLabel = T.cancel) {
  return new Promise(res => {
    openSheet(U.sheetAsk(text, okLabel, cancelLabel));
    dlg.querySelector('form').addEventListener('submit', e => { e.preventDefault(); res(e.submitter?.value === 'ok'); closeSheet(); }, { once: true });
  });
}
const tell = text => ask(text, T.ok, null);

function editSong(s, isNew) {
  openSheet(U.sheetEdit(s), async () => {});
  const form = dlg.querySelector('form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (e.submitter?.value === 'save') {
      const f = new FormData(form);
      Object.assign(s, sanitizeSong({ ...s, title: f.get('title').trim(), artist: f.get('artist').trim(), text: f.get('text') }));
      await saveSong(s);
      if (isNew) location.hash = '#/lied/' + encodeURIComponent(s.id); else render();
    }
    closeSheet();
  });
  if (isNew) setTimeout(() => dlg.querySelector('#et')?.focus(), 50);
}

async function newSong(demo = false) {
  const s = emptySong(newId(), now(), state.settings.tuning);
  if (demo) { Object.assign(s, DEMO); await saveSong(s); location.hash = '#/lied/' + encodeURIComponent(s.id); return; }
  editSong(s, true);
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Ereignisse ----------

app.addEventListener('click', async e => {
  const go = e.target.closest('[data-go]');
  if (go) { location.hash = go.dataset.go; return; }
  const ch = e.target.closest('[data-chord]');
  if (ch) {
    const s = current(), c = L.parseChord(ch.dataset.chord, state.settings.notation);
    if (!s || !c) return;
    const t = tuningById(s.tuning);
    const back = ch.dataset.shape || !state.view.sound ? 0 : s.capo + t.offset; // angezeigter Name → Griff
    openSheet(U.sheetChord(ch.dataset.chord, c, t, back, state.settings));
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
  const s = current(), act = b.dataset.act;
  if (act === 'new') return newSong();
  if (act === 'demo') return newSong(true);
  if (act === 'edit' && s) return editSong(s, false);
  if (act === 'tr' && s) { s.transpose = Math.max(-11, Math.min(11, s.transpose + +b.dataset.d)); await saveSong(s); return render(); }
  if (act === 'capo' && s) { s.capo = Math.max(0, Math.min(11, s.capo + +b.dataset.d)); await saveSong(s); return render(); }
  if (act === 'setcapo' && s) { s.capo = +b.dataset.capo; await saveSong(s); return render(); }
  if (act === 'mode') { state.view.sound = b.dataset.sound === '1'; return render(); }
  if (act === 'copy' && s) {
    const m = U.songMeta(s, state.settings), t = tuningById(s.tuning);
    const shift = state.view.sound ? s.transpose : L.shapeShift(s.transpose, s.capo, t.offset);
    const flats = m.key ? L.prefersFlats(m.key.tonic + shift + 120, m.key.minor) : false;
    const head = [s.title, s.artist].filter(Boolean).join(' – ') + (s.capo && !state.view.sound ? `\n${T.capo} ${s.capo}` : '');
    try { await navigator.clipboard.writeText((head ? head + '\n\n' : '') + L.songToText(s.text, shift, flats, state.settings.notation)); b.lastChild.textContent = T.copied; } catch { /* nicht erlaubt */ }
    return;
  }
  if (act === 'delete' && s) {
    if (!(await ask(T.confirmDelete, T.delete))) return;
    state.songs.delete(s.id); await S.deleteSong(s.id); location.hash = '#/'; return;
  }
  if (act === 'notation') { state.settings.notation = b.dataset.v; await saveSettings(); return render(); }
  if (act === 'export') {
    const stamp = now();
    download(`capo-guide-${stamp.slice(0, 10)}.json`, JSON.stringify(buildExport(sorted(), state.settings, stamp), null, 2));
    await S.setMeta('lastExport', stamp);
    return;
  }
  if (act === 'ccapo') { state.chordQ.capo = Math.max(0, Math.min(11, state.chordQ.capo + +b.dataset.d)); return render(); }
});

app.addEventListener('change', async e => {
  const el = e.target, act = el.dataset.act, s = current();
  if (act === 'tuning' && s) { s.tuning = el.value; await saveSong(s); return render(); }
  if (act === 'deftuning') { state.settings.tuning = el.value; await saveSettings(); return; }
  if (act === 'ct') { state.chordQ.tuning = el.value; return render(); }
  if (act === 'import' && el.files[0]) {
    const r = parseImport(await el.files[0].text());
    el.value = '';
    if (!r.ok) { tell(IMPORT_ERRORS[r.error]); return; }
    if (!(await ask(T.confirmImport(r.songs.length), T.import))) return;
    for (const song of r.songs) { state.songs.set(song.id, song); await S.putSong(song); }
    state.settings = r.settings; await saveSettings();
    render(); tell(T.imported(r.songs.length));
  }
});

app.addEventListener('input', e => {
  if (e.target.dataset.act !== 'cq') return;
  state.chordQ.name = e.target.value;
  // Nur das Ergebnis neu zeichnen, damit das Eingabefeld den Fokus behält.
  const tuning = tuningById(state.chordQ.tuning || state.settings.tuning);
  const c = L.parseChord(state.chordQ.name.trim(), state.settings.notation);
  const shaped = c ? L.transposeChord(c, -state.chordQ.capo - tuning.offset) : null;
  const vs = shaped && shaped.quality ? L.findVoicings(shaped, tuning.strings, 3) : [];
  document.getElementById('cres').innerHTML = U.chordResult(c, shaped, vs, state.settings, state.chordQ);
});

addEventListener('hashchange', () => { dlg.classList.remove('closing'); if (dlg.open) dlg.close(); render(true); });

// ---------- Start ----------

(async function start() {
  await S.open();
  state.settings = sanitizeSettings(await S.getMeta('settings'));
  for (const raw of await S.allSongs()) { const s = sanitizeSong(raw); if (s) state.songs.set(s.id, s); }
  render(true);
  S.persist();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
