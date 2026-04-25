// audio.js — Web Speech API + Google Cloud TTS
let _voice     = null;
let _available = false;

let _cloudKey   = localStorage.getItem('gcloudTtsKey') ?? '';
let _cloudVoice = localStorage.getItem('gcloudTtsVoice') ?? 'ja-JP-Neural2-B';
const _cache    = new Map();

function pickBestVoice() {
  return speechSynthesis.getVoices().find(v => v.lang.startsWith('ja')) ?? null;
}

export function initAudio() {
  if (!('speechSynthesis' in window)) return;

  _voice     = pickBestVoice();
  _available = !!_voice;

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

  speechSynthesis.onvoiceschanged = () => {
    const best = pickBestVoice();
    if (best) { _voice = best; _available = true; updateBtns(); }
  };

  updateBtns();
}

function updateBtns() {
  const ok = _available || !!_cloudKey;
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.style.opacity = ok ? '1' : '0.3';
    btn.title = ok ? 'Écouter' : 'Voix japonaise non disponible';
  });
}

function utterance(text) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = _voice;
  utt.lang  = 'ja-JP';
  utt.rate  = 0.9;
  return utt;
}

async function fetchCloudAudio(text) {
  if (_cache.has(text)) return _cache.get(text);
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${_cloudKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: _cloudVoice },
        audioConfig: { audioEncoding: 'MP3' }
      })
    }
  );
  if (!res.ok) throw new Error('Cloud TTS ' + res.status);
  const { audioContent } = await res.json();
  const uri = 'data:audio/mp3;base64,' + audioContent;
  _cache.set(text, uri);
  return uri;
}

function playAudio(uri) {
  return new Promise((resolve, reject) => {
    const a = new Audio(uri);
    a.onended = resolve;
    a.onerror = reject;
    a.play();
  });
}

export async function speak(text) {
  if (!text) return;
  if (_cloudKey) {
    try { await playAudio(await fetchCloudAudio(text)); return; }
    catch (e) { console.warn('Cloud TTS fallback:', e); }
  }
  if (!_voice) _voice = pickBestVoice();
  if (!_voice) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance(text));
}

function speakSequence(items) {
  if (!items.length) return;
  const { text, delayAfter } = items[0];
  const rest = items.slice(1);
  const utt = utterance(text);
  if (rest.length) utt.onend = () => setTimeout(() => speakSequence(rest), delayAfter);
  speechSynthesis.speak(utt);
}

export async function speakKanji(entry) {
  if (!_voice && !_cloudKey) _voice = pickBestVoice();
  const kuns = (entry.lectures_kun || []).filter(Boolean);
  const ons  = (entry.lectures_on  || []).filter(Boolean);
  if (!kuns.length && !ons.length) return;

  if (_cloudKey) {
    try {
      const items = [];
      kuns.forEach((k, i) => items.push({ text: k, delay: i < kuns.length - 1 ? 500 : 1000 }));
      ons.forEach(o => items.push({ text: o, delay: 500 }));
      for (const { text, delay } of items) {
        await playAudio(await fetchCloudAudio(text));
        await new Promise(r => setTimeout(r, delay));
      }
      return;
    } catch (e) { console.warn('Cloud TTS fallback:', e); }
  }
  if (!_voice) return;
  speechSynthesis.cancel();
  const items = [];
  kuns.forEach((k, i) => items.push({ text: k, delayAfter: i < kuns.length - 1 ? 500 : 1000 }));
  ons.forEach((o, i)  => items.push({ text: o, delayAfter: 500 }));
  speakSequence(items);
}

export function setCloudKey(key, voice) {
  _cloudKey   = key;
  _cloudVoice = voice;
  localStorage.setItem('gcloudTtsKey', key);
  localStorage.setItem('gcloudTtsVoice', voice);
  _cache.clear();
  updateBtns();
}

export function getCloudConfig() {
  return { key: _cloudKey, voice: _cloudVoice };
}

export function isAvailable() { return _available || !!_cloudKey; }
