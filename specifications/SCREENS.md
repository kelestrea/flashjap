# FlashJap — Architecture des écrans

Ce document détaille tous les écrans de l'application, leur arborescence, et les patterns de navigation. Il complète [SPEC.md](./SPEC.md) qui couvre les modules, le modèle de données et les règles métier.

---

## Vue d'ensemble des écrans

| ID HTML | Fichier JS | Rôle |
|---------|-----------|------|
| `screen-home` | `screens/home.js` | Tableau de bord — point d'entrée principal |
| `screen-quiz-params` | `screens/quiz-params.js` | Configuration du quiz avant lancement |
| `screen-quiz` | `screens/quiz.js` | Boucle de quiz (affichage carte + validation) |
| `screen-results` | `screens/results.js` | Bilan post-session |
| `screen-search` | `screens/search.js` | Recherche full-text paginée |
| `screen-fiche` | `screens/fiche.js` | Détail complet d'une entrée (vocab ou kanji) |
| `screen-data` | `screens/data.js` | Gestion base de données + config TTS |
| `screen-list-selection` | `screens/list-selection.js` | Sélection des listes pour le quiz |
| `screen-import` | `screens/import.js` | Import de données JSON |
| `screen-restore` | `screens/restore.js` | Restauration d'une sauvegarde |
| `screen-edit-listes` | `screens/edit-listes.js` | Édition des listes d'un mot/kanji |

**Éléments UI superposés (non-écrans) :**

| ID HTML | Type | Rôle |
|---------|------|------|
| `overlay-bg` | Fond semi-transparent | Fermeture overlay au clic |
| `overlay-sheet` | Bottom sheet | Fiche vocab ou kanji depuis quiz/résultats |
| `push-sheet` | Bottom sheet (z-index supérieur) | Transition kanji depuis fiche vocab en overlay |
| `popup` | Modal centré | Confirmation destructive (suppression, restauration) |

---

## Arborescence de navigation

```
screen-home  [point d'entrée, pile vidée]
│
├─ #home-quiz-btn ──────────────────→ screen-quiz-params
│                                         │
│          #qp-manage-listes ────────────→ screen-list-selection
│                                         │     │
│          ←─────── #ls-validate (goBack) ┘     │
│                   ←── fermeture sans valider ──┘ (annule)
│                                         │
│          #qp-start ────────────────────→ screen-quiz
│                                              │
│                    fin de session ──────────→ screen-results
│                                              │    │
│                    #results-restart ─────────┘    │→ screen-quiz (cartes_initial)
│                    #results-retry ────────────────→ screen-quiz (errors seulement)
│                    #results-home ─────────────────→ screen-home
│                    clic entrée erreur ────────────→ [overlay: card-vocab/card-kanji]
│                                              │
│                    clic entrée ──────────────→ [overlay: card-vocab/card-kanji]
│                    │                              clic kanji composant
│                    │                              └─→ [push-sheet: card-kanji]
│                    │                              #edit-listes-btn
│                    │                              └─→ screen-edit-listes
│                    │                                    └─ goBack → [overlay]
│                    │
│                    ← (avec popup confirmation) ──→ screen-quiz-params
│
├─ #home-search-btn ────────────────→ screen-search
│                                         │
│          clic item ────────────────────→ screen-fiche
│                                              │
│                    #fiche-edit-listes ───────→ screen-edit-listes
│                                              │     └─ goBack → screen-fiche
│                    ← goBack ────────────────→ screen-search
│
└─ #home-data-btn ──────────────────→ screen-data
                                          │
         #data-import ───────────────────→ screen-import
                                          │     │
                                          │     ├─ clic case (importés/doublons/échecs/total)
                                          │     │       └──────────────→ screen-search (review)
                                          │     │                              │
                                          │     │             clic item ───────→ screen-fiche
                                          │     │                              │   └─ goBack → screen-search
                                          │     │             goBack ──────────→ screen-import (résumé préservé)
                                          │     │
                                          │     └─ #import-done → screen-home
         #data-restore ──────────────────→ screen-restore
                                                └─ (après restauration) → screen-home
```

---

## Inventaire détaillé des écrans

### `screen-home` — Accueil

**Fichier :** `js/screens/home.js`

Point d'entrée de l'application. Naviguez vers `screen-home` vide la pile complète.

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil inerte (droite)

**Contenu :**
- Toggle vocab / kanji (mémorisé dans state global `type-state.js`)
- Donut chart global (maîtrisé / en cours / étudié / non commencé)
- Grille 2×2 de sous-camemberts par type de quiz
- Chiffres clés : total de fiches, à réviser aujourd'hui

**State reçu :** `{ type: 'vocab' | 'kanji' }` (optionnel, défaut `'vocab'`)

---

### `screen-quiz-params` — Paramètres quiz

**Fichier :** `js/screens/quiz-params.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

**Contenu :**
- Catégorie vocab/kanji sélectionnée via **barre globale** sous la topbar
- **Section filtre** avec toggle **Listes / Fréquence** en en-tête :
  - *Mode Listes* : listes sélectionnées affichées (groupées par catégorie, séparées par `·`) + bouton "choisir les listes" → `screen-list-selection`
  - *Mode Fréquence* : 5 chips (essentiel / très courant / courant / rare / inusité), sélection multiple, persistée dans localStorage
- Critère : tous / moins maîtrisés / vus il y a longtemps / jamais étudié
- Type : toggle **Lecture / Compréhension**
- Sens : JP→FR / FR→JP
- Autoplay (visible uniquement si `type=compréhension` ET `sens=jpfr`)
- Slider nombre de cartes (persisté localStorage)
- Bouton Lancer grisé (`disabled`) en mode Fréquence uniquement si 0 labels sélectionnés ou 0 cartes disponibles

**Mémoire des paramètres :** tous les paramètres (listes, slider, filtre, fréquence, autoplay, type, sens, critère) sont persistés **séparément pour vocab et kanji**. Changer de type via le toggle global recharge immédiatement l'ensemble des paramètres du nouveau type (`enterParams()` rappelé via `type-changed`).

**State reçu :** `{ type: 'vocab' | 'kanji' }`

**State passé à quiz :** `{ cards, cards_initial, type, sens, cat, critere, listes, autoplay }`

---

### `screen-list-selection` — Sélection des listes

**Fichier :** `js/screens/list-selection.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

Accessible uniquement depuis `screen-quiz-params`. Retour sans valider annule les changements.

**Contenu :**
- Catégories dépliables (premier mot du nom de liste = catégorie)
- Checkbox par liste, "Tout cocher / Tout décocher" par catégorie
- Bouton "Valider" (haut droite) → sauvegarde via `lists-state.setSelectedListes()` + `goBack()`

---

### `screen-quiz` — Quiz

**Fichier :** `js/screens/quiz.js`

**Header global :** Bouton Accueil (topbar) uniquement — barre de toggles exclue (catégorie fixée pour la durée du quiz)

**Contenu :**
- Carte courante (mot/kanji selon type)
- Champ de saisie réponse + bouton Valider
- Boutons "Je ne sais pas" / "Je sais" (avant validation)
- Feedback correction (après validation)
- Boutons de correction après validation :
  - **Autres modes** : `[Fiche] [correct/incorrect] [Suivant]` — bouton unique bascule les deux scores ensemble
  - **Mode Lecture kanji** : `[Fiche] [kun correct/incorrect] [on correct/incorrect] [Suivant]` — deux boutons indépendants, un par lecture ; bouton masqué si la lecture est absente du kanji
- Bouton Suivant
- Compteur de progression
- Bouton ← avec popup de confirmation

**State reçu :** `{ cards, cards_initial, type, sens, cat, critere, listes, autoplay }`

**State passé à results :** `{ cards, cards_initial, errors, params: { type, sens, cat, critere, listes, autoplay } }`

**Comportement input :**
- Focus automatique et nettoyage du champ à chaque nouvelle carte
- Attribut `lang` ajusté dynamiquement selon le type de quiz :
  - **Lecture** → `lang="ja"` (clavier japonais)
  - **Compréhension JP→FR** → `lang="fr"` (clavier français)
  - **Compréhension FR→JP** → `lang="ja"` (clavier japonais)
- L'utilisateur peut override le clavier proposé via le sélecteur de langue du périphérique

---

### `screen-results` — Résultats

**Fichier :** `js/screens/results.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

**Contenu :**
- Badge dynamique `#results-badge` (juste sous la topbar, dans le contenu) : type de quiz + nombre de cartes, ex. "Lecture · 20 cartes"
- Donut chart session (correct / incorrect)
- Liste des entrées mal répondues (cliquables → overlay fiche)
- Boutons dynamiques :
  - Si erreurs > 0 : `[Recommencer][Rejouer les erreurs]` + `[Accueil]`
  - Si erreurs = 0 : `[Accueil][Recommencer]`

**State reçu :** `{ cards, cards_initial, errors, params }`

---

### `screen-search` — Recherche

**Fichier :** `js/screens/search.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

**Contenu (mode normal) :**
- Champ de recherche (debounce 200ms)
- Résultats paginés (50 par page)
- Résultats triés : JLPT décroissant (N5 en premier, sans JLPT en dernier), puis fréquence croissante, puis maîtrise décroissante

**Contenu (mode review post-import) :** activé si `state.importReviewItems` est présent
- Champ de recherche désactivé (readonly, grisé)
- Items affichés directement depuis `importReviewItems`, sans requête à l'index de recherche
- Retour via `goBack()` → screen-import avec résumé préservé

**Format d'affichage des résultats (commun aux deux modes) :**
- **Vocab** : `[mot] [hiragana]` sur une seule ligne, lectures en couleur `--gray`
- **Kanji** : `[kanji] [kun · on]` sur une seule ligne (ex. `水 みず · スイ`), lectures en couleur `--gray`
  - Si kun absent : affiche seulement on
  - Si on absent : affiche seulement kun

**State reçu :**
- Mode normal : `{ type: 'vocab' | 'kanji' }` (optionnel)
- Mode review : `{ importReviewItems: Entry[], importReviewType: 'imported'|'duplicates'|'errors'|'total' }`

**State passé à fiche :** `{ key: mot | kanji, ktype: 'vocab' | 'kanji' }`

---

### `screen-fiche` — Fiche détail

**Fichier :** `js/screens/fiche.js`

**Header global :** Bouton Accueil (topbar) uniquement — barre de toggles exclue (la fiche affiche un type fixé reçu via state)

Affiche le détail complet d'une entrée. Accessible depuis `screen-search` (push classique) et depuis overlays quiz/résultats (overlay).

**Contenu vocab :** lectures, traductions, kanjis composants, scores par sens, ligne Jisho (label fréquence à gauche + lien Jisho à droite), boutons éditer listes / supprimer

**Contenu kanji :** lectures on/kun, exemples, scores, ligne Jisho (label fréquence à gauche + lien Jisho à droite), boutons éditer listes / supprimer

**Ligne Jisho** (vocab et kanji) : `<label fréquence | "-"> ... <lien Jisho>` — le label est calculé à la volée via `getFreqLabel()` ; si `frequence` est défini, affiche `"<classe> (rang <N>)"` (ex : `"courant (rang 342)"`). Si `frequence` est null, affiche `-`.

**State reçu :** `{ key: string, ktype: 'vocab' | 'kanji' }`

---

### `screen-data` — Données

**Fichier :** `js/screens/data.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

**Contenu :**
- Boutons Import / Export / Restaurer (amber) — hiérarchie : amber = réversible avec sauvegarde
- Configuration TTS :
  - Saisie clé API Google Cloud (champ password, bouton Enregistrer)
  - Toggle **Neural / Standard** (deux boutons côte à côte, classes `.toggle` / `.toggle-btn`) — persistance immédiate en `localStorage` au clic, sans bouton Sauvegarder
- Bouton "Vider la base" (rouge, pleine largeur) en bas de l'écran, isolé par un séparateur — action irréversible avec popup de confirmation

---

### `screen-import` — Import

**Fichier :** `js/screens/import.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

**Contenu :**
- Zone upload fichier JSON
- Prompt Claude (constante `PROMPT_FULL`) pour aider à structurer les données
- Résumé post-import : 4 cases cliquables (Importés / Doublons ignorés / Échecs / Total fichier)
  - Case non vide → `.stat-card--clickable`, clic → `navigate('screen-search', { importReviewItems, importReviewType })`
  - Case vide → `.stat-card--disabled` (grisée, non-cliquable)
- Liste des lignes en échec (si erreurs de validation)
- Bouton "Terminé" → `navigate('screen-home')` (pile vidée)

**Comportement `enter(state, isBack)` :** Si `isBack=true` (retour depuis screen-search review), le résumé reste affiché sans réinitialisation.

---

### `screen-restore` — Restaurer

**Fichier :** `js/screens/restore.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

**Contenu :**
- Upload fichier de sauvegarde JSON
- Option : conserver ou réinitialiser les scores (radio buttons)
  - "Conserver les scores" (défaut) : le contenu des fiches est remplacé par le fichier, seuls les champs de score sont préservés depuis la base pour les fiches déjà existantes ; les fiches absentes du fichier ne sont pas supprimées
  - "Tout réinitialiser" : la base est entièrement vidée avant l'écriture, tout le contenu du fichier est écrit tel quel

Retour : navigue vers `screen-home` (pile vidée).

---

### `screen-edit-listes` — Édition des listes

**Fichier :** `js/screens/edit-listes.js`

**Header global :** Barre avec toggles vocab/kanji (gauche) et bouton Accueil (droite)

Accessible depuis `screen-fiche` et depuis les overlays (via fiche vocab/kanji).

**Contenu :**
- Checkboxes sur listes existantes
- Champ ajout d'une nouvelle liste

Retour : `goBack()` vers l'écran précédent (fiche ou overlay).

**State reçu :** `{ key: string, ktype: 'vocab' | 'kanji' }`

---

## Topbar — structure commune

Chaque écran possède sa propre `div.topbar` (sticky, z-index 10). Tous les écrans affichent systématiquement un sous-titre "日本語クイズ" (`div.topbar-sub`, 11px, couleur `--gray`) au-dessus du titre principal (`div.topbar-title`, 18px).

**Pattern type avec bouton retour :**
```html
<div class="topbar">
  <button class="back-btn">…</button>
  <div style="flex:1;margin-left:10px;">
    <div class="topbar-sub">日本語クイズ</div>
    <div class="topbar-title">Titre de l'écran</div>
  </div>
</div>
```

**Pattern sans bouton retour (screen-home, screen-results) :**
```html
<div class="topbar">
  <div>
    <div class="topbar-sub">日本語クイズ</div>
    <div class="topbar-title">Titre</div>
  </div>
</div>
```

Les IDs dynamiques portés par `topbar-title` : `quiz-badge` (screen-quiz), `fiche-title` (screen-fiche).

---

## Header global

**Fichier :** `js/global-header.js`

Barre persistante (sticky) présente sur **tous les écrans sauf screen-quiz, screen-fiche et overlays**. Reste visible lors du scroll du contenu.

**Composition :**
- **Gauche** : toggles vocab/kanji (deux boutons/tabs, largeur égale)
- **Droite** : bouton "Accueil" (texte, sera remplacé par icône ultérieurement)

**Positionnement :**
- Position : sticky
- Top : calculé dynamiquement en fonction de la hauteur de la topbar
- Z-index : 9 (sous topbar z-index 10)
- Reste visible au scroll du contenu

**Comportement :**
- Type sélectionné (vocab/kanji) est synchronisé globalement via `type-state.js`
- Clics sur les toggles dispatch un événement `type-changed` pour synchronisation UI
- Bouton "Accueil" navigue vers `screen-home` avec pile vidée (`navigate('screen-home')`)
- État persiste entre les écrans : si utilisateur sélectionne "Kanji" sur search, retour à home affiche "Kanji" sélectionné
- Sur screen-home, le bouton "Accueil" est présent mais inerte (utilisateur est déjà à l'accueil)

**Exclusions :**
- screen-quiz et screen-fiche : barre de toggles exclue (catégorie fixée par le contexte)
- Overlays (bottom sheets) : `overlay-sheet`, `push-sheet` — header global ne s'affiche pas au-dessus
- Popups de confirmation : header global reste sous le fond semi-transparent

**Style :**
- Fond : `var(--bg)`
- Border-bottom : 0.5px solid `var(--border)`
- Padding : 10px 20px
- Border-radius des toggles : 6px (identique à barre existante dans screen-search)

---

## Matrice des transitions

**Note :** Le bouton "Accueil" (barre globale, droite) depuis **tous les écrans** sauf overlays navigate vers `screen-home` avec pile vidée (équivalent à `navigate('screen-home')`).

| De | Vers | Type | Déclencheur | State transmis |
|----|------|------|------------|----------------|
| `screen-home` | `screen-quiz-params` | Stack | `#home-quiz-btn` | `{ type }` |
| `screen-home` | `screen-search` | Stack | `#home-search-btn` | `{ type }` |
| `screen-home` | `screen-data` | Stack | `#home-data-btn` | — |
| `screen-quiz-params` | `screen-list-selection` | Stack | `#qp-manage-listes` | — |
| `screen-list-selection` | `screen-quiz-params` | Stack | `#ls-validate` (goBack) | — |
| `screen-quiz-params` | `screen-quiz` | Stack | `#qp-start` | `{ cards, cards_initial, type, sens, cat, critere, listes, autoplay }` |
| `screen-quiz` | `screen-quiz-params` | Stack | ← + confirmation | — (goBack) |
| `screen-quiz` | `screen-results` | Stack | fin session + Suivant | `{ cards, cards_initial, errors, params }` |
| `screen-results` | `screen-quiz` | Stack | `#results-restart` | `{ cards: shuffle(cards_initial), cards_initial, ... }` |
| `screen-results` | `screen-quiz` | Stack | `#results-retry` | `{ cards: errors, cards_initial, ... }` |
| `screen-results` | `screen-home` | Stack | `#results-home` | — (pile vidée) |
| `screen-search` | `screen-fiche` | Stack | clic sur un résultat | `{ key, ktype }` |
| `screen-fiche` | `screen-edit-listes` | Stack | `#fiche-edit-listes` | `{ key, ktype }` |
| `screen-edit-listes` | *(précédent)* | Stack | Sauvegarder | — (goBack) |
| `screen-data` | `screen-import` | Stack | `#data-import` | — |
| `screen-import` | `screen-search` | Stack | clic case résumé (non vide) | `{ importReviewItems, importReviewType }` |
| `screen-import` | `screen-home` | Stack | `#import-done` | — (pile vidée) |
| `screen-data` | `screen-restore` | Stack | `#data-restore` | — |
| `screen-restore` | `screen-home` | Stack | après restauration | — (pile vidée) |
| Quiz ou Résultats | `[overlay-sheet]` | Overlay | clic sur une entrée | — (openOverlay) |
| `[overlay-sheet]` vocab | `[push-sheet]` kanji | Push interne | clic kanji composant | — (push interne) |
| `[overlay-sheet]` | `screen-edit-listes` | Stack | `#edit-listes-btn` | `{ key, ktype }` |

---

## Patterns de navigation

### Stack-based navigation

**Fichier :** `js/router.js`

L'application est une SPA avec une pile d'états (`stack[]`). Chaque `navigate()` empile un écran ; `goBack()` dépile.

```javascript
navigate(id, state = {})   // Empile l'écran, appelle leave() puis enter(state)
goBack()                   // Dépile, appelle leave() puis enter(prevState, isBack=true)
currentState()             // Lit le state de l'écran courant
replaceState(patch)        // Fusionne un patch dans le state courant (spread)
```

**Cas particulier :** `navigate('screen-home')` vide la pile complètement (`stack.length = 0`), garantissant un état propre.

**`isBack` flag :** Le hook `enter(state, isBack)` reçoit `true` quand on revient en arrière. Exemple dans `screens/search.js` : ne réinitialise pas le champ de recherche si `isBack === true`.

---

### Overlays (bottom sheets)

**Fichiers :** `js/router.js`, `js/components/card-vocab.js`, `js/components/card-kanji.js`

Les overlays n'utilisent pas la pile principale — ils ont leur propre pile `overlayStack[]`.

```javascript
openOverlay(sheetEl, bgEl)   // Empile, rend visible
closeOverlay()                // Dépile, masque
```

`goBack()` ferme d'abord les overlays avant de dépiler les écrans.

**Deux niveaux d'overlay :**
1. `overlay-sheet` — fiche vocab ou kanji principale (depuis quiz ou résultats)
2. `push-sheet` (z-index supérieur) — fiche kanji accessible depuis un composant kanji dans `overlay-sheet`

La transition vocab → kanji dans l'overlay est gérée par `card-vocab.js` : le HTML vocab est sauvegardé dans `_overlayStack[]`, le `push-sheet` est animé par-dessus, puis le retour restaure le HTML vocab.

**Ligne Jisho dans les overlays** (vocab et kanji) : même pattern que `screen-fiche` — label fréquence avec rang `"<classe> (rang <N>)"` (ou `-`) à gauche en `--gray`, lien Jisho à droite sur la même ligne.

---

### Hooks d'écrans

**Fichier :** `js/router.js` (`registerScreen`)

Chaque écran s'enregistre au boot avec des callbacks :

```javascript
registerScreen('screen-quiz', {
  enter(state, isBack) { /* appelé à chaque affichage de l'écran */ },
  leave()              { /* appelé quand l'écran se cache */        }
})
```

| Écran | Ce que fait `enter()` |
|-------|----------------------|
| `screen-home` | Rebuild stats et charts selon `state.type` |
| `screen-quiz-params` | Charge les listes disponibles, applique le type, rafraîchit le slider |
| `screen-quiz` | Initialise `_state`, affiche la première carte |
| `screen-results` | Rendu donut, liste erreurs, génère boutons dynamiques |
| `screen-search` | Mode normal : reconstruit l'index, relance la recherche. Mode review (`importReviewItems`) : charge les items directement, désactive le champ de recherche et le toggle auto |
| `screen-import` | Si `isBack=false` : réinitialise le formulaire et masque le résumé. Si `isBack=true` : ne fait rien (préserve le résumé pour retour depuis screen-search review) |
| `screen-fiche` | Fetch l'entrée en DB, render le contenu |
| `screen-list-selection` | Charge les listes, applique l'état coché depuis `lists-state.js` |
| `screen-edit-listes` | Charge les listes, pré-coche celles de l'entrée |

---

### Popup de confirmation

**Fichier :** `js/router.js`

```javascript
showPopup(message, onConfirm, onCancel, confirmLabel = 'Confirmer')
```

Utilisé pour les actions destructives : quitter le quiz en cours, supprimer une fiche, restaurer la base, vider la base. Le paramètre `confirmLabel` permet de personnaliser le libellé du bouton de confirmation (ex. `'Vider'`).

---

### Passage de state entre écrans

Le state est un objet libre passé à `navigate(id, state)` et récupéré dans `enter(state)`. Clés utilisées par écran :

| Récepteur | Clés attendues dans `state` |
|-----------|-----------------------------|
| `screen-quiz-params` | `type` |
| `screen-quiz` | `cards`, `cards_initial`, `type`, `sens`, `cat`, `critere`, `listes`, `autoplay` |
| `screen-results` | `cards`, `cards_initial`, `errors`, `params` |
| `screen-search` | `type` (mode normal) ou `importReviewItems`, `importReviewType` (mode review) |
| `screen-fiche` | `key`, `ktype` |
| `screen-edit-listes` | `key`, `ktype` |

---

## Cycle de vie d'un écran (pattern)

Tous les écrans suivent le même pattern d'implémentation :

```javascript
// 1. Sélection des éléments DOM au boot (une seule fois)
const el = document.getElementById('screen-mon-ecran');
const btn = el.querySelector('#mon-btn');

// 2. Attache des événements (une seule fois)
btn.addEventListener('click', () => { /* ... */ });

// 3. Enregistrement dans le router
export function initMonEcran() {
  registerScreen('screen-mon-ecran', {
    enter(state, isBack) {
      // Appelé à chaque affichage — charger données, mettre à jour DOM
    },
    leave() {
      // Appelé quand l'écran disparaît — nettoyage si nécessaire
    }
  });
}
```

Le hook `leave()` est peu utilisé dans le projet (pas de cleanup systématique nécessaire). L'état de session est porté par les variables locales du module (`_state`, `_cards`, etc.) et par `currentState()` / `replaceState()` du router.
