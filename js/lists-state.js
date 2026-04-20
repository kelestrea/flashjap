const STORAGE_KEY = 'selectedListes';

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
