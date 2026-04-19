// screens/quiz.js
import { updateScore, getStatutGlobal, STATUT_COLOR } from '../db.js';
import { navigate, goBack, registerScreen, replaceState, currentState } from '../router.js';
import { speak } from '../audio.js';
import { renderVocabCard } from '../components/card-vocab.js';
import { renderKanjiCard }  from '../components/card-kanji.js';
import { ICONS } from '../icons.js';

let _state = {};

export function initQuiz() {
  registerScreen('screen-quiz', { enter: enterQuiz });
  document.getElementById('quiz-back').onclick    = () => goBack();
  document.getElementById('quiz-play').onclick    = () => speak(currentWord());
  document.getElementById('quiz-validate').onclick = () => validate();
  document.getElementById('quiz-eye').onclick     = () => toggleReading();
  document.getElementById('quiz-next').onclick    = () => nextCard();
  document.getElementById('quiz-fiche').onclick   = () => openFiche();
  document.getElementById('quiz-toggle').onclick  = () => toggleCorrection();

  // Valider avec Entrée
  document.getElementById('quiz-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') validate();
  });
}

function currentWord() {
  const card = _state.cards[_state.idx];
  return card.mot || card.kanji || '';
}

async function enterQuiz(state) {
  _state = {
    ...state,
    idx: 0,
    errors: [],
    answered: false,
    forcedResult: null,
    readingVisible: false,
  };
  showCard();
}

function showCard() {
  const { cards, idx, type, sens } = _state;
  const card = cards[idx];
  const total = cards.length;

  // Progress
  document.getElementById('quiz-count').textContent = `${idx + 1} / ${total}`;
  document.getElementById('quiz-fill').style.width  = `${(idx / total) * 100}%`;
  document.getElementById('quiz-badge').textContent = type === 'lecture' ? 'Lecture' : `Compréhension · ${sens === 'jpfr' ? 'JP→FR' : 'FR→JP'}`;

  // Mot
  let display = '';
  if (type === 'lecture') {
    display = card.mot || card.kanji;
  } else if (sens === 'jpfr') {
    display = card.mot || card.kanji;
  } else {
    // FR→JP : afficher la traduction
    display = (card.traductions || card.sens || [])[0] || '';
  }
  document.getElementById('quiz-word').textContent = display;

  // Lecture masquée (mode compréhension uniquement)
  const readingRow = document.getElementById('quiz-reading-row');
  if (type === 'comprehension') {
    readingRow.style.display = 'flex';
    _state.readingVisible = false;
    const rt = document.getElementById('quiz-reading-text');
    rt.textContent = `${card.hiragana || ''} · ${card.romaji || ''}`;
    rt.classList.add('hidden');
    document.getElementById('quiz-eye').innerHTML = ICONS.eyeOff;
  } else {
    readingRow.style.display = 'none';
  }

  // Placeholder input
  document.getElementById('quiz-input').placeholder =
    type === 'lecture' ? 'Saisir la lecture…' : 'Saisir la traduction…';

  // Reset UI
  document.getElementById('quiz-input').value = '';
  document.getElementById('quiz-input-section').style.display = 'block';
  document.getElementById('quiz-feedback-section').style.display = 'none';
  document.getElementById('quiz-validate').style.display = 'block';
  _state.answered = false;
  _state.forcedResult = null;

  setTimeout(() => document.getElementById('quiz-input').focus(), 100);
}

function toggleReading() {
  _state.readingVisible = !_state.readingVisible;
  const rt = document.getElementById('quiz-reading-text');
  rt.classList.toggle('hidden', !_state.readingVisible);
  document.getElementById('quiz-eye').innerHTML = _state.readingVisible ? ICONS.eye : ICONS.eyeOff;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s/g, '').trim();
}

function checkAnswer(card, input, type, sens) {
  const n = normalize(input);
  if (!n) return false;

  if (type === 'lecture') {
    // Accepter hiragana ou romaji
    if (card.type === 'kanji') {
      const ons  = (card.lectures_on  || []).map(normalize);
      const kuns = (card.lectures_kun || []).map(normalize);
      const romOn  = (card.romaji_on  || []).map(normalize);
      const romKun = (card.romaji_kun || []).map(normalize);
      return [...ons, ...kuns, ...romOn, ...romKun].includes(n);
    }
    return normalize(card.hiragana) === n || normalize(card.romaji) === n;
  }

  if (type === 'comprehension') {
    if (sens === 'jpfr') {
      return (card.traductions || card.sens || []).map(normalize).includes(n);
    } else {
      // FR→JP : accepter hiragana ou romaji
      return normalize(card.hiragana) === n || normalize(card.romaji) === n;
    }
  }
  return false;
}

async function validate() {
  if (_state.answered) return;
  const card   = _state.cards[_state.idx];
  const input  = document.getElementById('quiz-input').value;
  const correct = checkAnswer(card, input, _state.type, _state.sens);

  _state.answered = true;
  _state.lastResult = correct;

  // Mettre à jour le score
  const sensKey = _state.type === 'lecture' ? 'jpfr' : _state.sens;
  await updateScore(card.type || 'vocab', card.mot || card.kanji, sensKey, correct);

  if (!correct) _state.errors.push(card);

  showFeedback(correct, card);
}

function showFeedback(correct, card) {
  document.getElementById('quiz-input-section').style.display = 'none';
  document.getElementById('quiz-validate').style.display = 'none';
  document.getElementById('quiz-feedback-section').style.display = 'block';

  const reponse = [card.hiragana, card.romaji].filter(Boolean).join(' · ')
    + ' · ' + (card.traductions || card.sens || []).slice(0,2).join(', ');

  setFeedbackUI(correct, reponse);

  // Boutons
  const btnFiche   = document.getElementById('quiz-fiche');
  const btnToggle  = document.getElementById('quiz-toggle');
  const btnNext    = document.getElementById('quiz-next');

  btnToggle.textContent = correct ? 'Incorrect' : 'Correct';
  _state.forcedResult = null;

  // Highlight
  if (correct) {
    btnNext.classList.add('btn-primary');   btnNext.classList.remove('btn-ghost');
    btnFiche.classList.remove('btn-primary'); btnFiche.classList.add('btn-ghost');
  } else {
    btnFiche.classList.add('btn-primary');   btnFiche.classList.remove('btn-ghost');
    btnNext.classList.remove('btn-primary'); btnNext.classList.add('btn-ghost');
  }
}

function setFeedbackUI(correct, reponse) {
  const fb = document.getElementById('quiz-feedback');
  fb.className = `feedback ${correct ? 'correct' : 'incorrect'}`;
  fb.innerHTML = `
    ${correct ? ICONS.check : ICONS.cross}
    <div>
      <p class="fb-title">${correct ? 'Correct' : 'Incorrect'}</p>
      <p class="fb-sub">${correct ? reponse : 'La réponse était : ' + reponse}</p>
    </div>
  `;
}

async function toggleCorrection() {
  if (!_state.answered) return;
  const card = _state.cards[_state.idx];
  const sensKey = _state.type === 'lecture' ? 'jpfr' : _state.sens;

  // Inverser
  const wasCorrect = _state.forcedResult !== null ? _state.forcedResult : _state.lastResult;
  const nowCorrect = !wasCorrect;
  _state.forcedResult = nowCorrect;

  // Corriger le score
  await updateScore(card.type || 'vocab', card.mot || card.kanji, sensKey, nowCorrect);

  // Mettre à jour la liste d'erreurs
  if (nowCorrect) {
    _state.errors = _state.errors.filter(e => (e.mot || e.kanji) !== (card.mot || card.kanji));
  } else {
    if (!_state.errors.find(e => (e.mot || e.kanji) === (card.mot || card.kanji))) {
      _state.errors.push(card);
    }
  }

  const reponse = [card.hiragana, card.romaji].filter(Boolean).join(' · ')
    + ' · ' + (card.traductions || card.sens || []).slice(0,2).join(', ');
  setFeedbackUI(nowCorrect, reponse);

  const btnFiche  = document.getElementById('quiz-fiche');
  const btnNext   = document.getElementById('quiz-next');
  const btnToggle = document.getElementById('quiz-toggle');
  btnToggle.textContent = nowCorrect ? 'Incorrect' : 'Correct';

  if (nowCorrect) {
    btnNext.classList.add('btn-primary');    btnNext.classList.remove('btn-ghost');
    btnFiche.classList.remove('btn-primary'); btnFiche.classList.add('btn-ghost');
  } else {
    btnFiche.classList.add('btn-primary');   btnFiche.classList.remove('btn-ghost');
    btnNext.classList.remove('btn-primary'); btnNext.classList.add('btn-ghost');
  }
}

function openFiche() {
  const card = _state.cards[_state.idx];
  if (card.type === 'kanji') renderKanjiCard(card);
  else renderVocabCard(card);
}

function nextCard() {
  _state.idx++;
  if (_state.idx >= _state.cards.length) {
    navigate('screen-results', {
      errors:  _state.errors,
      total:   _state.cards.length,
      correct: _state.cards.length - _state.errors.length,
      params:  { type: _state.type, sens: _state.sens, cat: _state.cat, critere: _state.critere, listes: _state.listes }
    });
  } else {
    showCard();
  }
}
