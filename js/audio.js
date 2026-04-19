// audio.js — Web Speech API wrapper
let _voice = null;
let _available = false;

export function initAudio() {
  if (!('speechSynthesis' in window)) return;
  const load = () => {
    const voices = speechSynthesis.getVoices();
    _voice = voices.find(v => v.lang === 'ja-JP')
          || voices.find(v => v.lang.startsWith('ja'))
          || null;
    _available = !!_voice;
    // Mettre à jour l'UI si pas de voix
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.style.opacity = _available ? '1' : '0.3';
      btn.title = _available ? 'Écouter' : 'Voix japonaise non disponible';
    });
  };
  speechSynthesis.onvoiceschanged = load;
  load();
}

export function speak(text) {
  if (!_available || !text) return;
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = _voice;
  utt.lang  = 'ja-JP';
  utt.rate  = 0.9;
  speechSynthesis.speak(utt);
}

export function isAvailable() { return _available; }
