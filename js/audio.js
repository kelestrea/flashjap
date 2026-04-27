// audio.js — Web Speech API + Google Cloud TTS
let _voice     = null;
let _available = false;

let _cloudKey     = localStorage.getItem('gcloudTtsKey') ?? '';
let _cloudQuality = localStorage.getItem('gcloudTtsQuality') ?? 'neural';
localStorage.removeItem('gcloudTtsVoice');
const _cache = new Map();

function getVoiceNames() {
  return _cloudQuality === 'standard'
    ? ['ja-JP-Wavenet-D', 'ja-JP-Wavenet-A']
    : ['ja-JP-Neural2-C', 'ja-JP-Neural2-B']; // [kun, on]
}

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

async function fetchCloudAudio(text, voiceName) {
  const cacheKey = text + '|' + voiceName;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${_cloudKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: voiceName },
        audioConfig: { audioEncoding: 'MP3' }
      })
    }
  );
  if (!res.ok) throw new Error('Cloud TTS ' + res.status);
  const { audioContent } = await res.json();
  const uri = 'data:audio/mp3;base64,' + audioContent;
  _cache.set(cacheKey, uri);
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
    try {
      const [, onVoice] = getVoiceNames();
      await playAudio(await fetchCloudAudio(text, onVoice));
      return;
    } catch (e) { console.warn('Cloud TTS fallback:', e); }
  }
  if (!_voice) _voice = pickBestVoice();
  if (!_voice) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance(text));
}

function cleanKanjiReading(reading) {
  return reading.replace(/\./g, '');
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
  const kuns = (entry.lectures_kun || []).filter(Boolean).map(cleanKanjiReading);
  const ons  = (entry.lectures_on  || []).filter(Boolean).map(cleanKanjiReading);
  if (!kuns.length && !ons.length) return;

  if (_cloudKey) {
    const [kunVoice, onVoice] = getVoiceNames();
    const items = [];
    kuns.forEach((k, i) => items.push({
      text: k, voice: kunVoice,
      delay: i < kuns.length - 1 ? 350 : (ons.length ? 500 : 350)
    }));
    ons.forEach(o => items.push({ text: o, voice: onVoice, delay: 350 }));
    for (const { text, voice, delay } of items) {
      try {
        await playAudio(await fetchCloudAudio(text, voice));
      } catch (e) {
        console.warn('Cloud TTS fallback:', e);
        if (_voice) await new Promise(resolve => {
          const utt = utterance(text);
          utt.onend = resolve;
          speechSynthesis.speak(utt);
        });
      }
      await new Promise(r => setTimeout(r, delay));
    }
    return;
  }
  if (!_voice) return;
  speechSynthesis.cancel();
  const items = [];
  kuns.forEach((k, i) => items.push({ text: k, delayAfter: i < kuns.length - 1 ? 350 : (ons.length ? 500 : 350) }));
  ons.forEach(o => items.push({ text: o, delayAfter: 350 }));
  speakSequence(items);
}

export function setCloudKey(key) {
  _cloudKey = key;
  localStorage.setItem('gcloudTtsKey', key);
  _cache.clear();
  updateBtns();
}

export function setCloudQuality(quality) {
  _cloudQuality = quality;
  localStorage.setItem('gcloudTtsQuality', quality);
  _cache.clear();
}

export function getCloudConfig() {
  return { key: _cloudKey, quality: _cloudQuality };
}

export function isAvailable() { return _available || !!_cloudKey; }
