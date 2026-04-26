const CACHE = 'flashjap-3.2.9';
const ASSETS = [
  '/flashjap/',
  '/flashjap/index.html',
  '/flashjap/css/app.css',
  '/flashjap/js/db.js',
  '/flashjap/js/router.js',
  '/flashjap/js/audio.js',
  '/flashjap/js/icons.js',
  '/flashjap/js/lists-state.js',
  '/flashjap/js/type-state.js',
  '/flashjap/js/global-header.js',
  '/flashjap/js/version.js',
  '/flashjap/js/app.js',
  '/flashjap/js/screens/home.js',
  '/flashjap/js/screens/quiz-params.js',
  '/flashjap/js/screens/quiz.js',
  '/flashjap/js/screens/results.js',
  '/flashjap/js/screens/search.js',
  '/flashjap/js/screens/fiche.js',
  '/flashjap/js/screens/edit-listes.js',
  '/flashjap/js/screens/list-selection.js',
  '/flashjap/js/screens/data.js',
  '/flashjap/js/screens/import.js',
  '/flashjap/js/screens/restore.js',
  '/flashjap/js/components/card-vocab.js',
  '/flashjap/js/components/card-kanji.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network only pour les requêtes externes
  if (!url.pathname.startsWith('/flashjap/')) return;
  // Cache first pour assets statiques, stale-while-revalidate pour HTML
  if (e.request.destination === 'document') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })
        .catch(() => c.match(e.request))
      )
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(nr => {
        caches.open(CACHE).then(c => c.put(e.request, nr.clone()));
        return nr;
      }))
    );
  }
});
