// audio.js — Web Speech API wrapper
let _voice     = null;
let _available = false;

function scoreVoice(v) {
  if (!v.lang.startsWith('ja')) return -1;
  let score = 0;
  const name = (v.name || '').toLowerCase();
  const uri  = (v.voiceURI || '').toLowerCase();
  // Priorité absolue : Siri Voix 2
  if (name.includes('siri') && (name.includes('2') || uri.includes('2'))) score += 200;
  // Autres voix Siri
  else if (name.includes('siri')) score += 100;
  if (uri.includes('premium'))  score += 50;
  if (uri.includes('enhanced')) score += 30;
  if (name.includes('kyoko') || name.includes('o-ren')) score += 20;
  if (v.lang === 'ja-JP') score += 10;
  return score;
}

function pickBestVoice() {
  const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('ja'));
  console.log(voices.map(v => v.name + ' | ' + v.voiceURI).join('\n'));
  if (!voices.length) return null;
  voices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return voices[0];
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

export function speak(text) {
  if (!text) return;
  // Dernier recours : re-chercher la voix si pas encore disponible
  if (!_voice) _voice = pickBestVoice();
  if (!_voice) return;
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = _voice;
  utt.lang  = 'ja-JP';
  utt.rate  = 0.9;
  speechSynthesis.speak(utt);
}

export function isAvailable() { return _available; }
