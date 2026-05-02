// screens/focus.js — Écran de configuration de l'objectif Focus
import { getAllListes, getAllVocab, getAllKanji } from '../db.js';
import { goBack, registerScreen } from '../router.js';
import { getGlobalFilter, setGlobalFilter, isFocusEnabled, setFocusEnabled, applyFocusFilter } from '../focus-state.js';
import { getSelectedListes, setSelectedListes } from '../lists-state.js';

const FREQ_LABELS_ALL = ['essentiel', 'très courant', 'courant', 'rare', 'inusité'];

let _draft = { listes: [], freqLabels: [] };
let _allListes = [];
let _collapsedCategories = new Set();

export function initFocus() {
  registerScreen('screen-focus', { enter: enterFocus });

  document.getElementById('focus-back').addEventListener('click', () => goBack());

  document.getElementById('focus-save').addEventListener('click', async () => {
    setGlobalFilter(_draft);
    const hasFilter = _draft.listes.length > 0 || _draft.freqLabels.length > 0;
    if (hasFilter && !isFocusEnabled()) {
      setFocusEnabled(true);
    }
    if (isFocusEnabled()) {
      await cleanQuizListesForFocus();
    }
    window.dispatchEvent(new Event('focus-changed'));
    goBack();
  });

  document.getElementById('focus-listes-chips').addEventListener('click', e => {
    const catBtn = e.target.closest('[data-cat-toggle]');
    if (catBtn) {
      const cat = catBtn.dataset.catToggle;
      if (_collapsedCategories.has(cat)) _collapsedCategories.delete(cat);
      else _collapsedCategories.add(cat);
      renderListesChips(_draft.listes);
      return;
    }
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
  const saved = getGlobalFilter();
  _draft = { listes: [...saved.listes], freqLabels: [...saved.freqLabels] };

  _allListes = await getAllListes();

  // Catégories avec sélection active → dépliées ; autres → repliées par défaut
  const groups = groupByCategory(_allListes);
  _collapsedCategories = new Set(
    Object.keys(groups).filter(cat => !groups[cat].some(l => _draft.listes.includes(l)))
  );

  renderListesChips(_draft.listes);
  renderFreqChips(_draft.freqLabels);
}

function extractCategory(listeName) {
  const match = listeName.match(/^(\S+)/);
  return match ? match[1] : listeName;
}

function groupByCategory(listes) {
  const groups = {};
  listes.forEach(l => {
    const cat = extractCategory(l);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(l);
  });
  return groups;
}

function chipStyle(active) {
  return `style="padding:6px 12px;border-radius:20px;font-size:13px;cursor:pointer;
    border:1px solid var(--${active ? 'blue' : 'border'});
    background:${active ? 'var(--blue)' : 'var(--bg2)'};
    color:${active ? '#fff' : 'var(--blue)'}"`;
}

function renderListesChips(selectedListes) {
  const container = document.getElementById('focus-listes-chips');
  if (!_allListes.length) {
    container.innerHTML = '<span style="font-size:13px;color:var(--gray)">Aucune liste en base</span>';
    return;
  }

  const groups = groupByCategory(_allListes);
  const categories = Object.keys(groups).sort();

  container.innerHTML = categories.map(cat => {
    const collapsed = _collapsedCategories.has(cat);
    const listes = groups[cat];
    const selectedCount = listes.filter(l => selectedListes.includes(l)).length;
    const countLabel = selectedCount > 0 ? ` · ${selectedCount} sél.` : '';

    const chips = listes.map(l => {
      const active = selectedListes.includes(l);
      return `<button data-liste="${escAttr(l)}" ${chipStyle(active)}>${escHtml(l)}</button>`;
    }).join('');

    return `
      <div class="focus-cat">
        <button class="focus-cat-header" data-cat-toggle="${escAttr(cat)}">
          <span class="focus-cat-name">${escHtml(cat)}</span>
          <span class="focus-cat-meta">${listes.length} liste${listes.length > 1 ? 's' : ''}${countLabel}</span>
          <span class="focus-cat-arrow">${collapsed ? '▶' : '▼'}</span>
        </button>
        <div class="focus-cat-chips" style="display:${collapsed ? 'none' : 'flex'};flex-wrap:wrap;gap:8px;padding:8px 0 4px;">
          ${chips}
        </div>
      </div>`;
  }).join('');
}

function renderFreqChips(selectedFreqs) {
  const container = document.getElementById('focus-freq-chips');
  container.innerHTML = FREQ_LABELS_ALL.map(label => {
    const active = selectedFreqs.includes(label);
    return `<button data-freq="${label}" ${chipStyle(active)}>${label}</button>`;
  }).join('');
}

function updateFocusToggleState() {
  const empty = _draft.listes.length === 0 && _draft.freqLabels.length === 0;
  document.querySelectorAll('[data-focus-toggle]').forEach(btn => {
    btn.disabled = empty;
  });
}

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
