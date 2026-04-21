# flashjap - Instructions pour Claude Code

## À propos du projet

**flashjap** est une Progressive Web App (PWA) pour la révision de vocabulaire et kanji japonais.

- **Stack** : HTML/JavaScript pur, IndexedDB, Web Speech API
- **Déploiement** : GitHub Pages (automatique à chaque push sur `main`)
- **URL live** : https://kelestrea.github.io/flashjap/

## Source unique de vérité

Le fichier **SPEC.md** est la documentation source du projet. Il contient :
- Architecture complète
- Modèle de données
- Règles fonctionnelles
- Patterns de code
- Conventions

Tous les changements de code doivent rester alignés avec SPEC.md.

## Directive : Validation SPEC.md avant merge

**Quand tu me demandes de merger une PR**, voici le workflow :

1. **J'analyse** les changements de code dans la PR
2. **Je te propose** un plan détaillé des sections SPEC.md à mettre à jour
3. **Tu valides** le plan (tu peux l'accepter, le modifier, ou rejeter certaines sections)
4. **Je fais** les changements de SPEC.md et je les commite dans la PR
5. **On merge** la PR avec SPEC.md à jour

Cela garantit que la documentation reste à jour et cohérente avec le code.

### Sections SPEC.md à vérifier typiquement

- **Architecture** : Si structure de fichiers ou modules changent
- **Modèle de données** : Si IndexedDB schema ou structure change
- **Règles fonctionnelles** : Si comportement utilisateur change
- **Système de navigation** : Si routing ou état SPA change
- **Patterns de code** : Si conventions de code changent
- **Points d'attention** : Si considérations de sécurité/compatibilité émergent
