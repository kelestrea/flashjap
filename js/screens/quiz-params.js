// screens/quiz-params.js
import { getListes, getCardsForQuiz, getAllVocab, getAllKanji } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { getSelectedType } from '../type-state.js';
import * as listsState from '../lists-state.js';
import { isFocusEnabled, getGlobalFilter, applyFocusFilter } from '../focus-state.js';

const FREQ_LABELS_ALL = ['essentiel', 'très courant', 'courant', 'rare', 'inusité'];
let _enterParamsId = 0;

export function initQuizParams() {
  registerScreen('screen-quiz-params', { enter: enterParams });
  document.getElementById('qp-back').onclick  = () => goBack();
  document.getElementById('qp-start').onclick = () => startQuiz();

  document.getElementById('qp-type-lecture').addEventListener('click', () => {
    document.querySelector('[name=qp-type][value=lecture]').checked = true;
    document.getElementById('qp-type-lecture').classList.add('active');
    document.getElementById('qp-type-comprehension').classList.remove('active');
    listsState.setQuizType('lecture');
    toggleSens();
    refreshSlider();
  });
  document.getElementById('qp-type-comprehension').addEventListener('click', () => {
    document.querySelector('[name=qp-type][value=comprehension]').checked = true;
    document.getElementById('qp-type-comprehension').classList.add('active');
    document.getElementById('qp-type-lecture').classList.remove('active');
    listsState.setQuizType('comprehension');
    toggleSens();
    refreshSlider();
  });

  document.getElementById('qp-sens-jpfr').addEventListener('click', () => {
    document.querySelector('[name=qp-sens][value=jpfr]').checked = true;
    document.getElementById('qp-sens-jpfr').classList.add('active');
    document.getElementById('qp-sens-frjp').classList.remove('active');
    listsState.setQuizSens('jpfr');
    toggleSens();
    refreshSlider();
  });
  document.getElementById('qp-sens-frjp').addEventListener('click', () => {
    document.querySelector('[name=qp-sens][value=frjp]').checked = true;
    document.getElementById('qp-sens-frjp').classList.add('active');
    document.getElementById('qp-sens-jpfr').classList.remove('active');
    listsState.setQuizSens('frjp');
    toggleSens();
    refreshSlider();
  });

  document.querySelectorAll('[name="qp-critere"]').forEach(r =>
    r.addEventListener('change', () => {
      listsState.setQuizCritere(r.value);
      refreshSlider();
    })
  );

  document.querySelectorAll('[name="qp-autoplay"]').forEach(r =>
    r.addEventListener('change', () => listsState.setAutoplayMode(r.value)));

  const slider = document.getElementById('qp-slider');
  slider.oninput = () => {
    document.getElementById('qp-slider-val').textContent = slider.value;
    listsState.setSliderValue(slider.value);
  };

  const manageBtn = document.getElementById('qp-manage-listes');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      navigate('screen-list-selection', { type: getSelectedType() });
    });
  }

  document.getElementById('qp-filter-listes').addEventListener('click', () => applyFilterMode('listes'));
  document.getElementById('qp-filter-freq').addEventListener('click', () => applyFilterMode('frequence'));

  document.getElementById('qp-freq-chips').addEventListener('click', e => {
    const chip = e.target.closest('.freq-chip');
    if (!chip) return;
    const label = chip.dataset.label;
    const labels = listsState.getFreqLabels();
    const idx = labels.indexOf(label);
    if (idx >= 0) labels.splice(idx, 1);
    else labels.push(label);
    listsState.setFreqLabels(labels);
    renderChips(labels);
    refreshSlider();
  });

  // Reload all params when category changes via global toggle
  window.addEventListener('type-changed', () => {
    if (document.getElementById('screen-quiz-params').classList.contains('active')) enterParams();
  });
  window.addEventListener('focus-changed', () => {
    if (document.getElementById('screen-quiz-params').classList.contains('active')) enterParams();
  });
}

function applyFilterMode(mode) {
  listsState.setFilterMode(mode);
  const isFreq = mode === 'frequence';
  document.getElementById('qp-filter-listes').classList.toggle('active', !isFreq);
  document.getElementById('qp-filter-freq').classList.toggle('active', isFreq);
  document.getElementById('qp-listes-mode').style.display = isFreq ? 'none' : 'block';
  document.getElementById('qp-freq-mode').style.display = isFreq ? 'block' : 'none';
  refreshSlider();
}

function renderChips(selectedLabels) {
  const container = document.getElementById('qp-freq-chips');
  container.innerHTML = FREQ_LABELS_ALL.map(label => {
    const active = selectedLabels.includes(label);
    return `<button class="freq-chip${active ? ' active' : ''}" data-label="${label}"
      style="padding:6px 12px;border-radius:20px;font-size:13px;cursor:pointer;
      border:1px solid var(--border);
      background:${active ? 'var(--blue)' : 'var(--bg2)'};
      color:${active ? '#fff' : 'var(--blue)'}">${label}</button>`;
  }).join('');
}

function updateStartBtn(type) {
  const t = type || getSelectedType();
  const startBtn = document.getElementById('qp-start');
  if (listsState.getFilterMode(t) !== 'frequence') {
    startBtn.disabled = false;
    return;
  }
  const labels = listsState.getFreqLabels(t);
  const available = parseInt(document.getElementById('qp-slider').max) || 0;
  startBtn.disabled = labels.length === 0 || available === 0;
}

async function enterParams() {
  const id = ++_enterParamsId;
  const type = getSelectedType();
  const allListes = await getListes(type);
  if (id !== _enterParamsId) return;

  listsState.initializeSelectedListes(allListes, type);

  // Restaurer type de quiz (lecture/compréhension) — avant refreshSlider qui lit ce radio
  const quizType = listsState.getQuizType(type);
  document.getElementById('qp-type-lecture').classList.toggle('active', quizType === 'lecture');
  document.getElementById('qp-type-comprehension').classList.toggle('active', quizType === 'comprehension');
  document.querySelector(`[name=qp-type][value=${quizType}]`).checked = true;

  // Restaurer critère — avant refreshSlider qui lit ce radio
  const critere = listsState.getQuizCritere(type);
  document.querySelectorAll('[name="qp-critere"]').forEach(r => {
    r.checked = r.value === critere;
  });

  // Restaurer filter mode UI before loadListes calls refreshSlider
  const filterMode = listsState.getFilterMode(type);
  const isFreq = filterMode === 'frequence';
  document.getElementById('qp-filter-listes').classList.toggle('active', !isFreq);
  document.getElementById('qp-filter-freq').classList.toggle('active', isFreq);
  document.getElementById('qp-listes-mode').style.display = isFreq ? 'none' : 'block';
  document.getElementById('qp-freq-mode').style.display = isFreq ? 'block' : 'none';
  renderChips(listsState.getFreqLabels(type));

  await loadListes(type);
  if (id !== _enterParamsId) return;

  // Restaurer sens — après loadListes, en synchronisant radio caché + boutons toggle
  const quizSens = listsState.getQuizSens(type);
  document.querySelector(`[name=qp-sens][value=${quizSens}]`).checked = true;
  document.getElementById('qp-sens-jpfr').classList.toggle('active', quizSens === 'jpfr');
  document.getElementById('qp-sens-frjp').classList.toggle('active', quizSens === 'frjp');

  toggleSens();

  const autoplayMode = listsState.getAutoplayMode(type);
  const silenceBtn = document.getElementById('qp-autoplay-silence');
  const autoBtn    = document.getElementById('qp-autoplay-auto');
  if (autoplayMode === 'autoplay') {
    silenceBtn.classList.remove('active');
    autoBtn.classList.add('active');
    document.querySelector('[name=qp-autoplay][value=autoplay]').checked = true;
  } else {
    silenceBtn.classList.add('active');
    autoBtn.classList.remove('active');
    document.querySelector('[name=qp-autoplay][value=silence]').checked = true;
  }
}

function extractCategory(listeName) {
  const match = listeName.match(/^(\S+)/);
  return match ? match[1] : listeName;
}

function groupListesByCategory(listes) {
  const groups = {};
  listes.forEach(liste => {
    const cat = extractCategory(liste);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(liste);
  });
  return groups;
}

async function loadListes(type) {
  const selectedListes = listsState.getSelectedListes(type);
  let visibleListes = selectedListes;

  if (isFocusEnabled() && selectedListes.length > 0) {
    const focusFilter = getGlobalFilter();
    if (focusFilter.listes.length > 0 || focusFilter.freqLabels.length > 0) {
      const allEntries = type === 'vocab' ? await getAllVocab()
                       : type === 'kanji' ? await getAllKanji()
                       : [...await getAllVocab(), ...await getAllKanji()];
      const focusEntries = applyFocusFilter(allEntries);
      const listsInFocus = new Set(focusEntries.flatMap(e => e.listes || []));
      visibleListes = selectedListes.filter(l => listsInFocus.has(l));
    }
  }

  const container = document.getElementById('qp-listes');

  if (visibleListes.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--gray)">Aucune liste sélectionnée</p>';
  } else {
    const groups = groupListesByCategory(visibleListes);
    const categories = Object.keys(groups).sort();
    const html = categories.map(cat => {
      const listsHtml = groups[cat]
        .map(l => `<div style="font-size:14px;color:var(--blue);padding:2px 0;">${esc(l)}</div>`)
        .join('');
      return `<div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${esc(cat)}</div>
        ${listsHtml}
      </div>`;
    }).join('');
    container.innerHTML = html;
  }

  await refreshSlider(type);
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function refreshSlider(type) {
  const t        = type || getSelectedType();
  const critere  = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const sensType = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens     = sensType === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');

  const focusFilter = isFocusEnabled() ? getGlobalFilter() : null;
  const filterMode = listsState.getFilterMode(t);
  let cards;
  if (filterMode === 'frequence') {
    const freqLabels = listsState.getFreqLabels(t);
    cards = await getCardsForQuiz({ type: t, critere, sens, count: 0, filterMode: 'frequence', freqLabels });
  } else {
    const listes = listsState.getSelectedListes(t);
    cards = await getCardsForQuiz({ type: t, listes, critere, sens, count: 0, focusFilter });
  }

  const slider = document.getElementById('qp-slider');
  const prev   = listsState.getSliderValue(t);
  slider.max   = cards.length;
  slider.value = Math.min(prev, cards.length);
  document.getElementById('qp-slider-val').textContent = slider.value;
  document.getElementById('qp-slider-max').textContent = `${cards.length} disponibles`;
  updateStartBtn(t);
}

function toggleSens() {
  const type = document.querySelector('[name="qp-type"]:checked')?.value;
  const sens = document.querySelector('[name="qp-sens"]:checked')?.value;
  document.getElementById('qp-sens-section').style.display =
    type === 'comprehension' ? 'block' : 'none';
  document.getElementById('qp-autoplay-section').style.display =
    (type === 'lecture' || (type === 'comprehension' && sens === 'jpfr')) ? 'block' : 'none';
}

async function startQuiz() {
  const cat     = getSelectedType();
  const type    = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens    = type === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const count   = parseInt(document.getElementById('qp-slider').value) || 0;
  const autoplay = (type === 'lecture' || (type === 'comprehension' && sens === 'jpfr'))
    ? (document.querySelector('[name="qp-autoplay"]:checked')?.value || 'silence')
    : 'silence';

  const focusFilter = isFocusEnabled() ? getGlobalFilter() : null;
  const filterMode = listsState.getFilterMode();
  let cards;
  if (filterMode === 'frequence') {
    const freqLabels = listsState.getFreqLabels();
    cards = await getCardsForQuiz({ type: cat, critere, sens, count, filterMode: 'frequence', freqLabels });
    if (!cards.length) return;
  } else {
    const listes = listsState.getSelectedListes();
    cards = await getCardsForQuiz({ type: cat, listes, critere, sens, count, focusFilter });
    if (!cards.length) { alert('Aucune carte disponible avec ces critères.'); return; }
  }

  navigate('screen-quiz', { cards, cards_initial: cards, type, sens, cat, critere, listes: listsState.getSelectedListes(), autoplay });
}
