// screens/data.js
import { navigate, goBack, registerScreen, showPopup } from '../router.js';
import { exportAll, clearAllData } from '../db.js';
import { setCloudKey, setCloudQuality, getCloudConfig } from '../audio.js';
import { resetSelectedListes } from '../lists-state.js';

export function initData() {
  registerScreen('screen-data', { enter: () => {
    const cfg = getCloudConfig();
    document.getElementById('tts-key').value = cfg.key;
    document.querySelectorAll('.tts-quality-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quality === cfg.quality);
    });
    document.getElementById('tts-status').textContent = '';
  }});
  document.getElementById('data-back').onclick    = () => goBack();
  document.getElementById('data-import').onclick  = () => navigate('screen-import');
  document.getElementById('data-export').onclick  = () => doExport();
  document.getElementById('data-restore').onclick = () => navigate('screen-restore');

  document.querySelectorAll('.tts-quality-btn').forEach(btn => {
    btn.onclick = () => {
      setCloudQuality(btn.dataset.quality);
      document.querySelectorAll('.tts-quality-btn').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
    };
  });

  document.getElementById('tts-save').onclick = () => {
    const key = document.getElementById('tts-key').value.trim();
    setCloudKey(key);
    document.getElementById('tts-status').textContent = key ? '✓ Enregistrée' : 'Clé effacée';
  };

  document.getElementById('data-clear-db').onclick = () => {
    showPopup(
      'Supprimer toutes les fiches vocab et kanji ? Cette action est irréversible.',
      async () => {
        await clearAllData();
        resetSelectedListes();
      },
      null,
      'Vider'
    );
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
