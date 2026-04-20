// screens/quiz-params.js
import { getListes, getCardsForQuiz } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { getHomeType } from './home.js';
import * as listsState from '../lists-state.js';

export function initQuizParams() {
  registerScreen('screen-quiz-params', { enter: enterParams });
  document.getElementById('qp-back').onclick  = () => goBack();
  document.getElementById('qp-start').onclick = () => startQuiz();

  document.querySelectorAll('[name="qp-cat"]').forEach(r =>
    r.addEventListener('change', () => loadListes()));
  document.querySelectorAll('[name="qp-type"]').forEach(r =>
    r.addEventListener('change', () => toggleSens()));
  document.querySelectorAll('[name="qp-critere"]').forEach(r =>
    r.addEventListener('change', () => refreshSlider()));

  const slider = document.getElementById('qp-slider');
  slider.oninput = () => document.getElementById('qp-slider-val').textContent = slider.value;

  const manageBtn = document.getElementById('qp-manage-listes');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      const type = document.querySelector('[name="qp-cat"]:checked')?.value || 'vocab';
      navigate('screen-list-selection', { type });
    });
  }
}

async function enterParams() {
  // Pré-cocher selon toggle accueil
  const homeType = getHomeType();
  document.querySelectorAll('[name="qp-cat"]').forEach(r => {
    r.checked = r.value === homeType;
  });
  const type = document.querySelector('[name="qp-cat"]:checked')?.value || 'vocab';
  const allListes = await getListes(type);
  listsState.initializeSelectedListes(allListes);
  await loadListes();
  toggleSens();
}

async function loadListes() {
  const selectedListes = listsState.getSelectedListes();
  const container = document.getElementById('qp-listes');

  if (selectedListes.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--gray)">Aucune liste sélectionnée</p>';
  } else {
    const listesText = selectedListes.join('; ');
    container.innerHTML = `<p style="font-size:14px;color:var(--blue);">${esc(listesText)}</p>`;
  }

  await refreshSlider();
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function refreshSlider() {
  const type    = document.querySelector('[name="qp-cat"]:checked')?.value || 'vocab';
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const sensType = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens    = sensType === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const listes  = listsState.getSelectedListes();
  const cards   = await getCardsForQuiz({ type, listes, critere, sens, count: 0 });
  const slider  = document.getElementById('qp-slider');
  const prev    = parseInt(slider.value) || 20;
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
  const cat     = document.querySelector('[name="qp-cat"]:checked')?.value || 'vocab';
  const type    = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens    = type === 'lecture' ? 'lecture' : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const count   = parseInt(document.getElementById('qp-slider').value) || 0;
  const listes  = listsState.getSelectedListes();
  const cards   = await getCardsForQuiz({ type: cat, listes, critere, sens, count });
  if (!cards.length) { alert('Aucune carte disponible avec ces critères.'); return; }
  navigate('screen-quiz', { cards, type, sens, cat, critere, listes });
}
