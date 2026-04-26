// screens/quiz-params.js
import { getListes, getCardsForQuiz } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { getSelectedType } from '../type-state.js';
import * as listsState from '../lists-state.js';

export function initQuizParams() {
  registerScreen('screen-quiz-params', { enter: enterParams });
  document.getElementById('qp-back').onclick  = () => goBack();
  document.getElementById('qp-start').onclick = () => startQuiz();

  document.querySelectorAll('[name="qp-type"]').forEach(r =>
    r.addEventListener('change', () => toggleSens()));
  document.getElementById('qp-sens-jpfr').addEventListener('click', () => {
    document.querySelector('[name=qp-sens][value=jpfr]').checked = true;
    document.getElementById('qp-sens-jpfr').classList.add('active');
    document.getElementById('qp-sens-frjp').classList.remove('active');
    toggleSens();
    refreshSlider();
  });
  document.getElementById('qp-sens-frjp').addEventListener('click', () => {
    document.querySelector('[name=qp-sens][value=frjp]').checked = true;
    document.getElementById('qp-sens-frjp').classList.add('active');
    document.getElementById('qp-sens-jpfr').classList.remove('active');
    toggleSens();
    refreshSlider();
  });
  document.querySelectorAll('[name="qp-critere"]').forEach(r =>
    r.addEventListener('change', () => refreshSlider()));
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

  // Reload listes when category changes via global toggle
  window.addEventListener('type-changed', () => {
    if (document.getElementById('screen-quiz-params').classList.contains('active')) loadListes();
  });
}

async function enterParams() {
  const type = getSelectedType();
  const allListes = await getListes(type);
  listsState.initializeSelectedListes(allListes);
  await loadListes();
  toggleSens();

  const autoplayMode = listsState.getAutoplayMode();
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

async function loadListes() {
  const selectedListes = listsState.getSelectedListes();
  const container = document.getElementById('qp-listes');

  if (selectedListes.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--gray)">Aucune liste sélectionnée</p>';
  } else {
    const groups = groupListesByCategory(selectedListes);
    const categories = Object.keys(groups).sort();
    const html = categories
      .map(cat => `<div style="margin-bottom:8px;">${esc(groups[cat].join(' · '))}</div>`)
      .join('');
    container.innerHTML = `<div style="font-size:14px;color:var(--blue);">${html}</div>`;
  }

  await refreshSlider();
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function refreshSlider() {
  const type    = getSelectedCategory();
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const sensType = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens    = sensType === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const listes  = listsState.getSelectedListes();
  const cards   = await getCardsForQuiz({ type, listes, critere, sens, count: 0 });
  const slider  = document.getElementById('qp-slider');
  const prev    = listsState.getSliderValue();
  slider.max    = cards.length;
  slider.value  = Math.min(prev, cards.length);
  document.getElementById('qp-slider-val').textContent = slider.value;
  document.getElementById('qp-slider-max').textContent = `${cards.length} disponibles`;
}

function toggleSens() {
  const type = document.querySelector('[name="qp-type"]:checked')?.value;
  const sens = document.querySelector('[name="qp-sens"]:checked')?.value;
  document.getElementById('qp-sens-section').style.display =
    type === 'comprehension' ? 'block' : 'none';
  document.getElementById('qp-autoplay-section').style.display =
    (type === 'comprehension' && sens === 'jpfr') ? 'block' : 'none';
}

async function startQuiz() {
  const cat     = getSelectedCategory();
  const type    = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens    = type === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const count   = parseInt(document.getElementById('qp-slider').value) || 0;
  const listes  = listsState.getSelectedListes();
  const autoplay = (type === 'comprehension' && sens === 'jpfr')
    ? (document.querySelector('[name="qp-autoplay"]:checked')?.value || 'silence')
    : 'silence';
  const cards   = await getCardsForQuiz({ type: cat, listes, critere, sens, count });
  if (!cards.length) { alert('Aucune carte disponible avec ces critères.'); return; }
  navigate('screen-quiz', { cards, cards_initial: cards, type, sens, cat, critere, listes, autoplay });
}
