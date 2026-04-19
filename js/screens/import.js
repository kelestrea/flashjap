// screens/import.js
import { saveEntry, validateEntry } from '../db.js';
import { goBack, navigate, registerScreen } from '../router.js';

const PROMPT_FULL = `Tu es un assistant de structuration de données pour une application de révision de japonais.

Étape 1 — Vérification des paramètres
Avant toute chose :
- Si l'utilisateur n'a pas précisé la ou les listes d'appartenance, demande-les lui
- Ne produis pas le JSON tant que tu n'as pas cette information

Étape 2 — Analyse du contenu
Extrais tous les mots/kanjis du contenu fourni (liste, tableau, texte libre, image OCR...).

Règles de classification :
- Par défaut, toute entrée → fiche vocab
- Si l'utilisateur précise explicitement qu'une entrée ou un ensemble d'entrées doit être classé en kanji, respecte-la

Étape 3 — Questions avant production
Pour chaque champ que tu ne peux pas déterminer avec certitude, pose une question groupée à l'utilisateur avant de produire le JSON. Regroupe toutes tes questions en un seul message.

Ne produis le JSON qu'après avoir obtenu les réponses.

Étape 4a — Génération automatique des fiches kanji
Pour chaque kanji individuel présent dans les champs kanjis_composants des fiches vocab générées :
- Crée une fiche kanji si elle n'existe pas déjà dans ce fichier
- Attribue-lui la liste ["automatique"]
- Déduplique : un même kanji ne génère qu'une seule fiche
- Applique le même format que les fiches kanji manuelles (lectures on/kun, romaji, sens, exemples couvrant les différentes lectures)

Étape 4b — Génération de vocabulaire depuis les kanjis manuels
Pour chaque fiche kanji dont la liste n'est pas uniquement ["automatique"] :
- Génère 2 à 3 mots de vocabulaire courants contenant ce kanji, couvrant les différentes prononciations (on et kun)
- Ces mots reçoivent les mêmes listes que le kanji source
- Si un mot généré existe déjà dans le fichier, ne l'ajoute pas en doublon mais ajoute la liste du kanji sur ce mot existant
- Applique le format fiche vocab standard

Étape 5 — Production du JSON
Complète automatiquement les champs manquants (hiragana, romaji, traductions, lectures, exemples) en utilisant tes connaissances.
Pour les kanjis, génère 2-3 exemples de mots couvrant les différentes lectures (on et kun).
Retourne un tableau JSON contenant toutes les fiches (vocab + kanji manuels + kanji automatiques).

Format de sortie — Fiche VOCAB :
{
  "type": "vocab",
  "mot": "台所",
  "hiragana": "だいどころ",
  "romaji": "daidokoro",
  "traductions": ["cuisine"],
  "listes": ["JLPT N5"],
  "kanjis_composants": ["台", "所"]
}

Format de sortie — Fiche KANJI :
{
  "type": "kanji",
  "kanji": "水",
  "lectures_on": ["スイ"],
  "lectures_kun": ["みず"],
  "romaji_on": ["sui"],
  "romaji_kun": ["mizu"],
  "sens": ["eau"],
  "listes": ["JLPT N5"],
  "exemples": [
    { "mot": "水道", "hiragana": "すいどう", "romaji": "suidou", "sens": "eau courante" }
  ]
}

Règles :
- Maximum 5 traductions par fiche vocab, en français uniquement
- Maximum 3 lectures on et 3 lectures kun par kanji (les plus fréquentes)
- Omets le champ si le tableau est vide (ne mets pas [])
- Produis le résultat sous forme d'un fichier JSON à télécharger, nommé import_[nom_de_la_liste].json
- N'affiche pas le contenu du JSON dans le chat`;

export function initImport() {
  registerScreen('screen-import', { enter: enterImport });
  document.getElementById('import-back').onclick   = () => goBack();
  document.getElementById('import-copy').onclick   = () => copyPrompt();
  document.getElementById('import-file').onchange  = e => fileSelected(e.target.files[0]);
  document.getElementById('import-clear').onclick  = () => clearFile();
  document.getElementById('import-go').onclick     = () => doImport();
  document.getElementById('import-done-btn').onclick = () => navigate('screen-home');
}

function enterImport() {
  clearFile();
  document.getElementById('import-summary').style.display = 'none';
  document.getElementById('import-done').style.display = 'none';
}

async function copyPrompt() {
  await navigator.clipboard.writeText(PROMPT_FULL);
  const btn = document.getElementById('import-copy');
  btn.textContent = 'Copié !';
  setTimeout(() => btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Copier le prompt complet`, 2000);
}

let _file = null;

function fileSelected(file) {
  if (!file) return;
  _file = file;
  document.getElementById('import-file-info').style.display = 'flex';
  document.getElementById('import-file-name').textContent = file.name;
  document.getElementById('import-btn-section').style.display = 'block';
}

function clearFile() {
  _file = null;
  document.getElementById('import-file-info').style.display = 'none';
  document.getElementById('import-btn-section').style.display = 'none';
  document.getElementById('import-file').value = '';
}

async function doImport() {
  if (!_file) return;
  const btn = document.getElementById('import-go');
  btn.disabled = true;
  btn.textContent = 'Import en cours…';
  let text, data;
  try {
    text = await _file.text();
  } catch (err) {
    showSummary(0, 0, [{ label: 'Erreur de lecture', msg: String(err) }], 0);
    btn.disabled = false; btn.textContent = 'Importer'; return;
  }
  try { data = JSON.parse(text); } catch {
    showSummary(0, 0, [{ label: 'Fichier invalide', msg: 'JSON malformé — vérifie le contenu du fichier' }], 0);
    btn.disabled = false; btn.textContent = 'Importer'; return;
  }

  const entries = Array.isArray(data) ? data : (data.vocab || []).concat(data.kanji || []);
  let imported = 0, doublons = 0;
  const failures = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const errors = validateEntry(e);
    if (errors.length) {
      failures.push({ label: `Entrée ${i+1} — ${e.mot || e.kanji || '?'}`, msg: errors.join(', ') });
      continue;
    }
    const result = await saveEntry(e);
    if (result === 'doublon') doublons++;
    else imported++;
  }

  showSummary(imported, doublons, failures, entries.length);
  clearFile();
}

function showSummary(imported, doublons, failures, total) {
  const s = document.getElementById('import-summary');
  s.style.display = 'block';
  document.getElementById('imp-count').textContent   = imported;
  document.getElementById('imp-doublons').textContent= doublons;
  document.getElementById('imp-echecs').textContent  = failures.length;
  document.getElementById('imp-total').textContent   = total;

  const errList = document.getElementById('imp-errors');
  if (!failures.length) {
    errList.parentElement.style.display = 'none';
  } else {
    errList.parentElement.style.display = 'block';
    errList.innerHTML = failures.map(f => `
      <div class="error-item" style="margin-bottom:8px;">
        <div class="e-title">${f.label}</div>
        <div class="e-msg">${f.msg}</div>
      </div>
    `).join('');
  }
  document.getElementById('import-done').style.display = 'block';
  document.getElementById('import-go').disabled = false;
  document.getElementById('import-go').textContent = 'Importer';
  s.scrollIntoView({ behavior: 'smooth' });
}
