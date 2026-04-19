// screens/quiz-params.js
import { getListes, getCardsForQuiz } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';

export function initQuizParams() {
  registerScreen('screen-quiz-params', { enter: enterParams });
  document.getElementById('qp-back').onclick    = () => goBack();
  document.getElementById('qp-start').onclick   = () => startQuiz();

  // Catégorie → recharger listes
  document.querySelectorAll('[name="qp-cat"]').forEach(r =>
    r.addEventListener('change', () => loadListes()));

  // Type → afficher/masquer sens
  document.querySelectorAll('[name="qp-type"]').forEach(r =>
    r.addEventListener('change', () => toggleSens()));

  // Slider
  const slider = document.getElementById('qp-slider');
  slider.oninput = () => document.getElementById('qp-slider-val').textContent = slider.value;
}

async function enterParams() {
  await loadListes();
  toggleSens();
}

async function loadListes() {
  const type = document.querySelector('[name="qp-cat"]:checked')?.value || 'vocab';
  const listes = await getListes(type === 'les2' ? null : type);
  const container = document.getElementById('qp-listes');
  container.innerHTML = listes.map(l => `
    <label class="check-item">
      <input type="checkbox" name="qp-liste" value="${l}" checked style="accent-color:var(--blue);width:16px;height:16px;margin-top:2px;">
      <span>${l}</span>
    </label>
  `).join('') || '<p style="font-size:13px;color:var(--gray)">Aucune liste disponible</p>';

  // Mettre à jour le slider
  updateSlider(type, listes);
}

async function updateSlider(type, listes) {
  const { length } = await getCardsForQuiz({
    type, listes, critere: 'tous', sens: 'jpfr', count: 0
  });
  const slider = document.getElementById('qp-slider');
  slider.max = length;
  slider.value = Math.min(parseInt(slider.value) || 20, length);
  document.getElementById('qp-slider-val').textContent = slider.value;
  document.getElementById('qp-slider-max').textContent = `${length} disponibles`;
}

function toggleSens() {
  const type = document.querySelector('[name="qp-type"]:checked')?.value;
  document.getElementById('qp-sens-section').style.display =
    type === 'comprehension' ? 'block' : 'none';
}

async function startQuiz() {
  const cat    = document.querySelector('[name="qp-cat"]:checked')?.value || 'vocab';
  const type   = document.querySelector('[name="qp-type"]:checked')?.value || 'lecture';
  const sens   = type === 'lecture' ? 'jpfr'
               : (document.querySelector('[name="qp-sens"]:checked')?.value || 'jpfr');
  const critere = document.querySelector('[name="qp-critere"]:checked')?.value || 'tous';
  const count  = parseInt(document.getElementById('qp-slider').value) || 0;
  const listes = [...document.querySelectorAll('[name="qp-liste"]:checked')].map(c => c.value);

  const cards = await getCardsForQuiz({ type: cat, listes, critere, sens: type === 'lecture' ? 'lecture' : sens, count });
  if (!cards.length) {
    alert('Aucune carte disponible avec ces critères.');
    return;
  }

  navigate('screen-quiz', { cards, type, sens, cat, critere, listes });
}
