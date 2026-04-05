# Procédure de correction de bug (Bugfix)

Cette procédure est obligatoire pour chaque correction d'erreur.

## Étapes
1. **Reproduction** : Analyser les logs (backend) ou la console (frontend) pour identifier la cause exacte.
2. **Branche** : Créer une branche locale `fix/nom-du-bug`.
3. **Correction** : Modifier le code en minimisant les répercussions.
4. **Validation** : Vérifier que le build passe.
5. **Commit** : Utiliser `fix: description` ou `fix(scope): description`.

## Règles d'or
- Si le bug touche à la DB, vérifier si une migration Alembic est nécessaire.
- Ne pas introduire de régressions.
- Documenter le correctif dans le `walkthrough.md`.
