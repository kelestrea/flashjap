// focus-state.js — Persistance localStorage du filtre Focus global
import { getFreqLabel } from './db.js';

const FILTER_KEY  = 'globalFilter';
const ENABLED_KEY = 'globalFilterEnabled';

export function getGlobalFilter() {
  const stored = localStorage.getItem(FILTER_KEY);
  return stored ? JSON.parse(stored) : { listes: [], freqLabels: [] };
}

export function setGlobalFilter(filter) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
}

export function isFocusEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export function setFocusEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

export function isFocusFilterEmpty() {
  const { listes, freqLabels } = getGlobalFilter();
  return listes.length === 0 && freqLabels.length === 0;
}

export function resetFocusState() {
  localStorage.removeItem(FILTER_KEY);
  localStorage.removeItem(ENABLED_KEY);
}

// Teste si une entrée correspond au filtre (union : liste OU freqLabel).
export function matchesFocusFilter(entry, filter) {
  const { listes, freqLabels } = filter;
  if (listes.some(l => (entry.listes || []).includes(l))) return true;
  if (freqLabels.length > 0) {
    const label = getFreqLabel(entry.frequence, entry.type);
    if (label && freqLabels.includes(label)) return true;
  }
  return false;
}

// Filtre un tableau d'entrées selon le filtre Focus actif.
// Retourne entries inchangées si Focus inactif ou filtre vide.
export function applyFocusFilter(entries) {
  if (!isFocusEnabled()) return entries;
  const filter = getGlobalFilter();
  if (filter.listes.length === 0 && filter.freqLabels.length === 0) return entries;
  return entries.filter(e => matchesFocusFilter(e, filter));
}
