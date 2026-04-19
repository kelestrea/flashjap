// screens/restore.js
import { importAll } from '../db.js';
import { goBack, navigate, registerScreen, showPopup } from '../router.js';

export function initRestore() {
  registerScreen('screen-restore', { enter: () => clearFile() });
  document.getElementById('restore-back').onclick  = () => goBack();
  document.getElementById('restore-file').onchange = e => fileSelected(e.target.files[0]);
  document.getElementById('restore-clear').onclick = () => clearFile();
  document.getElementById('restore-go').onclick    = () => confirmRestore();
}

let _file = null;

function fileSelected(file) {
  if (!file) return;
  _file = file;
  document.getElementById('restore-file-info').style.display = 'flex';
  document.getElementById('restore-file-name').textContent = file.name;
  document.getElementById('restore-btn-section').style.display = 'block';
}

function clearFile() {
  _file = null;
  document.getElementById('restore-file-info').style.display = 'none';
  document.getElementById('restore-btn-section').style.display = 'none';
  document.getElementById('restore-file').value = '';
}

function confirmRestore() {
  if (!_file) return;
  showPopup('Restaurer la base avec ce fichier ? Cette action est irréversible.', doRestore);
}

async function doRestore() {
  if (!_file) return;
  const keepScores = document.querySelector('[name="restore-scores"]:checked')?.value === 'garder';
  const text = await _file.text();
  let data;
  try { data = JSON.parse(text); } catch {
    alert('Fichier JSON invalide.');
    return;
  }
  await importAll(data, keepScores);
  navigate('screen-home');
}
