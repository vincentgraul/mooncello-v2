# Résolution de la session côté API

En tant que développeur travaillant sur l'API, je veux que chaque requête résolve l'utilisateur
appelant et ses rôles, afin que les routes décident en connaissance de cause sans refaire ce travail
chacune de leur côté.

**Critères d'acceptation :**

- [ ] Un middleware lit la session Better Auth et expose dans le contexte Hono l'utilisateur, ses
      rôles et ses permissions effectives
- [ ] Sans session valide, le contexte porte une identité anonyme rattachée au rôle `public`
- [ ] Une session expirée ou révoquée est traitée comme anonyme, pas comme une erreur
- [ ] Les rôles et permissions sont relus à chaque requête : un droit retiré pendant une session
      active ne survit pas à la requête suivante — vérifié par test d'intégration
- [ ] Les permissions effectives d'un utilisateur portant plusieurs rôles sont l'union de leurs
      permissions
- [ ] `/health` et les routes `/api/auth/*` restent accessibles sans session
