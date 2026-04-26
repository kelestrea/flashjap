# FlashJap — Document de contexte pour Claude Code

## Vue d'ensemble

Application PWA de révision de japonais (kanjis + vocabulaire), installable sur iPhone via Safari. Pas de build, pas de Node.js — HTML/JS pur déployé sur GitHub Pages.

**Repo GitHub** : `https://github.com/kelestrea/flashjap`
**URL de l'app** : `https://kelestrea.github.io/flashjap/`
**Compte GitHub** : kelestrea

---

## Stack technique

- PWA (HTML/JS pur, ES modules, pas de framework)
- IndexedDB pour le stockage local
- Google Cloud TTS (Neural2) pour l'audio japonais, Web Speech API en fallback
- GitHub Pages pour l'hébergement
- Service Worker : Cache First pour assets statiques, Stale-While-Revalidate pour HTML

---

## Architecture des fichiers

```
/
├── index.html          — Point d'entrée unique, contient tout le markup HTML de tous les écrans
├── manifest.json       — Config PWA
├── sw.js               — Service Worker
├── css/app.css         — Charte graphique complète (variables CSS)
├── icons/              — 192.png et 512.png (icône personnalisée)
└── js/
    ├── app.js          — Boot : openDB → initAudio → init tous les écrans → navigate('screen-home')
    ├── db.js           — IndexedDB + toute la logique métier (scores, recherche, sélection quiz)
    ├── router.js       — Navigation SPA avec pile d'état, overlays, popup confirmation
    ├── audio.js        — Google Cloud TTS (Neural2) + Web Speech API fallback
    ├── icons.js        — SVG inline partagés
    ├── lists-state.js  — Persistance localStorage (listes sélectionnées, valeur slider)
    ├── screens/
    │   ├── home.js             — Accueil avec camembert global + grille 2x2 sous-camemberts
    │   ├── quiz-params.js      — Paramètres de session
    │   ├── list-selection.js   — Sélection des listes avec catégories collapsibles
    │   ├── quiz.js             — Logique quiz complet
    │   ├── results.js          — Résultats de session
    │   ├── search.js           — Recherche avec pagination et toggle automatique
    │   ├── fiche.js            — Fiche détail (push depuis recherche)
    │   ├── data.js             — Écran données (import/export/restaurer)
    │   ├── import.js           — Import JSON + prompt Claude
    │   ├── restore.js          — Restauration base
    │   └── edit-listes.js      — Édition des listes d'un mot/kanji
    └── components/
        ├── card-vocab.js   — Fiche vocab (overlay) + buildKanjiContent + stats
        └── card-kanji.js   — Fiche kanji (overlay direct)
```

---

## Charte graphique

Variables CSS dans `css/app.css` :
```css
--bg: #FEFCF7          /* fond principal */
--bg2: #F0EDE6         /* surfaces secondaires */
--border: #C8C4BC      /* bordures */
--blue: #2C4A7C        /* couleur dominante / texte principal */
--gray: #888888        /* texte secondaire */
--green: #1D9E75       /* maîtrisé / actions positives */
--purple: #7F77DD      /* en cours */
--amber: #FAC775       /* étudié */
--red: #E24B4A         /* erreur / actions destructives */
```

Icônes : style pinceau effilé, trait fin ~1.2px, terminaisons rondes.
Bouton audio : triangle play plein dans un rond.

---

## Modèle de données

### Fiche Vocabulaire
```json
{
  "type": "vocab",
  "mot": "台所",
  "hiragana": "だいどころ",
  "romaji": "daidokoro",
  "traductions": ["cuisine"],
  "listes": ["JLPT N5"],
  "kanjis_composants": ["台", "所"],
  "score_lecture": null,
  "score_jpfr": null,
  "score_frjp": null,
  "consec_lecture": 0,
  "consec_jpfr": 0,
  "consec_frjp": 0,
  "err_consec_lecture": 0,
  "err_consec_jpfr": 0,
  "err_consec_frjp": 0,
  "derniere_vue_lecture": null,
  "derniere_vue_jpfr": null,
  "derniere_vue_frjp": null,
  "created_at": 1713556800000
}
```

### Fiche Kanji
```json
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
  ],
  "score_comprehension_jpfr": null,
  "score_comprehension_frjp": null,
  "score_lecture_on": null,
  "score_lecture_kun": null,
  "consec_comprehension_jpfr": 0,
  "consec_comprehension_frjp": 0,
  "consec_lecture_on": 0,
  "consec_lecture_kun": 0,
  "err_consec_comprehension_jpfr": 0,
  "err_consec_comprehension_frjp": 0,
  "err_consec_lecture_on": 0,
  "err_consec_lecture_kun": 0,
  "derniere_vue_jpfr": null,
  "derniere_vue_frjp": null,
  "created_at": 1713556800000
}
```

---

## Règles fonctionnelles

### Statuts de progression

| Statut | Couleur | Critère |
|---|---|---|
| Non commencé | #C8C4BC | Aucun score testé (tous null) |
| Étudié | #FAC775 | Score = 0 (présenté, jamais réussi) |
| En cours | #7F77DD | Score entre 1 et 4 |
| Maîtrisé | #1D9E75 | Score = 5 |

**Règles de score :**

*Initialisation (quand score est null) :*
- Première réponse correcte → score = 1 (en cours)
- Première erreur → score = 0 (étudié)

*Évolution (quand score ≠ null) :*
- Bonne réponse → score + 1 (max 5)
- 2 erreurs consécutives → score - 1 (min 0)

**Statut global vocab** (calcul basé sur les 3 scores : lecture, jpfr, frjp) :
- **Mode display** (`mode: 'display'`, défaut) : maximum des scores testés (null ignoré) — utilisé sur l'accueil pour afficher la progression globale la plus optimiste
- **Mode quiz** (`mode: 'quiz'`) : minimum des scores testés (null ignoré) — utilisé ponctuellement hors sélection de cartes

**Statut global kanji** (même logique que vocab, appliquée aux 4 scores) :
- Les 4 scores (comprehension_jpfr, comprehension_frjp, lecture_on, lecture_kun) suivent la règle min/max identique
- Mode quiz → minimum, mode display → maximum
- Null ignoré dans les deux cas

### Scores vocab (3 indépendants)
- `score_lecture` — mode Lecture (saisir la lecture du mot)
- `score_jpfr` — Compréhension JP→FR (saisir la traduction)
- `score_frjp` — Compréhension FR→JP (saisir la lecture depuis la traduction)

### Scores kanji (4 indépendants)
- `score_comprehension_jpfr` — voir kanji, saisir la traduction
- `score_comprehension_frjp` — voir traduction, saisir la lecture
- `score_lecture_on` — score lecture on
- `score_lecture_kun` — score lecture kun

### Validation des réponses quiz

**Mode Lecture — vocab** : hiragana OU romaji acceptés, espaces ignorés. Uniquement les mots contenant au moins un kanji sont présentés.

**Mode Lecture — kanji** : format `kun on` séparés par un espace. Les deux doivent être corrects pour valider. `score_lecture_kun` et `score_lecture_on` sont incrémentés séparément. Si kun absent → seulement on attendu, et vice-versa. Romaji accepté en alternative.

**Boutons de correction après validation — mode Lecture kanji** : deux boutons indépendants remplacent le bouton unique correct/incorrect.

- Disposition : `[Fiche] [kun correct/incorrect] [on correct/incorrect] [Suivant]` sur une seule ligne ; flex avec shrink autorisé
- Bouton kun masqué si le kanji n'a pas de lecture kun ; idem pour on
- État initial des boutons :
  - Validation correcte ou "Je sais" → `[kun incorrect]` (rouge) + `[on incorrect]` (rouge) — action disponible : marquer comme incorrect
  - Validation incorrecte ou "Je ne sais pas" → `[kun correct]` (vert) + `[on correct]` (vert) — action disponible : marquer comme correct
- Clic sur un bouton : bascule le score de cette lecture depuis l'état pré-validation (`reapplyKanjiLectureScores` avec les deux états courants en un seul `put`), met à jour la zone de feedback et les styles des boutons Fiche/Suivant
- La carte est comptée en erreur de session si kun OU on est en état incorrect au moment de "Suivant"
- Labels complets ("kun correct" / "kun incorrect") ; fallback automatique vers icônes "kun ✓" / "kun ✗" si la ligne déborde
- `✓` / libellé "correct" → `btn-success` (--green) ; `✗` / libellé "incorrect" → `btn-danger` (--red)

Dans les autres modes (vocab lecture, compréhension JP→FR/FR→JP), le bouton unique correct/incorrect (`quiz-toggle`) reste inchangé.

**Mode Compréhension JP→FR** : saisir la traduction française.

**Mode Compréhension FR→JP** : saisir hiragana ou romaji.

### Boutons "Je ne sais pas" / "Je sais"

Présents dans l'écran quiz, entre le bouton "valider" et le compteur de progression. Visibles uniquement **avant** validation (disparaissent avec le champ de saisie quand la correction s'affiche).

- **"Je ne sais pas"** (rouge, `btn-danger`) : enregistre une mauvaise réponse sans saisie
- **"Je sais"** (vert, `btn-success`) : enregistre une bonne réponse sans saisie

Comportement identique à une validation normale : la correction est affichée, l'utilisateur avance manuellement. En mode lecture kanji, "Je sais" incrémente `score_lecture_kun` ET `score_lecture_on`.

Implémentation : `validateForced(bool)` dans `quiz.js`, partage `applyResult()` avec `validate()`.

### Option Autoplay (compréhension JP→FR uniquement)

- Disponible dans les paramètres quiz uniquement quand `type=comprehension` ET `sens=jpfr`
- Toggle "Silence" (défaut) / "Autoplay" — section `qp-autoplay-section` dans `index.html`
- Préférence persistée via localStorage (clé `quizAutoplay`) dans `lists-state.js`
- En mode autoplay : `speak(card.mot || card.kanji)` est appelé dans `showCard()` à chaque nouvelle carte
- Passé dans le state de navigation : `{ ..., autoplay: 'silence' | 'autoplay' }`
- Si voix japonaise indisponible : `speak()` retourne silencieusement, pas d'erreur

### Écran de résultats

**Données transmises depuis `quiz.js` vers `screen-results` :**
- `cards` — cartes de la session terminée (peut être un sous-ensemble si "Rejouer les erreurs")
- `cards_initial` — cartes du quiz initial lancé depuis `quiz-params` (toujours conservé intact, sert de référence pour "Recommencer")
- `errors` — cartes mal répondues dans la session en cours
- `params` — `{ type, sens, cat, critere, listes, autoplay }`

**Boutons d'action (construits dynamiquement dans `enterResults()`) :**
- Si erreurs > 0 : `[Recommencer][Rejouer les erreurs]` sur une ligne + `[Accueil]` pleine largeur en dessous
- Si erreurs = 0 : `[Accueil][Recommencer]` sur une ligne
- **"Recommencer"** (`btn-primary` bleu) : repart de `cards_initial` remélangé aléatoirement, `cards_initial` conservé inchangé dans le state suivant
- **"Rejouer les erreurs"** (amber) : repart uniquement des `errors` de la session courante, `cards_initial` conservé inchangé
- **"Accueil"** (`btn-ghost`) : `navigate('screen-home')`

### Critères de sélection quiz

Tous les filtres et tris opèrent sur le **score du sens de quiz sélectionné** (pas le statut global). La correspondance sens → clé(s) de score est assurée par `getScoreKeysForSens()` dans `db.js` :
- vocab `lecture` → `score_lecture`
- vocab `jpfr` → `score_jpfr`
- vocab `frjp` → `score_frjp`
- kanji `jpfr` → `score_comprehension_jpfr`
- kanji `frjp` → `score_comprehension_frjp`
- kanji `lecture` → `score_lecture_on` + `score_lecture_kun` (minimum des deux)

La correspondance sens → clé de timestamp (`derniere_vue`) suit la même logique : `derniere_vue_lecture`, `derniere_vue_frjp`, ou `derniere_vue_jpfr`.

| Critère | Filtre | Tri avant sélection (pour le slider) |
|---|---|---|
| Tous | Aucun | — |
| Moins maîtrisés | score du sens ≠ 5 (maîtrisé) | Score croissant, puis `derniere_vue` croissant |
| Revus il y a longtemps | `derniere_vue` du sens ≥ 3 semaines ou null | Du plus ancien au plus récent |
| Jamais étudié | score(s) du sens = null | Du plus récent au plus ancien (`created_at`) |

Après sélection des N cartes selon le critère, **toujours mélanger aléatoirement** avant de lancer le quiz.

### Listes

- Les listes sont des tags libres affectés à chaque entrée
- Un mot peut appartenir à plusieurs listes
- La liste `"automatique"` est attribuée aux kanjis générés automatiquement depuis les composants vocab à l'import
- **Règle** : si un mot/kanji a au moins une liste autre que `"automatique"`, la liste `"automatique"` est retirée automatiquement
- À l'import, si un doublon est détecté, les nouvelles listes sont fusionnées (pas d'écrasement des scores)


### Suppression de fiches

- Disponible depuis la fiche détail (vocab et kanji) via le bouton "supprimer la fiche"
- Fonctions dans `db.js` : `deleteVocab(mot)`, `deleteKanji(kanji)`
- Invalide l'index de recherche en mémoire (`_searchIndex = null`) après suppression

### Recherche

- Champs indexés : kanji/mot, hiragana, romaji, traductions/sens, listes
- Toggle pour exclure/inclure les entrées de la liste "automatique" (exclus par défaut)
- Pagination : 50 résultats par page
- Debounce 200ms sur la saisie

**Mode review (post-import) :** Si `screen-search` est appelé avec `importReviewItems` dans le state, le mode review est activé :
- `_allResults` chargé directement depuis `importReviewItems` (pas de requête à l'index)
- Champ de recherche désactivé (`readonly`, opacité réduite)
- Toggle auto masqué
- Flag `_reviewMode = true` empêche `type-changed` de réinitialiser la liste
- Retour via `goBack()` → screen-import (résumé préservé car `enterImport(state, isBack=true)` ne réinitialise pas)

### Sélection des Listes

#### Mémoire des paramètres (via `lists-state.js`)
- Listes cochées persistées via **localStorage** (clé: `selectedListes`) — module `lists-state.js`
- Valeur du slider persistée via **localStorage** (clé: `quizSliderValue`, défaut: 20)
- État "ouvert/fermé" des catégories : session uniquement (non persisté)
- Validation : minimum 1 liste sélectionnée obligatoire

#### Affichage sur quiz-params
- Affiche uniquement listes sélectionnées (liste texte simple, groupées par catégorie, séparées par `·`)
- Bouton "choisir les listes" positionné en bas de la section Listes
- Navigation vers `screen-list-selection` au clic
- Slider : min=1, max=nombre de cartes disponibles, valeur restaurée depuis localStorage

#### Écran screen-list-selection (`js/screens/list-selection.js`)
**Titre:** "Sélectionner les listes"

**Affichage catégories:**
- Extraction: premier mot de chaque nom de liste (premier token non-espace) = catégorie
  - Ex: "leçon 1.1" → "leçon" | "ML 08042026" → "ML" | "JPLT N5" → "JPLT"
- Tri alphabétique des catégories, sauf `automatique` toujours placée en dernier
- Catégories ouvertes par défaut (collapsible)

**Interactions:**
- Checkbox par liste (cocher/décocher), état préservé même catégorie fermée
- "Tout cocher / Tout décocher" par catégorie (en en-tête)
- Bouton "Valider" haut droite → retour quiz-params + sauvegarde via `lists-state.setSelectedListes()`
- Back/fermeture sans Valider → annule changements (retour à l'état précédent)

---

## Navigation

SPA avec pile d'état dans `router.js`. Pas de rechargement de page.

**Types de transitions :**
- `navigate(id, state)` — push (écran suivant glisse depuis la droite)
- `goBack()` — pop (retour)
- Overlays (bottom sheet) — depuis quiz/résultats vers fiches détail
- Push depuis recherche → fiche détail (pas d'overlay)

**Overlays :**
- Fiche vocab depuis quiz/résultats : bottom sheet avec fond semi-transparent
- Fiche kanji depuis fiche vocab : push par-dessus l'overlay (second layer)
- Fiche kanji directe (overlay) : bottom sheet

**Règles de navigation :**
- Bouton ← depuis quiz → retour aux paramètres (avec confirmation)
- Depuis fiche → retour à l'écran précédent systématique
- Navigate vers `screen-home` vide la pile
- Bouton "Accueil" (barre globale) → vide la pile et navigue vers `screen-home` depuis n'importe quel écran

**État global :**
- Type vocab/kanji sélectionné persiste entre tous les écrans via `type-state.js`
- Quand on retourne à un écran précédent, le type garde sa dernière valeur
- Synchronisation globale via événement `type-changed` dispatché par tous les toggles

**Documentation détaillée :** voir [SCREENS.md](./SCREENS.md) pour l'inventaire complet des écrans, l'arborescence de navigation, la matrice des transitions, et les patterns de navigation.

---

## Prompt d'import (Claude)

Le prompt complet est stocké dans `js/screens/import.js` dans la constante `PROMPT_FULL`. Il guide Claude pour transformer une liste de mots en JSON structuré.

**Étapes du prompt :**
1. Vérification des paramètres (demander la liste si absente)
2. Analyse du contenu (texte libre, image OCR, tableau...)
3. Questions avant production (champs incertains regroupés en un message)
4. Génération automatique des fiches kanji depuis `kanjis_composants` des fiches vocab → liste `["automatique"]`, dédupliqués
5. Production du JSON (fichier à télécharger, pas affiché dans le chat)

**Règles de classification :**
- Par défaut → fiche vocab
- Si l'utilisateur précise explicitement → kanji

**Règles de validation à l'import (`validateEntry` dans db.js) :**
- Vocab : `mot`, `hiragana`, `traductions`, `listes` obligatoires
- Kanji : `kanji`, `listes`, `sens` obligatoires

**Vérification post-import :** Après un import terminé, 4 cases cliquables apparaissent dans le résumé :
- **Importés** : fiches créées ou mises à jour avec succès
- **Doublons ignorés** : fiches fusionnées (scores préservés, listes fusionnées)
- **Échecs** : fiches en erreur de validation
- **Total fichier** : union dédupliquée des trois catégories (par type + clé)

Cases vides → grisées et non-cliquables (`.stat-card--disabled`). Clic → `navigate('screen-search', { importReviewItems: [...], importReviewType: 'imported'|'duplicates'|'errors'|'total' })`.

`enterImport(state, isBack)` préserve l'affichage du résumé si `isBack=true` (retour depuis screen-search review).

---

## Audio

`js/audio.js` — Google Cloud TTS (moteur principal) + Web Speech API (fallback).

**Google Cloud TTS** : moteur principal si une clé API est configurée.
- Clé stockée dans `localStorage` (`gcloudTtsKey`) — jamais committée, saisie dans l'écran Données
- Voix stockée dans `localStorage` (`gcloudTtsVoice`, défaut : `ja-JP-Neural2-B`)
- Cache en RAM (`Map`) : un texte déjà lu n'entraîne pas de nouvel appel réseau dans la session
- Endpoint : `POST https://texttospeech.googleapis.com/v1/text:synthesize`
- Réponse MP3 base64 lue via `new Audio('data:audio/mp3;base64,...')`
- Si appel échoue → fallback silencieux vers Web Speech API

**Voix disponibles** (configurables dans l'écran Données) :
- `ja-JP-Neural2-B` — femme, très naturel
- `ja-JP-Neural2-C` — homme, très naturel
- `ja-JP-Wavenet-D` — homme, naturel (moins cher)
- `ja-JP-Wavenet-A` — femme, naturel (moins cher)

**Web Speech API (fallback)** : utilisée si aucune clé Cloud TTS n'est configurée.
- Sélection de la première voix `lang.startsWith('ja')` au boot
- Polling robuste iOS : `setInterval` 100ms, max 30 tentatives
- Fallback `onvoiceschanged` si polling échoue

**Lectures kanji** : `speakKanji(entry)` lit kun puis on (avec délais).
- Les lectures kanji peuvent contenir des points (ex. `みじか.い`) qui indiquent la limite morphologique du kanji
- Les points sont supprimés avant synthèse vocale via `cleanKanjiReading()` pour lisibilité TTS
- Exemple : `みじか.い` → `みじかい` (le point est supprimé, le contenu complet est prononcé naturellement)

**Sécurité de la clé** : restreindre aux referrers HTTP `https://kelestrea.github.io/*` dans Google Cloud Console + quota journalier pour éviter tout abus.

---

## Déploiement GitHub Pages

**Procédure de mise à jour :**
1. Modifier les fichiers dans le repo
2. Committer et pusher sur `main`
3. GitHub Pages redéploie automatiquement (1-2 minutes)

**Mise à jour sur iPhone après déploiement :**
- Le service worker doit être invalidé pour que les nouveaux fichiers soient servis
- **Méthode standard** : incrémenter la version dans `js/version.js` ET `sw.js` (constante `CACHE`) à chaque déploiement — les deux fichiers doivent rester synchronisés (voir CLAUDE.md)
- Fallback : désinstaller et réinstaller la PWA sur iPhone (garanti)

**Reset de la base IndexedDB :**
- Depuis l'app : Données → Restaurer → "Tout réinitialiser" + fichier JSON vide `{"vocab":[],"kanji":[]}`
- Depuis iPhone : Réglages → Safari → Avancé → Données des sites web → supprimer kelestrea.github.io

**Important** : après un changement de schéma de données (nouveaux champs de score), un reset de la base est nécessaire car les anciennes entrées n'ont pas les nouveaux champs.

---

---

## Architecture détaillée des modules

### Dépendances entre modules (vue globale)

```
index.html
    ↓
app.js (boot)
    ├→ db.js (initialisation IndexedDB)
    ├→ audio.js (initialisation Web Speech API)
    ├→ router.js (initialisation navigation)
    └→ screens/* (initialisation tous les écrans)

router.js (gestion navigation/état)
    ↓ (utilisé par tous les écrans)

db.js (état central)
    ├→ IndexedDB (vocab + kanji)
    ├→ Scoring logic (getStatut, getStatutGlobal)
    ├→ Search index (buildSearchIndex)
    └→ Import/Export (formatage)

Écrans (screens/*)
    ├→ Utilisent: router.js, db.js
    ├→ Affichent: DOM depuis index.html
    └→ Composants: renderVocabCard, renderKanjiCard

Composants (components/*)
    ├→ card-vocab.js (fiche vocab)
    ├→ card-kanji.js (fiche kanji)
    └→ Utilisent: db.js, router.js, audio.js
```

### Modules clés et leurs responsabilités

| Module | Lignes | Responsabilité |
|---|---|---|
| `db.js` | 357 | État IndexedDB, logique scoring, recherche, import/export |
| `screens/quiz.js` | 313 | Écran principal quiz (logique réponses, transition cartes) |
| `components/card-vocab.js` | 235 | Rendu fiche vocab (overlay), gestion interactions |
| `router.js` | 96 | Navigation SPA, pile d'état, overlays, popups |
| `screens/home.js` | 138 | Accueil avec camemberts (charts) |
| `screens/fiche.js` | 144 | Détail entrée (depuis recherche ou quiz) |
| `screens/import.js` | 177 | Intégration Claude API, import JSON |
| `audio.js` | ~120 | Google Cloud TTS + Web Speech API fallback, cache RAM |
| `screens/quiz-params.js` | 140 | Sélection paramètres quiz |
| `screens/list-selection.js` | 178 | Sélection des listes (catégories collapsibles) |
| `lists-state.js` | 31 | Persistance localStorage (listes, slider) |
| `type-state.js` | ~12 | Gestion centralisée du type vocab/kanji, persiste entre écrans |
| `global-header.js` | ~60 | Barre d'en-tête globale sticky avec toggles et bouton Accueil |
| `icons.js` | 25 | SVG inline réutilisables |

### État global et partagé

Aucun store centralisé. État distribué :
- **IndexedDB** : état persistant (vocab, kanji, scores, listes)
- **Variables locales (`screens/*.js`)** : état de session (filtre cherche, paramètres quiz)
- **Router state** : pile de navigation, état overlay
- **DOM** : sources de vérité pour certains inputs (champs de saisie)

**Flux données** : IndexedDB ← → écrans ← → DOM ← → utilisateur

### Exports par module (pour dépendances rapides)

#### `db.js`
- Helpers : `esc()`, `openDB()`, `loadDefaultDatabase()`
- Statut : `getStatut()`, `getStatutGlobal()`, `STATUT_COLOR`
- Crud vocab/kanji : `getAllVocab()`, `getVocab()`, `putVocab()`, `getAllKanji()`, `getKanji()`, `putKanji()`
- Scoring : `updateScore()`, `updateKanjiLectureScores()`
- Listes : `getListes()`, `getAllListes()`
- Quiz : `getCardsForQuiz()`
- Import/Export : `exportAll()`, `importAll()`, `saveEntry()` → `{ status: 'ok'|'doublon', entry }`, `validateEntry()`
- Recherche : `buildSearchIndex()`, `search()`

#### `router.js`
- Navigation : `navigate()`, `goBack()`, `currentState()`, `replaceState()`
- Overlays : `openOverlay()`, `closeOverlay()`
- Popups : `showPopup()`
- Inscription : `registerScreen()`

#### `audio.js`
- Initialisation : `initAudio()`
- Playback : `speak()`, `speakKanji()`
- Config Cloud TTS : `setCloudKey(key, voice)`, `getCloudConfig()`
- État : `isAvailable()`

#### `lists-state.js`
- Listes : `getSelectedListes()`, `setSelectedListes(listes)`, `initializeSelectedListes(allListes)`
- Slider : `getSliderValue()`, `setSliderValue(value)`

#### `type-state.js`
- État global : `getSelectedType()`, `setSelectedType(type)`
- Persistance : localStorage (clé : `selectedCategory`, défaut : `'vocab'`)
- Synchronisation : `type-changed` event dispatché à chaque changement pour synchroniser UI globale

#### `global-header.js`
- Initialisation : `initGlobalHeader()`
- (Gère automatiquement les événements de toggles et synchronisation globale)

#### `screens/*`
- Chaque écran exporte `init*()` appelé au boot
- Chaque écran écoute `navigate()` via `registerScreen()`

#### `components/*`
- `renderVocabCard(entry, returnCb)` — Overlay bottom sheet avec overlay controls
- `buildKanjiContent(entry, isPush, isScreen)` — HTML pour kanjis composants (utilisé par vocab + directement)
- `renderKanjiCard(entry, returnCb)` — Overlay bottom sheet kanji

---

## Flux d'initialisation détaillé

```
1. DOMContentLoaded
   └→ app.js boot()
       ├→ openDB()
       │   └→ IndexedDB onupgradeneeded si version récente
       │       ├→ ObjectStore 'vocab' (keyPath: 'mot')
       │       │   └→ Indices: hiragana, romaji, listes
       │       └→ ObjectStore 'kanji' (keyPath: 'kanji')
       │           └→ Indice: listes
       │
       ├→ loadDefaultDatabase()
       │   └→ Si IndexedDB vide, importe flashjap_base.json
       │
       ├→ initAudio()
       │   ├→ Polling voix (100ms, max 30 tentatives)
       │   └→ Fallback onvoiceschanged
       │
       ├→ init*() pour chaque écran
       │   └→ registerScreen(id, { enter, leave })
       │       └→ Enregistre callbacks pour show/hide
       │
       ├→ navigate('screen-home')
       │   ├→ Pousse sur pile
       │   ├→ Appelle enter() du nouveau screen
       │   └→ Rend visible le DOM
       │
       └→ Service Worker
           └→ register('/flashjap/sw.js')
```

---

## Patterns et conventions

### Naming
- **Écrans** : `screen-{nom}` (ex: `screen-quiz`)
- **Statuts** : `noncommence`, `etudie`, `encours`, `maitrise` (pas de tiret)
- **Variables privées** : préfixe `_` (ex: `_db`, `_available`)
- **Constantes** : SCREAMING_SNAKE_CASE (ex: `CACHE`, `DB_NAME`, `ASSETS`)

### DOM
- Tous les éléments HTML dans `index.html`
- Écrans identifiés par `id="screen-{nom}"`
- Boutons/inputs identifiés par `data-action` ou `id` direct
- Classes CSS : BEM-ish (`quiz__card`, `overlay__bg`)

### Sélection d'éléments
- `document.getElementById('screen-quiz')` pour écrans
- `document.querySelector('[data-action="next"]')` pour actions
- `el.querySelector()` pour recherche dans sous-arbre

### Événements
- `registerScreen()` → callbacks `enter(state)` et `leave()`
- `addEventListener('change')`, `addEventListener('click')` directs sur éléments
- Pas de delegation systématique (petit projet)
- **`type-changed`** — Événement custom dispatché par les toggles vocab/kanji pour synchroniser l'UI globale via `global-header.js`

### Validation
- `validateEntry()` dans db.js (obligatoires listés)
- Validation UI dans écrans (ex: longueur réponse)
- Validation scores dans `updateScore()` (min 0, max 5)

### Persistance des préférences utilisateur
- Catégorie vocab/kanji : localStorage clé `selectedCategory` (via `type-state.js`), défaut `'vocab'`
- Listes sélectionnées : localStorage clé `selectedListes` (via `lists-state.js`)
- Valeur slider quiz : localStorage clé `quizSliderValue` (via `lists-state.js`)
- Mode autoplay : localStorage clé `quizAutoplay` (via `lists-state.js`)
- Toutes les préférences sont restaurées au boot, pas de synchronisation cross-tab

### Clavier dynamique du quiz
- L'input du quiz (`#quiz-input`) reçoit l'attribut `lang` ajusté **à chaque nouvelle carte** selon le type de quiz
- **Lecture** → `lang="ja"` (clavier japonais)
- **Compréhension JP→FR** → `lang="fr"` (clavier français)
- **Compréhension FR→JP** → `lang="ja"` (clavier japonais)
- Implémentation : dans `showCard()` de `screens/quiz.js`, juste avant le nettoyage du champ
- L'utilisateur peut toujours override le clavier via le sélecteur de langue du périphérique

### XSS Prevention
- Toujours `esc()` avant `innerHTML` sur données utilisateur
- Si élément créé via `createElement`, safer mais moins répandu ici

---

## Performance et optimisations

### Requêtes IndexedDB
- Transactions readonly par défaut (`readwrite` seulement si nécessaire)
- `getAll()` OK pour vocab/kanji (données petites ~200-500 entrées)
- Index sur `listes` (multiEntry) pour filtrage rapide

### Recherche
- `buildSearchIndex()` construit index in-memory à chaque recherche
- Pas de réindexation incrémentale (peu fréquent)
- Debounce 200ms sur input recherche

### Service Worker
- Cache First pour JS/CSS (assets statiques)
- Stale-While-Revalidate pour HTML (toujours fresh, mais donne ancien si réseau KO)
- Incrémenter `CACHE` (`flashjap-v1` → `flashjap-v2`) pour forcer invalidation

### Pagination
- Recherche : 50 résultats par page
- Pas de lazy loading, tout charger d'un coup OK

---

## Debugging et tooling

### Outils utiles
- **Safari DevTools** (iPhone) : voir console, IndexedDB, Service Worker
- **Chrome DevTools (Desktop)** : Application → Storage → IndexedDB → flashjap
- **Logs** : `console.log()` partout, pas de logger framework

### Inspection IndexedDB
```javascript
// Dans console navigateur
const req = indexedDB.open('flashjap');
req.onsuccess = e => {
  const db = e.target.result;
  const tx = db.transaction('vocab', 'readonly');
  const os = tx.objectStore('vocab');
  const all = os.getAll();
  all.onsuccess = () => console.log(all.result);
};
```

### Tests
- Pas de framework test (HTML/JS pur)
- Tests manuels : iPhone Safari + DevTools Chrome desktop
- Cas critiques :
  - Import avec doublon (fusion listes)
  - Scoring avec 2 erreurs consécutives
  - Quiz multi-sens (kanji + vocab)
  - Transitions overlays (ordre push/pop)

### Linting avec ESLint

**Configuration:**
- `eslint.config.js` — ESLint 9 flat config format
- **Règle clé** : `no-undef: error` — attrape les variables non définies (prévient les `ReferenceError`)
- Autres erreurs : `no-redeclare`, `no-func-assign`, `no-const-assign`
- Warnings (non-bloquants) : `no-unused-vars`, `no-var`, `semi`, `eqeqeq`
- Globals déclarés : toutes les APIs browser (document, fetch, localStorage, etc.) + Service Worker (self, caches)

**Utilisation locale:**
```bash
npm install           # Installation des dépendances (ESLint 9)
npm run lint          # Lancer ESLint (affiche erreurs + warnings)
npm run lint:fix      # Auto-corriger les issues fixables
```

**CI/CD:**
- GitHub Actions exécute `npm run lint` sur chaque push vers main/test
- Lint doit passer avant déploiement (bloque si erreurs `no-undef`)
- Warnings ne bloquent pas (encouragement plutôt que contrainte)

**Bonnes pratiques:**
- Toujours vérifier `npm run lint` avant de commiter
- Les PRs échouent si variables non définies détectées
- Cela prévient des bugs comme `getSelectedCategory()` de sliper en production

---

## Points d'attention

### Sécurité
- **XSS** : toujours `esc()` avant `innerHTML` sur données utilisateur
- **IndexedDB** : pas de requête SQL, données structurées = moins de risque injection
- Apostrophes : droites uniquement `'` (pas typographiques)

### Compatibilité
- **iOS Safari** : tester overlays/transitions sur iPhone réel
  - Google Cloud TTS : appel réseau externe → nécessite connexion (pas offline)
  - Web Speech API (fallback) : polling 100ms + fallback `onvoiceschanged`
- **Desktop** : Chrome/Firefox/Safari (desktop) testé moins régulièrement

### Clé API Google Cloud TTS
- Stockée en `localStorage` (jamais committée)
- Restreindre aux referrers `https://kelestrea.github.io/*` dans Google Cloud Console
- Fixer un quota journalier pour éviter les abus
- Le fallback Web Speech API est transparent si la clé est absente ou si l'appel échoue

### Maintenance
- **Pas de build** : pas npm, pas webpack — ES modules natifs uniquement
- **Service Worker** : incrémenter `CACHE` dans `sw.js` pour invalidation
- **Schéma IndexedDB** : modifications rares (v1 depuis ~2 ans)
  - Ajouter champ → tous les anciens manquent le champ (undefined/null)
  - Ajouter score → détecter et init à null dans écrans pertinents

### Git & Deploy
- Repo public : `kelestrea/flashjap`
- Hébergement : GitHub Pages (automatique)
- Branche : `main`
- Mise à jour : commit → push → redéploiement 1-2 min

---

## Checklist avant commit

- [ ] XSS : vérifier tout `innerHTML` sur données utilisateur (utiliser `esc()`)
- [ ] Apostrophes : uniquement droites
- [ ] Import/Export : tester round-trip
- [ ] Overlays : tester sur iPhone (transitions, fermeture)
- [ ] Scoring : vérifier min/max (0-5 vocab, logique kanji)
- [ ] Recherche : pagination et debounce fonctionnent
- [ ] Service Worker : incrémenter `CACHE` si fichiers importants modifiés
- [ ] DOM : tous les `id` et `data-action` existent dans `index.html`

---

