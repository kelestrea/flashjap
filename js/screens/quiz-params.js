// screens/quiz-params.js
import { getListes, getCardsForQuiz } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { getHomeType } from './home.js';
import * as listsState from '../lists-state.js';

export function initQuizParams() {
  registerScreen('screen-quiz-params', { enter: enterParams });
  document.getElementById('qp-back').onclick  = () => goBack();
  document.getElementById('qp-start').onclick = () => startQuiz();

  document.getElementById('qp-toggle-vocab').addEventListener('click', () => {
    document.getElementById('qp-toggle-vocab').classList.add('active');
    document.getElementById('qp-toggle-kanji').classList.remove('active');
    loadListes();
  });

  document.getElementById('qp-toggle-kanji').addEventListener('click', () => {
    document.getElementById('qp-toggle-kanji').classList.add('active');
    document.getElementById('qp-toggle-vocab').classList.remove('active');
    loadListes();
  });

  document.querySelectorAll('[name="qp-type"]').forEach(r =>
    r.addEventListener('change', () => toggleSens()));
  document.querySelectorAll('[name="qp-critere"]').forEach(r =>
    r.addEventListener('change', () => refreshSlider()));

  const slider = document.getElementById('qp-slider');
  slider.oninput = () => {
    document.getElementById('qp-slider-val').textContent = slider.value;
    listsState.setSliderValue(slider.value);
  };

  const manageBtn = document.getElementById('qp-manage-listes');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      const type = getSelectedCategory();
      navigate('screen-list-selection', { type });
    });
  }
}

function getSelectedCategory() {
  return document.getElementById('qp-toggle-vocab').classList.contains('active') ? 'vocab' : 'kanji';
}

async function enterParams() {
  // Pré-cocher selon toggle accueil
  const homeType = getHomeType();
  const vocabBtn = document.getElementById('qp-toggle-vocab');
  const kanjiBtn = document.getElementById('qp-toggle-kanji');

  if (homeType === 'kanji') {
    vocabBtn.classList.remove('active');
    kanjiBtn.classList.add('active');
  } else {
    vocabBtn.classList.add('active');
    kanjiBtn.classList.remove('active');
  }

  const type = getSelectedCategory();
  const allListes = await getListes(type);
  listsState.initializeSelectedListes(allListes);
  await loadListes();
  toggleSens();
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
  document.getElementById('qp-sens-section').style.display =
    type === 'comprehension' ? 'block' : 'none';
}

async function startQuiz() {
  const cat     = getSelectedCategory();
  const type    = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens    = type === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const count   = parseInt(document.getElementById('qp-slider').value) || 0;
  const listes  = listsState.getSelectedListes();
  const cards   = await getCardsForQuiz({ type: cat, listes, critere, sens, count });
  if (!cards.length) { alert('Aucune carte disponible avec ces critères.'); return; }
  navigate('screen-quiz', { cards, type, sens, cat, critere, listes });
}
