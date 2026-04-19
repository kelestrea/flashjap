// screens/quiz.js
import { updateScore, getStatutGlobal, STATUT_COLOR } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { speak } from '../audio.js';
import { renderVocabCard } from '../components/card-vocab.js';
import { renderKanjiCard }  from '../components/card-kanji.js';
import { ICONS } from '../icons.js';

let _state = {};

export function initQuiz() {
  registerScreen('screen-quiz', { enter: enterQuiz });
  document.getElementById('quiz-back').onclick     = () => goBack();
  document.getElementById('quiz-play').onclick     = () => speak(currentWord());
  document.getElementById('quiz-validate').onclick = () => validate();
  document.getElementById('quiz-eye').onclick      = () => toggleReading();
  document.getElementById('quiz-next').onclick     = () => nextCard();
  document.getElementById('quiz-fiche').onclick    = () => openFiche();
  document.getElementById('quiz-toggle').onclick   = () => toggleCorrection();
  document.getElementById('quiz-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') validate();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && _state.answered) nextCard();
  });
}

function currentWord() {
  const card = _state.cards[_state.idx];
  return card.mot || card.kanji || '';
}

async function enterQuiz(state) {
  _state = { ...state, idx: 0, errors: [], answered: false, forcedResult: null, readingVisible: false };
  showCard();
}

function showCard() {
  const { cards, idx, type, sens } = _state;
  const card  = cards[idx];
  const total = cards.length;
  const isKanji = card.type === 'kanji';

  document.getElementById('quiz-count').textContent = `${idx + 1} / ${total}`;
  document.getElementById('quiz-fill').style.width  = `${(idx / total) * 100}%`;
  document.getElementById('quiz-badge').textContent =
    type === 'lecture' ? 'Lecture' : `Compréhension · ${sens === 'jpfr' ? 'JP→FR' : 'FR→JP'}`;

  // Mot affiché
  let display = '';
  if (type === 'lecture' || sens === 'jpfr') {
    display = card.mot || card.kanji;
  } else {
    display = (card.traductions || card.sens || [])[0] || '';
  }
  document.getElementById('quiz-word').textContent = display;

  // Lecture masquée (compréhension uniquement)
  const readingRow = document.getElementById('quiz-reading-row');
  if (type === 'comprehension') {
    readingRow.style.display = 'flex';
    _state.readingVisible = false;
    const rt = document.getElementById('quiz-reading-text');
    rt.textContent = isKanji
      ? [(card.lectures_kun || []).join(', '), (card.lectures_on || []).join(', ')].filter(Boolean).join(' · ')
      : `${card.hiragana || ''} · ${card.romaji || ''}`;
    rt.classList.add('hidden');
    document.getElementById('quiz-eye').innerHTML = ICONS.eyeOff;
  } else {
    readingRow.style.display = 'none';
  }

  // Placeholder
  let placeholder = 'Saisir la traduction…';
  if (type === 'lecture') {
    placeholder = isKanji ? 'kun on (séparés par un espace)…' : 'Saisir la lecture…';
  }
  document.getElementById('quiz-input').placeholder = placeholder;

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
  return (s || '').toLowerCase().trim();
}

// Retourne { correct, correctOn, correctKun } pour les kanjis en mode lecture
// Retourne { correct } pour les autres cas
function checkAnswer(card, input, type, sens) {
  const n = normalize(input);
  if (!n) return { correct: false };

  if (type === 'lecture' && card.type === 'kanji') {
    const kuns = (card.lectures_kun || []).map(normalize);
    const ons  = (card.lectures_on  || []).map(normalize);
    const romKun = (card.romaji_kun || []).map(normalize);
    const romOn  = (card.romaji_on  || []).map(normalize);
    const hasKun = kuns.length > 0 || romKun.length > 0;
    const hasOn  = ons.length  > 0 || romOn.length  > 0;

    if (hasKun && hasOn) {
      // Deux réponses attendues séparées par espace
      const parts = n.split(/\s+/);
      if (parts.length < 2) return { correct: false, correctKun: false, correctOn: false };
      const [p1, p2] = parts;
      const correctKun = [...kuns, ...romKun].includes(p1);
      const correctOn  = [...ons,  ...romOn].includes(p2);
      return { correct: correctKun && correctOn, correctKun, correctOn };
    } else if (hasKun) {
      const correctKun = [...kuns, ...romKun].includes(n);
      return { correct: correctKun, correctKun, correctOn: null };
    } else {
      const correctOn = [...ons, ...romOn].includes(n);
      return { correct: correctOn, correctKun: null, correctOn };
    }
  }

  if (type === 'lecture') {
    // Vocab lecture : hiragana ou romaji, espaces ignorés
    const nn = n.replace(/\s/g, '');
    return { correct: normalize(card.hiragana).replace(/\s/g,'') === nn || normalize(card.romaji).replace(/\s/g,'') === nn };
  }

  if (type === 'comprehension') {
    if (sens === 'jpfr') {
      return { correct: (card.traductions || card.sens || []).map(normalize).includes(n) };
    } else {
      const nn = n.replace(/\s/g, '');
      return { correct: normalize(card.hiragana).replace(/\s/g,'') === nn || normalize(card.romaji).replace(/\s/g,'') === nn };
    }
  }
  return { correct: false };
}

async function validate() {
  if (_state.answered) return;
  const card  = _state.cards[_state.idx];
  const input = document.getElementById('quiz-input').value;
  const result = checkAnswer(card, input, _state.type, _state.sens);

  _state.answered   = true;
  _state.lastResult = result.correct;
  _state.lastCheckResult = result;

  // Mettre à jour les scores
  if (_state.type === 'lecture' && card.type === 'kanji') {
    if (result.correctKun !== null) await updateScore('kanji', card.kanji, 'lecture_kun', result.correctKun ?? false);
    if (result.correctOn  !== null) await updateScore('kanji', card.kanji, 'lecture_on',  result.correctOn  ?? false);
  } else {
    const sensKey = _state.type === 'lecture' ? 'jpfr'
      : card.type === 'kanji' ? `comprehension_${_state.sens}` : _state.sens;
    await updateScore(card.type || 'vocab', card.mot || card.kanji, sensKey, result.correct);
  }

  if (!result.correct) _state.errors.push(card);
  showFeedback(result.correct, card, result);
}

function buildReponseStr(card) {
  if (card.type === 'kanji') {
    const kuns = (card.lectures_kun || []).join(', ');
    const romKuns = (card.romaji_kun || []).join(', ');
    const ons  = (card.lectures_on  || []).join(', ');
    const romOns = (card.romaji_on || []).join(', ');
    const kunPart = [kuns, romKuns].filter(Boolean).join(' · ');
    const onPart  = [ons,  romOns].filter(Boolean).join(' · ');
    return [kunPart, onPart].filter(Boolean).join(' / ') + (card.sens ? ' — ' + card.sens.slice(0,2).join(', ') : '');
  }
  return [card.hiragana, card.romaji].filter(Boolean).join(' · ')
    + ' · ' + (card.traductions || []).slice(0,2).join(', ');
}

function showFeedback(correct, card, result) {
  document.getElementById('quiz-input-section').style.display = 'none';
  document.getElementById('quiz-validate').style.display = 'none';
  document.getElementById('quiz-feedback-section').style.display = 'block';

  setFeedbackUI(correct, card, result);

  const btnFiche  = document.getElementById('quiz-fiche');
  const btnToggle = document.getElementById('quiz-toggle');
  const btnNext   = document.getElementById('quiz-next');
  btnToggle.textContent = correct ? 'Incorrect' : 'Correct';
  _state.forcedResult = null;

  if (correct) {
    btnNext.classList.add('btn-primary');    btnNext.classList.remove('btn-ghost');
    btnFiche.classList.remove('btn-primary'); btnFiche.classList.add('btn-ghost');
  } else {
    btnFiche.classList.add('btn-primary');   btnFiche.classList.remove('btn-ghost');
    btnNext.classList.remove('btn-primary'); btnNext.classList.add('btn-ghost');
  }
}

function setFeedbackUI(correct, card, result) {
  const fb = document.getElementById('quiz-feedback');
  fb.className = `feedback ${correct ? 'correct' : 'incorrect'}`;

  let detail = '';
  if (!correct && _state.type === 'lecture' && card.type === 'kanji' && result) {
    const kunOk = result.correctKun;
    const onOk  = result.correctOn;
    if (kunOk === false) detail += `<span style="color:#A32D2D">kun : ${(card.lectures_kun||[]).join('/')} · ${(card.romaji_kun||[]).join('/')}</span><br>`;
    if (onOk  === false) detail += `<span style="color:#A32D2D">on : ${(card.lectures_on||[]).join('/')} · ${(card.romaji_on||[]).join('/')}</span>`;
  }

  const reponse = buildReponseStr(card);
  fb.innerHTML = `
    ${correct ? ICONS.check : ICONS.cross}
    <div>
      <p class="fb-title">${correct ? 'Correct' : 'Incorrect'}</p>
      <p class="fb-sub">${correct ? reponse : (detail || 'La réponse était : ' + reponse)}</p>
    </div>
  `;
}

async function toggleCorrection() {
  if (!_state.answered) return;
  const card = _state.cards[_state.idx];
  const wasCorrect = _state.forcedResult !== null ? _state.forcedResult : _state.lastResult;
  const nowCorrect = !wasCorrect;
  _state.forcedResult = nowCorrect;

  // Recorriger tous les scores concernés
  if (_state.type === 'lecture' && card.type === 'kanji') {
    if ((card.lectures_kun || []).length) await updateScore('kanji', card.kanji, 'lecture_kun', nowCorrect);
    if ((card.lectures_on  || []).length) await updateScore('kanji', card.kanji, 'lecture_on',  nowCorrect);
  } else {
    const sensKey = _state.type === 'lecture' ? 'jpfr'
      : card.type === 'kanji' ? `comprehension_${_state.sens}` : _state.sens;
    await updateScore(card.type || 'vocab', card.mot || card.kanji, sensKey, nowCorrect);
  }

  if (nowCorrect) {
    _state.errors = _state.errors.filter(e => (e.mot || e.kanji) !== (card.mot || card.kanji));
  } else {
    if (!_state.errors.find(e => (e.mot || e.kanji) === (card.mot || card.kanji))) _state.errors.push(card);
  }

  setFeedbackUI(nowCorrect, card, null);

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
