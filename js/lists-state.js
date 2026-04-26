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

const FILTER_MODE_KEY = 'quizFilterMode';
const FREQ_LABELS_KEY = 'quizFreqLabels';

export function getFilterMode() {
  return localStorage.getItem(FILTER_MODE_KEY) || 'listes';
}

export function setFilterMode(mode) {
  localStorage.setItem(FILTER_MODE_KEY, mode);
}

export function getFreqLabels() {
  const stored = localStorage.getItem(FREQ_LABELS_KEY);
  return stored ? JSON.parse(stored) : ['essentiel'];
}

export function setFreqLabels(labels) {
  localStorage.setItem(FREQ_LABELS_KEY, JSON.stringify(labels));
}
