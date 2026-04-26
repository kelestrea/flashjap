// type-state.js - Global type state management (vocab/kanji)
let _type = 'vocab';

export function getSelectedType() {
  return _type;
}

export function setSelectedType(type) {
  if (type === 'vocab' || type === 'kanji') {
    _type = type;
  }
}
