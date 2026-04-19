// app.js — Point d'entrée
import { openDB } from './db.js';
import { initAudio } from './audio.js';
import { navigate } from './router.js';
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

async function boot() {
  await openDB();
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

  navigate('screen-home');

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/flashjap/sw.js').catch(() => {});
  }
}

boot();
