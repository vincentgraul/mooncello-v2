# Connexion

En tant qu'utilisateur de l'admin, je veux me connecter et me déconnecter, afin d'accéder à mon
espace de travail et de le refermer quand je le quitte.

**Critères d'acceptation :**

- [ ] `/connexion` présente un formulaire email et mot de passe
- [ ] Des identifiants valides ouvrent une session et redirigent vers le tableau de bord
- [ ] Des identifiants invalides affichent un message générique qui ne révèle pas si l'email existe
- [ ] Sans session, toute route de l'admin autre que `/connexion` et `/installation` redirige vers
      `/connexion`
- [ ] Une fois connecté, `/connexion` redirige vers le tableau de bord
- [ ] La déconnexion est accessible depuis l'en-tête, invalide la session côté serveur et redirige
      vers `/connexion`
- [ ] Si la session expire pendant l'édition d'une entrée, le brouillon en cours est conservé
      localement et restauré après reconnexion, sans redirection brutale qui perdrait la saisie
