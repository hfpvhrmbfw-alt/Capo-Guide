// Speicher: IndexedDB, bei Fehlern localStorage. Kennt nur Lieder und Einstellungen als Daten.
const DB_NAME = 'capo-guide', DB_VERSION = 1, LS = 'capo-guide:';
let db = null;

function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

export async function open() {
  try {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('songs')) d.createObjectStore('songs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    };
    db = await req(r);
  } catch { db = null; }
}

const store = (name, mode) => db.transaction(name, mode).objectStore(name);
const lsGet = k => { try { return JSON.parse(localStorage.getItem(LS + k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch { /* voll oder gesperrt */ } };

export async function allSongs() {
  if (db) return req(store('songs', 'readonly').getAll());
  return Object.values(lsGet('songs') || {});
}
export async function putSong(song) {
  if (db) return req(store('songs', 'readwrite').put(song));
  const all = lsGet('songs') || {}; all[song.id] = song; lsSet('songs', all);
}
export async function deleteSong(id) {
  if (db) return req(store('songs', 'readwrite').delete(id));
  const all = lsGet('songs') || {}; delete all[id]; lsSet('songs', all);
}
export async function getMeta(key) {
  if (db) return req(store('meta', 'readonly').get(key));
  return lsGet('meta:' + key);
}
export async function setMeta(key, value) {
  if (db) return req(store('meta', 'readwrite').put(value, key));
  lsSet('meta:' + key, value);
}
/** Bittet den Browser, die Daten nicht zu räumen (iOS: wirkt bei installierter App). */
export async function persist() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}
