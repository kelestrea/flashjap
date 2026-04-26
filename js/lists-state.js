const STORAGE_KEY = 'selectedListes';
const SLIDER_VALUE_KEY = 'quizSliderValue';

export function getSelectedListes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function setSelectedListes(listes) {
  if (!listes || listes.length === 0) {
    return false;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listes));
  return true;
}

export function initializeSelectedListes(allListes) {
  if (!getSelectedListes().length) {
    setSelectedListes(allListes);
  }
}

export function resetSelectedListes() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSliderValue() {
  const stored = localStorage.getItem(SLIDER_VALUE_KEY);
  return stored ? parseInt(stored) : 20;
}

export function setSliderValue(value) {
  localStorage.setItem(SLIDER_VALUE_KEY, String(value));
}

const AUTOPLAY_KEY = 'quizAutoplay';

export function getAutoplayMode() {
  return localStorage.getItem(AUTOPLAY_KEY) || 'silence';
}

export function setAutoplayMode(mode) {
  localStorage.setItem(AUTOPLAY_KEY, mode);
}
