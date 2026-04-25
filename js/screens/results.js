// screens/results.js
import { getStatutGlobal, STATUT_COLOR, shuffle } from '../db.js';
import { navigate, registerScreen } from '../router.js';
import { renderVocabCard } from '../components/card-vocab.js';
import { renderKanjiCard }  from '../components/card-kanji.js';

let _state = {};

export function initResults() {
  registerScreen('screen-results', { enter: enterResults });
}

async function enterResults(state) {
  _state = state;
  const { errors, total, correct, params } = state;
  const pct = total ? Math.round(correct / total * 100) : 0;

  // Donut
  const circ = 2 * Math.PI * 32;
  const cArc = correct / total * circ;
  const eArc = errors.length / total * circ;
  document.getElementById('results-donut').innerHTML = `
    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg2)" stroke-width="10"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="#1D9E75" stroke-width="10"
      stroke-dasharray="${cArc} ${circ-cArc}" stroke-dashoffset="50" stroke-linecap="butt"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="#E24B4A" stroke-width="10"
      stroke-dasharray="${eArc} ${circ-eArc}" stroke-dashoffset="${50-cArc}" stroke-linecap="butt"/>
  `;
  document.getElementById('results-pct').textContent     = pct + '%';
  document.getElementById('results-correct').textContent = correct;
  document.getElementById('results-errors').textContent  = errors.length;

  document.getElementById('results-badge').textContent =
    `${params.type === 'lecture' ? 'Lecture' : 'Compréhension'} · ${total} cartes`;

  // Boutons : construits dynamiquement selon présence d'erreurs
  const actions = document.getElementById('results-actions');
  if (errors.length > 0) {
    actions.innerHTML = `
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" id="results-restart">Recommencer</button>
        <button class="btn" style="flex:1;background:var(--amber);color:var(--bg);" id="results-retry">Rejouer les erreurs</button>
      </div>
      <button class="btn btn-ghost" id="results-home">Accueil</button>
    `;
    document.getElementById('results-restart').onclick = () => restartQuiz();
    document.getElementById('results-retry').onclick   = () => retryErrors();
    document.getElementById('results-home').onclick    = () => navigate('screen-home');
  } else {
    actions.innerHTML = `
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" style="flex:1;" id="results-home">Accueil</button>
        <button class="btn btn-primary" style="flex:1;" id="results-restart">Recommencer</button>
      </div>
    `;
    document.getElementById('results-restart').onclick = () => restartQuiz();
    document.getElementById('results-home').onclick    = () => navigate('screen-home');
  }

  // Liste des erreurs
  const list = document.getElementById('results-list');
  if (!errors.length) {
    list.innerHTML = '<p style="padding:16px 20px;font-size:13px;color:var(--gray)">Aucune erreur — bravo !</p>';
    return;
  }

  list.innerHTML = errors.map(e => {
    const sg    = getStatutGlobal(e);
    const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
    const mot   = e.mot || e.kanji || '';
    const sens  = (e.traductions || e.sens || [])[0] || '';

    let readings = '';
    if (e.type === 'kanji') {
      const kun = e.lectures_kun && e.lectures_kun.length > 0 ? e.lectures_kun[0] : '';
      const on = e.lectures_on && e.lectures_on.length > 0 ? e.lectures_on[0] : '';
      readings = [kun, on].filter(Boolean).join(' · ');
    } else {
      readings = e.hiragana || '';
    }

    return `
      <div class="list-item" data-key="${mot}" data-ktype="${e.type || 'vocab'}">
        <span class="kanji">${mot}</span>
        <div class="info">
          <div class="main">${sens}</div>
          <div class="sub" style="color:var(--gray);">${readings}</div>
        </div>
        <span class="dot" style="background:${color}"></span>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.list-item').forEach(item => {
    item.onclick = () => {
      const card = errors.find(e => (e.mot || e.kanji) === item.dataset.key);
      if (!card) return;
      if (item.dataset.ktype === 'kanji') renderKanjiCard(card);
      else renderVocabCard(card);
    };
  });
}

function restartQuiz() {
  const cards = [..._state.cards_initial];
  shuffle(cards);
  navigate('screen-quiz', {
    cards,
    cards_initial: _state.cards_initial,
    type:          _state.params.type,
    sens:          _state.params.sens,
    cat:           _state.params.cat,
    critere:       _state.params.critere,
    listes:        _state.params.listes,
    autoplay:      _state.params.autoplay,
  });
}

function retryErrors() {
  navigate('screen-quiz', {
    cards:         _state.errors,
    cards_initial: _state.cards_initial,
    type:          _state.params.type,
    sens:          _state.params.sens,
    cat:           _state.params.cat,
    critere:       _state.params.critere,
    listes:        _state.params.listes,
    autoplay:      _state.params.autoplay,
  });
}
