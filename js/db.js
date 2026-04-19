// db.js — IndexedDB wrapper
const DB_NAME = 'flashjap';
const DB_VER  = 1;
let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // Store vocab
      if (!db.objectStoreNames.contains('vocab')) {
        const vs = db.createObjectStore('vocab', { keyPath: 'mot' });
        vs.createIndex('hiragana', 'hiragana', { unique: false });
        vs.createIndex('romaji',   'romaji',   { unique: false });
        vs.createIndex('listes',   'listes',   { unique: false, multiEntry: true });
      }
      // Store kanji
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

function del(store, key) {
  return new Promise((res, rej) => {
    const req = tx(store, 'readwrite').delete(key);
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
  if (score === 0) return 'etudie';
  if (score < 5)  return 'encours';
  return 'maitrise';
}

export function getStatutGlobal(entry) {
  // Jamais vu dans aucun sens
  if (entry.score_jpfr === null && entry.score_frjp === null) return 'noncommence';
  const s1 = entry.score_jpfr === null ? 'noncommence' : getStatut(entry.score_jpfr);
  const s2 = entry.score_frjp === null ? 'noncommence' : getStatut(entry.score_frjp);
  const order = ['noncommence','etudie','encours','maitrise'];
  return order[Math.min(order.indexOf(s1), order.indexOf(s2))];
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

export async function saveEntry(entry) {
  const store = entry.type === 'kanji' ? 'kanji' : 'vocab';
  const key   = entry.type === 'kanji' ? entry.kanji : entry.mot;
  const existing = await get(store, key);
  if (existing) {
    // Fusionner les listes, garder les scores
    const listes = [...new Set([...existing.listes, ...(entry.listes || [])])];
    await put(store, { ...existing, listes });
    return 'doublon';
  }
  // Initialiser les scores
  const now = Date.now();
  await put(store, {
    ...entry,
    score_jpfr: null,
    score_frjp: null,
    consec_jpfr: 0,
    consec_frjp: 0,
    derniere_vue_jpfr: null,
    derniere_vue_frjp: null,
  });
  return 'ok';
}

export async function updateScore(type, key, sens, correct) {
  const store = type === 'kanji' ? 'kanji' : 'vocab';
  const entry = await get(store, key);
  if (!entry) return;

  const scoreKey  = `score_${sens}`;
  const consecKey = `consec_${sens}`;
  const vueKey    = `derniere_vue_${sens}`;

  const prev  = entry[scoreKey] ?? 0;
  const consec = entry[consecKey] ?? 0;

  let newScore  = prev;
  let newConsec = consec;

  if (correct) {
    newConsec = consec + 1;
    if (newConsec >= 5) { newScore = 5; newConsec = 5; }
    else newScore = newConsec;
  } else {
    newConsec = 0;
    // Rétrograder d'un cran après 2 erreurs consécutives (géré côté quiz)
    const errKey = `err_consec_${sens}`;
    const errCount = (entry[errKey] ?? 0) + 1;
    if (errCount >= 2) {
      newScore = Math.max(0, prev - 1);
      await put(store, { ...entry, [scoreKey]: newScore, [consecKey]: 0, [errKey]: 0, [vueKey]: Date.now() });
      return;
    }
    await put(store, { ...entry, [`err_consec_${sens}`]: errCount, [vueKey]: Date.now() });
    return;
  }

  await put(store, {
    ...entry,
    [scoreKey]:  newScore,
    [consecKey]: newConsec,
    [vueKey]:    Date.now(),
    [`err_consec_${sens}`]: 0,
  });
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

// ── SÉLECTION DE CARTES POUR QUIZ ──────────────────────────────────────
export async function getCardsForQuiz({ type, listes, critere, sens, count }) {
  let entries = [];
  if (type === 'vocab' || type === 'les2') entries.push(...await getAllVocab());
  if (type === 'kanji' || type === 'les2') entries.push(...await getAllKanji());

  // Filtre listes
  if (listes && listes.length) {
    entries = entries.filter(e => listes.some(l => (e.listes || []).includes(l)));
  }

  // En mode Lecture : seulement les mots avec au moins un kanji
  if (sens === 'lecture') {
    entries = entries.filter(e => {
      const mot = e.mot || e.kanji || '';
      return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(mot);
    });
  }

  const scoreKey = `score_${sens === 'lecture' ? 'jpfr' : sens}`;
  const vueKey   = `derniere_vue_${sens === 'lecture' ? 'jpfr' : sens}`;
  const THREE_WEEKS = 21 * 24 * 3600 * 1000;
  const now = Date.now();

  // Filtre critère
  if (critere === 'faibles') {
    entries = entries.filter(e => (e[scoreKey] ?? 0) < 5);
  } else if (critere === 'anciens') {
    entries = entries.filter(e => {
      const vue = e[vueKey];
      return !vue || (now - vue) >= THREE_WEEKS;
    });
    // Trier du plus ancien au plus récent
    entries.sort((a, b) => {
      const va = a[vueKey] ?? 0;
      const vb = b[vueKey] ?? 0;
      return va - vb;
    });
  }

  // Limiter au count demandé (0 = tous)
  if (count > 0) entries = entries.slice(0, count);

  // Mélanger sauf pour "anciens" (déjà trié)
  if (critere !== 'anciens') shuffle(entries);

  return entries;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── EXPORT / IMPORT COMPLET ─────────────────────────────────────────────
export async function exportAll() {
  const vocab = await getAllVocab();
  const kanji = await getAllKanji();
  return JSON.stringify({ vocab, kanji }, null, 2);
}

export async function importAll(data, keepScores) {
  const SCORE_FIELDS = ['score_jpfr','score_frjp','consec_jpfr','consec_frjp',
                        'derniere_vue_jpfr','derniere_vue_frjp','err_consec_jpfr','err_consec_frjp'];
  const restore = async (store, entries, keyFn) => {
    if (!keepScores) {
      await clear(store);
      for (const e of entries) await put(store, e);
    } else {
      for (const e of entries) {
        const existing = await get(store, keyFn(e));
        const scores = {};
        if (existing) SCORE_FIELDS.forEach(f => { scores[f] = existing[f]; });
        await put(store, { ...e, ...scores });
      }
    }
  };
  if (data.vocab) await restore('vocab', data.vocab, e => e.mot);
  if (data.kanji) await restore('kanji', data.kanji, e => e.kanji);
}

// ── VALIDATION IMPORT ───────────────────────────────────────────────────
export function validateEntry(e) {
  const errors = [];
  if (!e || typeof e !== 'object') { errors.push('Format invalide'); return errors; }
  if (e.type === 'kanji') {
    if (!e.kanji)          errors.push('Champ "kanji" manquant');
    if (!e.listes?.length) errors.push('Champ "listes" manquant');
    if (!e.sens?.length)   errors.push('Champ "sens" manquant');
  } else {
    if (!e.mot)            errors.push('Champ "mot" manquant');
    if (!e.hiragana)       errors.push('Champ "hiragana" manquant');
    if (!e.traductions?.length) errors.push('Champ "traductions" manquant');
    if (!e.listes?.length) errors.push('Champ "listes" manquant');
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

export function search(query, type) {
  if (!_searchIndex) return [];
  const q = query.toLowerCase().trim().replace(/\s/g, '');
  if (!q) return _searchIndex.filter(e => type === 'les2' || e.type === type || (type === 'vocab' && e.type !== 'kanji') || (type === 'kanji' && e.type === 'kanji'));

  return _searchIndex.filter(e => {
    if (type !== 'les2') {
      if (type === 'kanji' && e.type !== 'kanji') return false;
      if (type === 'vocab' && e.type === 'kanji') return false;
    }
    const mot   = (e.mot || e.kanji || '').toLowerCase().replace(/\s/g, '');
    const hira  = (e.hiragana || '').replace(/\s/g, '');
    const roma  = (e.romaji || '').toLowerCase().replace(/\s/g, '');
    const sens  = (e.traductions || e.sens || []).join(' ').toLowerCase();
    return mot.includes(q) || hira.includes(q) || roma.includes(q) || sens.includes(q);
  });
}
