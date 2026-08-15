# Gestion des rôles

En tant qu'administrateur, je veux créer, modifier et supprimer des rôles et régler leurs
permissions type de contenu par type de contenu, afin d'adapter les accès à mon équipe sans
redéployer.

**Critères d'acceptation :**

- [ ] L'API expose la création, la lecture, la modification et la suppression des rôles
- [ ] Un écran d'admin liste les rôles et permet de les éditer
- [ ] Une permission se règle par couple (type de contenu, action) parmi `read`, `create`, `update`,
      `delete`, `publish`, avec une option « tous les types »
- [ ] Les rôles `admin` et `public` ne peuvent être ni supprimés ni renommés : l'API répond 403
- [ ] Les permissions du rôle `public` restent modifiables mais limitées à `read` ; toute autre
      action répond 422
- [ ] Supprimer un rôle porté par au moins un utilisateur répond 409, avec la liste des utilisateurs
      concernés dans le corps de l'erreur
- [ ] Après la suppression d'un type de contenu, ses permissions disparaissent et l'écran des rôles
      s'affiche sans erreur
- [ ] Les erreurs renvoyées sont conformes à `apiErrorSchema`
