# Attribution des rôles

En tant qu'administrateur, je veux attribuer et retirer des rôles aux utilisateurs, afin de
contrôler qui a le droit de faire quoi sur l'instance.

**Critères d'acceptation :**

- [ ] Un écran d'admin liste les utilisateurs avec les rôles qu'ils portent
- [ ] L'API expose l'attribution et le retrait d'un rôle, pilotables depuis cet écran
- [ ] Un utilisateur peut porter plusieurs rôles
- [ ] Un administrateur ne peut pas retirer son propre rôle `admin` s'il est le dernier à le porter :
      l'API répond 409
- [ ] Un administrateur ne peut pas supprimer son propre compte s'il est le dernier administrateur :
      l'API répond 409
- [ ] Le retrait d'un rôle prend effet à la requête suivante de l'utilisateur concerné, sans attendre
      une reconnexion — vérifié par test d'intégration
