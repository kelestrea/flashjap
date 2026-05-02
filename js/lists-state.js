import { getSelectedType } from './type-state.js';

function t(type) { return type || getSelectedType(); }
function k(base, type) { return `${t(type)}_${base}`; }

export function getSelectedListes(type) {
  const stored = localStorage.getItem(k('selectedListes', type));
  return stored ? JSON.parse(stored) : [];
}

export function setSelectedListes(listes, type) {
  if (!listes || listes.length === 0) return false;
  localStorage.setItem(k('selectedListes', type), JSON.stringify(listes));
  return true;
}

export function initializeSelectedListes(allListes, type) {
  if (!getSelectedListes(type).length) {
    setSelectedListes(allListes, type);
  }
}

export function resetSelectedListes() {
  ['vocab', 'kanji'].forEach(tp => {
    ['selectedListes', 'quizSliderValue', 'quizAutoplay', 'quizFilterMode',
     'quizFreqLabels', 'quizFreqExcludeAuto', 'quizType', 'quizSens', 'quizCritere'].forEach(base => {
      localStorage.removeItem(`${tp}_${base}`);
    });
  });
}

export function getSliderValue(type) {
  const stored = localStorage.getItem(k('quizSliderValue', type));
  return stored ? parseInt(stored) : 20;
}

export function setSliderValue(value, type) {
  localStorage.setItem(k('quizSliderValue', type), String(value));
}

export function getAutoplayMode(type) {
  return localStorage.getItem(k('quizAutoplay', type)) || 'silence';
}

export function setAutoplayMode(mode, type) {
  localStorage.setItem(k('quizAutoplay', type), mode);
}

export function getFilterMode(type) {
  return localStorage.getItem(k('quizFilterMode', type)) || 'listes';
}

export function setFilterMode(mode, type) {
  localStorage.setItem(k('quizFilterMode', type), mode);
}

export function getFreqLabels(type) {
  const stored = localStorage.getItem(k('quizFreqLabels', type));
  return stored ? JSON.parse(stored) : ['essentiel'];
}

export function setFreqLabels(labels, type) {
  localStorage.setItem(k('quizFreqLabels', type), JSON.stringify(labels));
}

export function getFreqExcludeAuto(type) {
  const stored = localStorage.getItem(k('quizFreqExcludeAuto', type));
  return stored === null ? true : stored === 'true';
}

export function setFreqExcludeAuto(value, type) {
  localStorage.setItem(k('quizFreqExcludeAuto', type), String(value));
}

export function getQuizType(type) {
  return localStorage.getItem(k('quizType', type)) || 'lecture';
}

export function setQuizType(value, type) {
  localStorage.setItem(k('quizType', type), value);
}

export function getQuizSens(type) {
  return localStorage.getItem(k('quizSens', type)) || 'jpfr';
}

export function setQuizSens(value, type) {
  localStorage.setItem(k('quizSens', type), value);
}

export function getQuizCritere(type) {
  return localStorage.getItem(k('quizCritere', type)) || 'tous';
}

export function setQuizCritere(value, type) {
  localStorage.setItem(k('quizCritere', type), value);
}
