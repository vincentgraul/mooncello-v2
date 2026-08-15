# Garde d'autorisation

En tant que développeur travaillant sur l'API, je veux un garde qui refuse les actions non
autorisées, afin qu'aucune route n'ait à réimplémenter la vérification et qu'aucune ne puisse
l'oublier.

**Critères d'acceptation :**

- [ ] Un middleware paramétrable par action et par type de contenu protège les routes
- [ ] Une action autorisée passe le garde et la route s'exécute normalement
- [ ] Une action interdite répond 403 avec un corps conforme à `apiErrorSchema`
- [ ] Une requête anonyme sur une route protégée répond 401, distinct du 403 qui signale un
      utilisateur authentifié mais sans droit
- [ ] Le rôle `admin` franchit tous les gardes sans qu'il faille énumérer ses permissions
- [ ] Pour chaque rôle livré, des tests d'intégration couvrent au moins un cas autorisé et un cas
      refusé par action
- [ ] Un test E2E Playwright déroule le parcours complet : installation, connexion, création d'un
      rôle, attribution à un utilisateur, puis refus effectif d'une action non autorisée
