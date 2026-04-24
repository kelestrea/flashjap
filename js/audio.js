// audio.js — Web Speech API wrapper
let _voice     = null;
let _available = false;

function pickBestVoice() {
  return speechSynthesis.getVoices().find(v => v.lang.startsWith('ja')) ?? null;
}

export function initAudio() {
  if (!('speechSynthesis' in window)) return;

  // Tentative immédiate
  _voice     = pickBestVoice();
  _available = !!_voice;

  // Polling robuste pour iOS — les voix arrivent en async
  if (!_voice) {
    let attempts = 0;
    const poll = setInterval(() => {
      _voice = pickBestVoice();
      if (_voice || ++attempts > 30) {
        clearInterval(poll);
        _available = !!_voice;
        updateBtns();
      }
    }, 100);
  }

  // Fallback onvoiceschanged
  speechSynthesis.onvoiceschanged = () => {
    const best = pickBestVoice();
    if (best) { _voice = best; _available = true; updateBtns(); }
  };
}

function updateBtns() {
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.style.opacity = _available ? '1' : '0.3';
    btn.title = _available ? 'Écouter' : 'Voix japonaise non disponible';
  });
}

function utterance(text) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = _voice;
  utt.lang  = 'ja-JP';
  utt.rate  = 0.9;
  return utt;
}

export function speak(text) {
  if (!text) return;
  // Dernier recours : re-chercher la voix si pas encore disponible
  if (!_voice) _voice = pickBestVoice();
  if (!_voice) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance(text));
}

export function speakKanji(entry) {
  if (!_voice) _voice = pickBestVoice();
  if (!_voice) return;
  const kun = (entry.lectures_kun || []).join('　');
  const on  = (entry.lectures_on  || []).join('　');
  speechSynthesis.cancel();
  if (kun && on) {
    const uttKun = utterance(kun);
    uttKun.onend = () => setTimeout(() => speechSynthesis.speak(utterance(on)), 700);
    speechSynthesis.speak(uttKun);
  } else if (kun || on) {
    speechSynthesis.speak(utterance(kun || on));
  }
}

export function isAvailable() { return _available; }
