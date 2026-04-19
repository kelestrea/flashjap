// screens/home.js
import { getAllVocab, getAllKanji, getStatutGlobal, STATUT_COLOR, buildSearchIndex } from '../db.js';
import { navigate, registerScreen } from '../router.js';
import { ICONS } from '../icons.js';

let _type = 'vocab';

export function initHome() {
  registerScreen('screen-home', { enter: enterHome });

  document.getElementById('home-quiz-btn').onclick    = () => navigate('screen-quiz-params');
  document.getElementById('home-data-btn').onclick    = () => navigate('screen-data');
  document.getElementById('home-search-btn').onclick  = () => navigate('screen-search');
  document.getElementById('home-toggle-vocab').onclick = () => setType('vocab');
  document.getElementById('home-toggle-kanji').onclick = () => setType('kanji');
}

async function enterHome() {
  await buildSearchIndex();
  await renderStats();
}

function setType(t) {
  _type = t;
  document.getElementById('home-toggle-vocab').classList.toggle('active', t === 'vocab');
  document.getElementById('home-toggle-kanji').classList.toggle('active', t === 'kanji');
  renderStats();
}

async function renderStats() {
  const entries = _type === 'vocab' ? await getAllVocab() : await getAllKanji();

  let maitrise = 0, encours = 0, etudie = 0, noncommence = 0, areviser = 0;
  const THREE_WEEKS = 21 * 24 * 3600 * 1000;
  const now = Date.now();

  entries.forEach(e => {
    const sg = getStatutGlobal(e);
    if (sg === 'maitrise')    maitrise++;
    else if (sg === 'encours') encours++;
    else if (sg === 'etudie')  etudie++;
    else                        noncommence++;

    // À réviser : non maîtrisé OU revu il y a longtemps
    const vue = Math.min(e.derniere_vue_jpfr || 0, e.derniere_vue_frjp || 0) || 0;
    if (sg !== 'maitrise' || (now - vue) >= THREE_WEEKS) areviser++;
  });

  const total = entries.length;
  const pct = total ? Math.round(maitrise / total * 100) : 0;

  // Donut
  const circ = 2 * Math.PI * 36;
  const mArc  = total ? maitrise  / total * circ : 0;
  const eArc  = total ? encours   / total * circ : 0;
  const stArc = total ? etudie    / total * circ : 0;

  const donutSvg = document.getElementById('home-donut');
  donutSvg.innerHTML = `
    <circle cx="45" cy="45" r="36" fill="none" stroke="var(--bg2)" stroke-width="12"/>
    <circle cx="45" cy="45" r="36" fill="none" stroke="${STATUT_COLOR.maitrise}" stroke-width="12"
      stroke-dasharray="${mArc} ${circ-mArc}" stroke-dashoffset="57" stroke-linecap="butt"/>
    <circle cx="45" cy="45" r="36" fill="none" stroke="${STATUT_COLOR.encours}" stroke-width="12"
      stroke-dasharray="${eArc} ${circ-eArc}" stroke-dashoffset="${57-mArc}" stroke-linecap="butt"/>
    <circle cx="45" cy="45" r="36" fill="none" stroke="${STATUT_COLOR.etudie}" stroke-width="12"
      stroke-dasharray="${stArc} ${circ-stArc}" stroke-dashoffset="${57-mArc-eArc}" stroke-linecap="butt"/>
  `;

  document.getElementById('home-pct').textContent    = pct + '%';
  document.getElementById('home-maitrise').textContent  = maitrise;
  document.getElementById('home-encours').textContent   = encours;
  document.getElementById('home-etudie').textContent    = etudie;
  document.getElementById('home-non').textContent       = noncommence;
  document.getElementById('home-areviser').textContent  = areviser;
  document.getElementById('home-total').textContent     = total;
}
