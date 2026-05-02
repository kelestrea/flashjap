// screens/focus.js — Écran de configuration de l'objectif Focus
import { getAllListes, getAllVocab, getAllKanji } from '../db.js';
import { goBack, registerScreen } from '../router.js';
import { getGlobalFilter, setGlobalFilter, isFocusEnabled, applyFocusFilter } from '../focus-state.js';
import { getSelectedListes, setSelectedListes } from '../lists-state.js';

const FREQ_LABELS_ALL = ['essentiel', 'très courant', 'courant', 'rare', 'inusité'];

let _draft = { listes: [], freqLabels: [] };

export function initFocus() {
  registerScreen('screen-focus', { enter: enterFocus });

  document.getElementById('focus-back').addEventListener('click', () => goBack());

  document.getElementById('focus-save').addEventListener('click', async () => {
    setGlobalFilter(_draft);
    if (isFocusEnabled()) {
      await cleanQuizListesForFocus();
    }
    window.dispatchEvent(new Event('focus-changed'));
    goBack();
  });

  document.getElementById('focus-listes-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-liste]');
    if (!chip) return;
    const liste = chip.dataset.liste;
    const idx = _draft.listes.indexOf(liste);
    if (idx >= 0) _draft.listes.splice(idx, 1);
    else _draft.listes.push(liste);
    renderListesChips(_draft.listes);
    updateFocusToggleState();
  });

  document.getElementById('focus-freq-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-freq]');
    if (!chip) return;
    const label = chip.dataset.freq;
    const idx = _draft.freqLabels.indexOf(label);
    if (idx >= 0) _draft.freqLabels.splice(idx, 1);
    else _draft.freqLabels.push(label);
    renderFreqChips(_draft.freqLabels);
    updateFocusToggleState();
  });
}

async function enterFocus() {
  // Initialiser le draft depuis globalFilter courant
  const saved = getGlobalFilter();
  _draft = { listes: [...saved.listes], freqLabels: [...saved.freqLabels] };

  // Charger toutes les listes disponibles (vocab + kanji confondus)
  const allListes = await getAllListes();
  renderListesChips(_draft.listes, allListes);
  renderFreqChips(_draft.freqLabels);
}

function chipStyle(active) {
  return `style="padding:6px 12px;border-radius:20px;font-size:13px;cursor:pointer;
    border:1px solid var(--${active ? 'blue' : 'border'});
    background:${active ? 'var(--blue)' : 'var(--bg2)'};
    color:${active ? '#fff' : 'var(--blue)'}"`;
}

function renderListesChips(selectedListes, allListes) {
  const container = document.getElementById('focus-listes-chips');
  const available = allListes || Array.from(container.querySelectorAll('[data-liste]')).map(c => c.dataset.liste);
  if (!available.length) {
    container.innerHTML = '<span style="font-size:13px;color:var(--gray)">Aucune liste en base</span>';
    return;
  }
  container.innerHTML = available.map(l => {
    const active = selectedListes.includes(l);
    return `<button data-liste="${escAttr(l)}" ${chipStyle(active)}>${escHtml(l)}</button>`;
  }).join('');
}

function renderFreqChips(selectedFreqs) {
  const container = document.getElementById('focus-freq-chips');
  container.innerHTML = FREQ_LABELS_ALL.map(label => {
    const active = selectedFreqs.includes(label);
    return `<button data-freq="${label}" ${chipStyle(active)}>${label}</button>`;
  }).join('');
}

// Met à jour le disabled du bouton Focus dans le header sans déclencher focus-changed
function updateFocusToggleState() {
  const empty = _draft.listes.length === 0 && _draft.freqLabels.length === 0;
  document.querySelectorAll('[data-focus-toggle]').forEach(btn => {
    btn.disabled = empty;
  });
}

// Nettoyage silencieux des listes quiz sélectionnées pour les deux types,
// en retirant celles qui n'ont pas d'entrée dans le sous-ensemble Focus courant.
async function cleanQuizListesForFocus() {
  for (const type of ['vocab', 'kanji']) {
    const allEntries = type === 'vocab' ? await getAllVocab() : await getAllKanji();
    const subset = applyFocusFilter(allEntries);
    const listsInSubset = new Set(subset.flatMap(e => e.listes || []));
    const selected = getSelectedListes(type);
    if (!selected.length) continue;
    const cleaned = selected.filter(l => listsInSubset.has(l));
    if (cleaned.length > 0 && cleaned.length < selected.length) {
      setSelectedListes(cleaned, type);
    }
  }
}

function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
