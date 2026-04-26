// db.js — IndexedDB wrapper
const DB_NAME = 'flashjap';
const DB_VER  = 1;
let _db = null;

// ── HELPERS XSS ────────────────────────────────────────────────────────
export function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('vocab')) {
        const vs = db.createObjectStore('vocab', { keyPath: 'mot' });
        vs.createIndex('hiragana', 'hiragana', { unique: false });
        vs.createIndex('romaji',   'romaji',   { unique: false });
        vs.createIndex('listes',   'listes',   { unique: false, multiEntry: true });
      }
      if (!db.objectStoreNames.contains('kanji')) {
        const ks = db.createObjectStore('kanji', { keyPath: 'kanji' });
        ks.createIndex('listes', 'listes', { unique: false, multiEntry: true });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return _db.transaction(store, mode).objectStore(store);
}
function all(store) {
  return new Promise((res, rej) => {
    const req = tx(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
function get(store, key) {
  return new Promise((res, rej) => {
    const req = tx(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
function put(store, obj) {
  return new Promise((res, rej) => {
    const req = tx(store, 'readwrite').put(obj);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}
function clear(store) {
  return new Promise((res, rej) => {
    const req = tx(store, 'readwrite').clear();
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

// ── STATS ──────────────────────────────────────────────────────────────
export function getStatut(score) {
  if (score === null || score === undefined) return null;
  if (score === 0) return 'etudie';
  if (score < 5)  return 'encours';
  return 'maitrise';
}

export function getStatutGlobal(entry, mode = 'display') {
  const order = ['noncommence', 'etudie', 'encours', 'maitrise'];
  const scores = [];
  if (entry.type === 'kanji') {
    ['score_comprehension_jpfr','score_comprehension_frjp','score_lecture_on','score_lecture_kun'].forEach(k => {
      if (entry[k] !== null && entry[k] !== undefined) scores.push(getStatut(entry[k]));
    });
  } else {
    // vocab : 3 scores
    ['score_lecture','score_jpfr','score_frjp'].forEach(k => {
      if (entry[k] !== null && entry[k] !== undefined) scores.push(getStatut(entry[k]));
    });
  }
  if (!scores.length) return 'noncommence';
  const indices = scores.map(s => order.indexOf(s));
  return mode === 'display' ? order[Math.max(...indices)] : order[Math.min(...indices)];
}

export const STATUT_COLOR = {
  maitrise:    '#1D9E75',
  encours:     '#7F77DD',
  etudie:      '#FAC775',
  noncommence: '#C8C4BC',
};

// ── LECTURE / ÉCRITURE ──────────────────────────────────────────────────
export async function getAllVocab() { return all('vocab'); }
export async function getAllKanji() { return all('kanji'); }
export async function getVocab(mot)   { return get('vocab', mot); }
export async function getKanji(kanji) { return get('kanji', kanji); }
export async function putVocab(entry) { return put('vocab', entry); }
export async function putKanji(entry) { return put('kanji', entry); }

function del(store, key) {
  return new Promise((res, rej) => {
    const req = tx(store, 'readwrite').delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}
export async function deleteVocab(mot)   { _searchIndex = null; return del('vocab', mot); }
export async function deleteKanji(kanji) { _searchIndex = null; return del('kanji', kanji); }

function cleanListes(listes) {
  const autres = listes.filter(l => l !== 'automatique');
  return autres.length > 0 ? autres : listes;
}

export async function saveEntry(entry) {
  const store = entry.type === 'kanji' ? 'kanji' : 'vocab';
  const key   = entry.type === 'kanji' ? entry.kanji : entry.mot;
  const existing = await get(store, key);
  if (existing) {
    const merged = [...new Set([...existing.listes, ...(entry.listes || [])])];
    const mergedEntry = { ...existing, listes: cleanListes(merged) };
    await put(store, mergedEntry);
    return { status: 'doublon', entry: mergedEntry };
  }
  const listes = cleanListes(entry.listes || []);
  let savedEntry;
  if (entry.type === 'kanji') {
    savedEntry = {
      ...entry, listes,
      score_comprehension_jpfr: null, score_comprehension_frjp: null,
      score_lecture_on: null, score_lecture_kun: null,
      consec_comprehension_jpfr: 0, consec_comprehension_frjp: 0,
      consec_lecture_on: 0, consec_lecture_kun: 0,
      err_consec_comprehension_jpfr: 0, err_consec_comprehension_frjp: 0,
      err_consec_lecture_on: 0, err_consec_lecture_kun: 0,
      derniere_vue_jpfr: null, derniere_vue_frjp: null,
      created_at: Date.now(),
    };
  } else {
    savedEntry = {
      ...entry, listes,
      score_lecture: null, score_jpfr: null, score_frjp: null,
      consec_lecture: 0, consec_jpfr: 0, consec_frjp: 0,
      err_consec_lecture: 0, err_consec_jpfr: 0, err_consec_frjp: 0,
      derniere_vue_lecture: null, derniere_vue_jpfr: null, derniere_vue_frjp: null,
      created_at: Date.now(),
    };
  }
  await put(store, savedEntry);
  return { status: 'ok', entry: savedEntry };
}

// sens pour vocab : 'lecture' | 'jpfr' | 'frjp'
// sens pour kanji : 'comprehension_jpfr' | 'comprehension_frjp' | 'lecture_on' | 'lecture_kun'
function applyScoreUpdate(entry, sens, correct) {
  const scoreKey  = `score_${sens}`;
  const consecKey = `consec_${sens}`;
  const errKey    = `err_consec_${sens}`;

  const prev   = entry[scoreKey] ?? 0;
  const consec = entry[consecKey] ?? 0;
  const err    = entry[errKey] ?? 0;

  if (correct) {
    const newScore  = Math.min(prev + 1, 5);
    const newConsec = consec + 1;
    return { ...entry, [scoreKey]: newScore, [consecKey]: newConsec, [errKey]: 0 };
  } else {
    const baseScore = entry[scoreKey] === null || entry[scoreKey] === undefined ? 0 : prev;
    const newErr = err + 1;
    if (newErr >= 2) {
      return { ...entry, [scoreKey]: Math.max(0, baseScore - 1), [consecKey]: 0, [errKey]: 0 };
    } else {
      return { ...entry, [scoreKey]: baseScore, [consecKey]: 0, [errKey]: newErr };
    }
  }
}

export async function updateScore(type, key, sens, correct) {
  const store = type === 'kanji' ? 'kanji' : 'vocab';
  const entry = await get(store, key);
  if (!entry) return;

  let vueKey;
  if (sens === 'lecture') vueKey = 'derniere_vue_lecture';
  else if (sens.includes('frjp')) vueKey = 'derniere_vue_frjp';
  else vueKey = 'derniere_vue_jpfr';

  const updated = applyScoreUpdate(entry, sens, correct);
  await put(store, { ...updated, [vueKey]: Date.now() });
}

// Met à jour les scores kun et on en un seul get+put pour éviter la race condition IndexedDB.
export async function updateKanjiLectureScores(key, correctKun, correctOn) {
  const entry = await get('kanji', key);
  if (!entry) return;

  let updated = entry;
  if (correctKun !== null) updated = applyScoreUpdate(updated, 'lecture_kun', correctKun);
  if (correctOn  !== null) updated = applyScoreUpdate(updated, 'lecture_on',  correctOn);
  await put('kanji', { ...updated, derniere_vue_jpfr: Date.now() });
}

// Variantes "from base" : repartent d'une entrée fournie (pré-validate) pour que
// toggleCorrection() remplace le résultat au lieu d'empiler un deuxième delta.
export async function reapplyScore(type, key, sens, correct, baseEntry) {
  const store = type === 'kanji' ? 'kanji' : 'vocab';
  let vueKey;
  if (sens === 'lecture') vueKey = 'derniere_vue_lecture';
  else if (sens.includes('frjp')) vueKey = 'derniere_vue_frjp';
  else vueKey = 'derniere_vue_jpfr';
  const updated = applyScoreUpdate(baseEntry, sens, correct);
  await put(store, { ...updated, [vueKey]: Date.now() });
}

export async function reapplyKanjiLectureScores(key, correctKun, correctOn, baseEntry) {
  let updated = baseEntry;
  if (correctKun !== null) updated = applyScoreUpdate(updated, 'lecture_kun', correctKun);
  if (correctOn  !== null) updated = applyScoreUpdate(updated, 'lecture_on',  correctOn);
  await put('kanji', { ...updated, derniere_vue_lecture: Date.now() });
}

// ── LISTES DISPONIBLES ──────────────────────────────────────────────────
export async function getListes(type) {
  const entries = type === 'kanji' ? await getAllKanji()
                : type === 'vocab' ? await getAllVocab()
                : [...await getAllVocab(), ...await getAllKanji()];
  const set = new Set();
  entries.forEach(e => (e.listes || []).forEach(l => set.add(l)));
  return [...set].sort();
}

export async function getAllListes() {
  const vocab = await getAllVocab();
  const kanji = await getAllKanji();
  const set = new Set();
  [...vocab, ...kanji].forEach(e => (e.listes || []).forEach(l => set.add(l)));
  return [...set].sort();
}

// ── SÉLECTION DE CARTES POUR QUIZ ──────────────────────────────────────
function getScoreKeysForSens(entry, sens) {
  if (entry.type === 'kanji') {
    if (sens === 'lecture') return ['score_lecture_on', 'score_lecture_kun'];
    return [`score_comprehension_${sens}`];
  }
  return [`score_${sens}`];
}

export async function getCardsForQuiz({ type, listes, critere, sens, count }) {
  let entries = [];
  if (type === 'vocab' || type === 'les2') entries.push(...await getAllVocab());
  if (type === 'kanji' || type === 'les2') entries.push(...await getAllKanji());

  if (listes && listes.length) {
    entries = entries.filter(e => listes.some(l => (e.listes || []).includes(l)));
  }
  if (sens === 'lecture') {
    entries = entries.filter(e => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(e.mot || e.kanji || ''));
  }

  const now = Date.now();
  const THREE_WEEKS = 21 * 24 * 3600 * 1000;

  if (critere === 'faibles') {
    const order = ['noncommence', 'etudie', 'encours', 'maitrise'];
    entries = entries.filter(e => {
      const keys = getScoreKeysForSens(e, sens);
      const statuts = keys.map(k => getStatut(e[k]) ?? 'noncommence');
      return order[Math.min(...statuts.map(s => order.indexOf(s)))] !== 'maitrise';
    });
    const vueKey = sens === 'lecture' ? 'derniere_vue_lecture'
                 : sens.includes('frjp') ? 'derniere_vue_frjp'
                 : 'derniere_vue_jpfr';
    entries.sort((a, b) => {
      const minScore = e => Math.min(...getScoreKeysForSens(e, sens).map(k => e[k] ?? -1));
      return minScore(a) - minScore(b) || (a[vueKey] || 0) - (b[vueKey] || 0);
    });
  } else if (critere === 'anciens') {
    const vueKey = sens === 'lecture' ? 'derniere_vue_lecture'
                 : sens.includes('frjp') ? 'derniere_vue_frjp'
                 : 'derniere_vue_jpfr';
    entries = entries.filter(e => {
      const vue = e[vueKey];
      return !vue || (now - vue) >= THREE_WEEKS;
    });
    entries.sort((a, b) => (a[vueKey] || 0) - (b[vueKey] || 0));
  } else if (critere === 'jamais') {
    entries = entries.filter(e => {
      const keys = getScoreKeysForSens(e, sens);
      return keys.every(k => e[k] === null || e[k] === undefined);
    });
    entries.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }

  if (count > 0) entries = entries.slice(0, count);
  shuffle(entries);
  return entries;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── EXPORT / IMPORT ─────────────────────────────────────────────────────
export async function exportAll() {
  return JSON.stringify({ vocab: await getAllVocab(), kanji: await getAllKanji() }, null, 2);
}

export async function loadDefaultDatabase() {
  const vocab = await getAllVocab();
  const kanji = await getAllKanji();

  if (vocab.length === 0 && kanji.length === 0) {
    try {
      const response = await fetch('/flashjap/flashjap_base.json');
      if (!response.ok) throw new Error('Failed to fetch default database');
      const data = await response.json();
      await importAll(data, false);
      return true;
    } catch (e) {
      console.error('Error loading default database:', e);
      return false;
    }
  }
  return false;
}

export async function importAll(data, keepScores) {
  const VOCAB_SCORES = ['score_lecture','score_jpfr','score_frjp','consec_lecture','consec_jpfr','consec_frjp',
    'err_consec_lecture','err_consec_jpfr','err_consec_frjp','derniere_vue_lecture','derniere_vue_jpfr','derniere_vue_frjp'];
  const KANJI_SCORES = ['score_comprehension_jpfr','score_comprehension_frjp','score_lecture_on','score_lecture_kun',
    'consec_comprehension_jpfr','consec_comprehension_frjp','consec_lecture_on','consec_lecture_kun',
    'err_consec_comprehension_jpfr','err_consec_comprehension_frjp','err_consec_lecture_on','err_consec_lecture_kun',
    'derniere_vue_jpfr','derniere_vue_frjp'];
  const restore = async (store, entries, keyFn, scoreFields) => {
    if (!keepScores) {
      await clear(store);
      for (const e of entries) await put(store, e);
    } else {
      for (const e of entries) {
        const existing = await get(store, keyFn(e));
        const scores = {};
        if (existing) scoreFields.forEach(f => { scores[f] = existing[f]; });
        await put(store, { ...e, ...scores });
      }
    }
  };
  if (data.vocab) await restore('vocab', data.vocab, e => e.mot,   VOCAB_SCORES);
  if (data.kanji) await restore('kanji', data.kanji, e => e.kanji, KANJI_SCORES);
}

// ── VALIDATION ──────────────────────────────────────────────────────────
export function validateEntry(e) {
  const errors = [];
  if (!e || typeof e !== 'object') { errors.push('Format invalide'); return errors; }
  if (e.type === 'kanji') {
    if (!e.kanji)          errors.push('Champ "kanji" manquant');
    if (!e.listes?.length) errors.push('Champ "listes" manquant');
    if (!e.sens?.length)   errors.push('Champ "sens" manquant');
  } else {
    if (!e.mot)                 errors.push('Champ "mot" manquant');
    if (!e.hiragana)            errors.push('Champ "hiragana" manquant');
    if (!e.traductions?.length) errors.push('Champ "traductions" manquant');
    if (!e.listes?.length)      errors.push('Champ "listes" manquant');
  }
  return errors;
}

// ── RECHERCHE ───────────────────────────────────────────────────────────
let _searchIndex = null;

export async function buildSearchIndex() {
  const vocab = await getAllVocab();
  const kanji = await getAllKanji();
  _searchIndex = [...vocab, ...kanji];
}

export function search(query, type, excludeAuto = true) {
  if (!_searchIndex) return [];
  const q = query.toLowerCase().trim().replace(/\s/g, '').normalize('NFC');

  let entries = _searchIndex.filter(e => {
    if (type !== 'les2') {
      if (type === 'kanji' && e.type !== 'kanji') return false;
      if (type === 'vocab' && e.type === 'kanji') return false;
    }
    if (excludeAuto && (e.listes || []).every(l => l === 'automatique')) return false;
    return true;
  });

  if (!q) return entries;

  return entries.filter(e => {
    const mot    = (e.mot || e.kanji || '').toLowerCase().replace(/\s/g, '').normalize('NFC');
    const hira   = (e.hiragana || '').replace(/\s/g, '').normalize('NFC');
    const roma   = (e.romaji || '').toLowerCase().replace(/\s/g, '').normalize('NFC');
    const romaOn = (e.romaji_on || []).join(' ').toLowerCase().replace(/\s/g, '').normalize('NFC');
    const romaKun = (e.romaji_kun || []).join(' ').toLowerCase().replace(/\s/g, '').normalize('NFC');
    const sens   = (e.traductions || e.sens || []).join(' ').toLowerCase().normalize('NFC');
    const listes = (e.listes || []).join(' ').toLowerCase().replace(/\s/g, '').normalize('NFC');
    return mot.includes(q) || hira.includes(q) || roma.includes(q) || romaOn.includes(q) || romaKun.includes(q) || sens.includes(q) || listes.includes(q);
  });
}
