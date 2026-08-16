# Installation initiale

En tant que personne qui installe Mooncello, je veux créer le compte administrateur initial depuis
un écran dédié au premier lancement, afin de prendre la main sur l'instance sans toucher à la base
ni dépendre d'un mot de passe par défaut.

**Critères d'acceptation :**

- [ ] Tant qu'aucun utilisateur ne détient le rôle `admin`, toute route de l'admin redirige vers
      `/installation`
- [ ] L'écran demande un nom, un email, un mot de passe et sa confirmation ; le mot de passe fait
      entre 12 et 128 caractères et l'écran refuse la soumission hors de ces bornes
- [ ] La soumission crée l'utilisateur, lui attribue le rôle `admin`, ouvre une session et redirige
      vers le tableau de bord
- [ ] Le rôle `editor` existe après l'installation, avec les permissions `read`, `create`, `update`
      et `publish` sur tous les types
- [ ] Dès qu'un utilisateur détient le rôle `admin`, l'endpoint de création de l'administrateur
      initial répond 404, même avec une charge valide — vérifié par test d'intégration
- [ ] Dès qu'un utilisateur détient le rôle `admin`, `/installation` redirige vers `/connexion`
- [ ] Deux soumissions concurrentes ne créent qu'un seul administrateur
- [ ] Une installation interrompue entre la création de l'utilisateur et l'attribution du rôle laisse
      l'instance réinstallable, y compris avec le même email — l'utilisateur sans rôle ne verrouille
      pas l'installation et ne bloque pas une nouvelle tentative
