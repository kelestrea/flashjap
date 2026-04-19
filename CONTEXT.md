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
- Web Speech API pour l'audio japonais
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
    ├── audio.js        — Web Speech API, sélection voix japonaise premium/Siri
    ├── icons.js        — SVG inline partagés
    ├── screens/
    │   ├── home.js         — Accueil avec camembert global + grille 2x2 sous-camemberts
    │   ├── quiz-params.js  — Paramètres de session
    │   ├── quiz.js         — Logique quiz complet
    │   ├── results.js      — Résultats de session
    │   ├── search.js       — Recherche avec pagination et toggle automatique
    │   ├── fiche.js        — Fiche détail (push depuis recherche)
    │   ├── data.js         — Écran données (import/export/restaurer)
    │   ├── import.js       — Import JSON + prompt Claude
    │   ├── restore.js      — Restauration base
    │   └── edit-listes.js  — Édition des listes d'un mot/kanji
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
- Bonne réponse → score + 1 (max 5)
- 2 erreurs consécutives → score - 1 (min 0)
- Si score est null et erreur → passe à 0 (étudié)
- Si score est null et bonne réponse → passe à 1

**Statut global vocab** = minimum des scores testés (null ignoré) en mode quiz, maximum en mode affichage accueil.

**Statut global kanji** = même règle sur les 4 scores (comprehension_jpfr, comprehension_frjp, lecture_on, lecture_kun).

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

**Mode Compréhension JP→FR** : saisir la traduction française.

**Mode Compréhension FR→JP** : saisir hiragana ou romaji.

### Critères de sélection quiz

| Critère | Filtre | Tri avant sélection |
|---|---|---|
| Tous | Aucun | — |
| Moins maîtrisés | statut global ≠ maîtrisé | — |
| Revus il y a longtemps | derniere_vue ≥ 3 semaines | Du plus ancien au plus récent |
| Jamais étudié | statut global = non commencé | Du plus récent au plus ancien (created_at) |

Après sélection des N cartes selon le critère, **toujours mélanger aléatoirement** avant de lancer le quiz.

### Listes

- Les listes sont des tags libres affectés à chaque entrée
- Un mot peut appartenir à plusieurs listes
- La liste `"automatique"` est attribuée aux kanjis générés automatiquement depuis les composants vocab à l'import
- **Règle** : si un mot/kanji a au moins une liste autre que `"automatique"`, la liste `"automatique"` est retirée automatiquement
- À l'import, si un doublon est détecté, les nouvelles listes sont fusionnées (pas d'écrasement des scores)

### Recherche

- Champs indexés : kanji/mot, hiragana, romaji, traductions/sens, listes
- Toggle pour exclure/inclure les entrées de la liste "automatique" (exclus par défaut)
- Pagination : 50 résultats par page
- Debounce 200ms sur la saisie

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

---

## Audio

`js/audio.js` — Web Speech API.

Sélection de la voix : scoring des voix japonaises disponibles avec priorité :
1. "Siri Voix 2" (score 200)
2. Autres voix Siri (score 100)
3. Voix "premium" (score 50)
4. Voix "enhanced" (score 30)
5. Kyoko / O-ren (score 20)
6. lang === 'ja-JP' (score 10)

Polling robuste pour iOS : `setInterval` toutes les 100ms, max 30 tentatives (3 secondes), puis fallback `onvoiceschanged`.

**Situation actuelle** : la voix sélectionnée n'est pas encore la voix Siri souhaitée — à investiguer (voir noms exacts des voix disponibles via console Safari).

---

## Déploiement GitHub Pages

**Procédure de mise à jour :**
1. Modifier les fichiers dans le repo
2. Committer et pusher sur `main`
3. GitHub Pages redéploie automatiquement (1-2 minutes)

**Mise à jour sur iPhone après déploiement :**
- Le service worker doit être invalidé pour que les nouveaux fichiers soient servis
- Option 1 : Incrémenter `CACHE` dans `sw.js` (ex: `flashjap-v2`) à chaque déploiement majeur
- Option 2 : Désinstaller et réinstaller la PWA sur iPhone (garanti)

**Reset de la base IndexedDB :**
- Depuis l'app : Données → Restaurer → "Tout réinitialiser" + fichier JSON vide `{"vocab":[],"kanji":[]}`
- Depuis iPhone : Réglages → Safari → Avancé → Données des sites web → supprimer kelestrea.github.io

**Important** : après un changement de schéma de données (nouveaux champs de score), un reset de la base est nécessaire car les anciennes entrées n'ont pas les nouveaux champs.

---

## Points d'attention

- **XSS** : toujours utiliser `esc()` (exporté depuis `db.js`) pour échapper les données utilisateur avant injection dans `innerHTML`
- **Apostrophes** : utiliser uniquement des apostrophes droites `'` dans les strings JavaScript (pas de `'` typographiques)
- **Pas de build** : pas de npm, pas de webpack — tout doit fonctionner en ES modules natifs
- **iOS Safari** : tester les overlays et transitions sur iPhone réel, le comportement peut différer du desktop
- **Service Worker** : penser à incrémenter la version du cache (`CACHE` dans `sw.js`) lors de mises à jour importantes pour éviter que les utilisateurs gardent une version obsolète
