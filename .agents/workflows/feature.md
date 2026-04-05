# Procédure d'ajout de fonctionnalité (Feature)

Cette procédure doit être suivie à chaque fois qu'une nouvelle fonctionnalité est demandée.

## Étapes
1. **Branche** : Créer une branche locale `feature/nom-de-la-feature`.
2. **Implémentation** : Développer la fonctionnalité en respectant le design system.
3. **Tests** : 
   - Vérifier que `npm run build` passe dans `frontend/`.
   - Vérifier la syntaxe dans `backend/`.
4. **Commit** : Utiliser le format Conventionnel : `feat(scope): description claire`.
5. **Documentation** : Mettre à jour le `walkthrough.md` après chaque ajout majeur.

## Règles d'or
- Ne jamais laisser de code mort.
- Toujours utiliser Axios via l'instance `api` de `client.js`.
- Respecter les schémas Pydantic du backend.
