// type-state.js - Global type state management (vocab/kanji)
const KEY = 'selectedCategory';
let _type = localStorage.getItem(KEY) || 'vocab';

export function getSelectedType() {
  return _type;
}

export function setSelectedType(type) {
  if (type === 'vocab' || type === 'kanji') {
    _type = type;
    localStorage.setItem(KEY, type);
  }
}
