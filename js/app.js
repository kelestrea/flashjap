// app.js — Point d'entrée
import { APP_VERSION } from './version.js';
import { openDB, loadDefaultDatabase, getAllVocab, getAllKanji } from './db.js';
import { initAudio } from './audio.js';
import { navigate, showPopup } from './router.js';
import { initHome }       from './screens/home.js';
import { initQuizParams } from './screens/quiz-params.js';
import { initQuiz }       from './screens/quiz.js';
import { initResults }    from './screens/results.js';
import { initSearch }     from './screens/search.js';
import { initFiche }      from './screens/fiche.js';
import { initData }       from './screens/data.js';
import { initImport }     from './screens/import.js';
import { initRestore }    from './screens/restore.js';
import { initEditListes } from './screens/edit-listes.js';
import * as listSelection from './screens/list-selection.js';

async function boot() {
  await openDB();
  const vocab = await getAllVocab();
  const kanji = await getAllKanji();
  if (vocab.length === 0 && kanji.length === 0) {
    const shouldLoad = await new Promise(resolve => {
      showPopup(
        'Charger la base de données par défaut ?',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (shouldLoad) await loadDefaultDatabase();
  }
  initAudio();

  initHome();
  initQuizParams();
  initQuiz();
  initResults();
  initSearch();
  initFiche();
  initData();
  initImport();
  initRestore();
  initEditListes();
  listSelection.init();

  document.getElementById('version-footer').textContent = 'v' + APP_VERSION;

  navigate('screen-home');

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/flashjap/sw.js', { type: 'module' }).catch(() => {});
  }
}

boot();
