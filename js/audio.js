// audio.js — Web Speech API wrapper
let _voice = null;
let _available = false;

function scoreVoice(v) {
  if (!v.lang.startsWith('ja')) return -1;
  let score = 0;
  const name = (v.name || '').toLowerCase();
  const uri  = (v.voiceURI || '').toLowerCase();
  if (name.includes('siri'))    score += 100;
  if (uri.includes('premium'))  score += 50;
  if (uri.includes('enhanced')) score += 30;
  if (name.includes('kyoko') || name.includes('o-ren')) score += 20;
  if (v.lang === 'ja-JP') score += 10;
  return score;
}

export function initAudio() {
  if (!('speechSynthesis' in window)) return;
  const load = () => {
    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('ja'));
    voices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    _voice     = voices[0] || null;
    _available = !!_voice;
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
  const utt   = new SpeechSynthesisUtterance(text);
  utt.voice   = _voice;
  utt.lang    = 'ja-JP';
  utt.rate    = 0.9;
  speechSynthesis.speak(utt);
}

export function isAvailable() { return _available; }
