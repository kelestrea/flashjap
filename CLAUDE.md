# FlashJap - Refonte Sélection des Listes

## Exigences Fonctionnelles

### Mémoire des Listes

- Les listes cochées doivent être mémorisées entre sessions via **localStorage** (clé: `selectedListes`)
- État "ouvert/fermé" des catégories: mémorisé en session uniquement (optionnel, non persisté)
- Validation requise: au moins 1 liste doit rester sélectionnée (refuse action vide)

### Affichage sur quiz-params

- Affiche uniquement les listes sélectionnées (liste texte simple, séparées par `;`)
- Bouton "Gérer les listes" avec icone positionné en haut à droite de la section Listes
- Navigation vers `screen-list-selection` au clic

### Nouvel écran: screen-list-selection

**Titre:** "Sélectionner les listes"

**Affichage des catégories:**
- Extraction: Premier mot de chaque nom de liste (jusqu'au premier espace) = catégorie
  - Exemples: "leçon 1.1" → "leçon" | "ML 08042026" → "ML" | "JPLT N5" → "JPLT"
- Tri alphabétique des catégories
- Catégories fermées par défaut (collapsible)

**Interactions:**
- Checkbox par liste (cocher/décocher)
  - État dépendant conservé même catégorie fermée
- "Tout cocher" / "Tout décocher" par catégorie (en en-tête de chaque catégorie)
- Bouton "Valider" en haut à droite → retour à quiz-params avec mise à jour localStorage
- Back/fermeture sans Valider → annule les changements (retour à l'état précédent)

---

## Modifications Techniques

### Fichiers à Créer

#### `js/lists-state.js`
Gestion centralisée de l'état des listes sélectionnées:
- `getSelectedListes()` → array depuis localStorage
- `setSelectedListes(array)` → écrit localStorage (refuse si vide)
- `initializeSelectedListes(allListes)` → initialise avec toutes listes si localStorage vide

#### `js/screens/list-selection.js`
Nouvel écran de sélection:
- Récupère type (vocab/kanji) de l'état passé par quiz-params
- Charge toutes listes avec `getListes(type)` de `db.js`
- Logique catégorisation et tri alphabétique
- État local `_tempListes` (copie localStorage, appliquée seulement si Valider)
- Enregistrement: `registerScreen('screen-list-selection', { enter: enterListSelection })`

### Fichiers à Modifier

#### `js/screens/quiz-params.js`
- Affiche listes sélectionnées depuis `selectedListes` (localStorage) en texte simple
- Ajoute bouton "Gérer les listes" → navigate vers screen-list-selection
- `enter()` recharge depuis localStorage (synchronise après retour de list-selection)

#### `js/app.js`
- Import: `import * as listSelection from './screens/list-selection.js'`
- Initialisation: `listSelection.init()` (ou équivalent selon pattern)

#### `index.html`
- Ajoute `<div id="screen-list-selection" class="screen">` après `#screen-quiz-params`
- Structure HTML: en-têtes catégories + listes avec checkboxes + bouton Valider

#### `css/app.css`
- Styles pour `.list-category-header` (boutons "Tout cocher/décocher")
- Styles pour `.list-category-content` (listes de la catégorie)
- Animation toggle catégorie

---

## Patterns à Réutiliser

- `getListes(type)` de `db.js` pour récupérer toutes les listes
- HTML/CSS des checkboxes de `quiz-params.js`
- Navigation `navigate()` et `goBack()` du router
- Enregistrement `registerScreen()` pour nouveaux écrans

---

## Arch État Management

**localStorage (persisté entre sessions):**
```javascript
localStorage.selectedListes = JSON.stringify(['leçon 1.1', 'N5', ...])
```

**Session (volatil):**
- État open/closed des catégories sur screen-list-selection (variables locales)

---

## Testing Checkpoints

- [ ] localStorage contient `selectedListes` après Valider
- [ ] Quiz-params affiche listes sélectionnées (`;` séparés)
- [ ] Catégories triées alpha et fermées par défaut
- [ ] Toggle catégorie / "Tout cocher/décocher" fonctionnent
- [ ] Valider → update + retour à quiz-params
- [ ] Back sans Valider → annule
- [ ] ≥1 liste obligatoire (refuse tout décoché)
- [ ] Persistance cross-session (fermer/rouvrir app)
