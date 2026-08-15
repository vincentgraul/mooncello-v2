# Accès public à l'API de delivery

En tant que site consommateur du CMS, je veux lire le contenu publié sans authentification, afin de
servir des pages publiques à partir de Mooncello.

**Critères d'acceptation :**

- [ ] L'API de delivery résout les permissions du rôle `public` pour toute requête sans session
- [ ] Seules les entrées `published` sont servies ; aucune entrée `draft` n'apparaît, quel que soit
      le paramètre passé dans la requête
- [ ] Un type de contenu sur lequel `public` n'a pas la permission `read` répond 403
- [ ] Retirer la permission `read` du rôle `public` sur un type le rend inaccessible dès la requête
      suivante — vérifié par test d'intégration
- [ ] Aucune route d'écriture n'est atteignable sans session, quelle que soit la configuration du
      rôle `public`
