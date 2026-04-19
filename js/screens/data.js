// screens/data.js
import { navigate, goBack, registerScreen } from '../router.js';
import { exportAll } from '../db.js';

export function initData() {
  registerScreen('screen-data', { enter: () => {} });
  document.getElementById('data-back').onclick   = () => goBack();
  document.getElementById('data-import').onclick = () => navigate('screen-import');
  document.getElementById('data-export').onclick = () => doExport();
  document.getElementById('data-restore').onclick= () => navigate('screen-restore');
}

async function doExport() {
  let json;
  try {
    json = await exportAll();
  } catch (err) {
    alert('Erreur lors de l'export : ' + err.message);
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0,10);
  const filename = `flashjap_backup_${date}.json`;

  // Partage iOS natif si disponible
  if (navigator.share) {
    const file = new File([blob], filename, { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'FlashJap — Sauvegarde' });
    } catch {}
  } else {
    // Fallback téléchargement
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  }
  URL.revokeObjectURL(url);
}
