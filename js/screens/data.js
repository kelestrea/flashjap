// screens/data.js
import { navigate, goBack, registerScreen } from '../router.js';
import { exportAll } from '../db.js';
import { setCloudKey, getCloudConfig } from '../audio.js';

export function initData() {
  registerScreen('screen-data', { enter: () => {
    const cfg = getCloudConfig();
    document.getElementById('tts-key').value   = cfg.key;
    document.getElementById('tts-voice').value = cfg.voice;
    document.getElementById('tts-status').textContent = '';
  }});
  document.getElementById('data-back').onclick    = () => goBack();
  document.getElementById('data-import').onclick  = () => navigate('screen-import');
  document.getElementById('data-export').onclick  = () => doExport();
  document.getElementById('data-restore').onclick = () => navigate('screen-restore');

  document.getElementById('tts-save').onclick = () => {
    const key   = document.getElementById('tts-key').value.trim();
    const voice = document.getElementById('tts-voice').value;
    setCloudKey(key, voice);
    document.getElementById('tts-status').textContent = key ? '✓ Enregistrée' : 'Clé effacée';
  };
}

async function doExport() {
  let json;
  try {
    json = await exportAll();
  } catch (err) {
    alert('Erreur export : ' + err.message);
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0,10);
  const filename = `flashjap_backup_${date}.json`;

  if (navigator.share) {
    const file = new File([blob], filename, { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'FlashJap — Sauvegarde' });
    } catch {}
  } else {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  }
  URL.revokeObjectURL(url);
}
