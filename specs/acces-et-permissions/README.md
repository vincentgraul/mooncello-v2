---
feature: acces-et-permissions
status: validated
---

# Accès et permissions

## Contexte (WHY)

Le scaffold a posé Better Auth et les tables `roles`, `permissions`, `user_roles`, mais **aucune
ligne de logique** ne les exploite. Aujourd'hui l'instance compte zéro utilisateur, n'offre aucun
moyen d'en créer un, n'a pas d'écran de connexion, et aucune route ne sait qui l'appelle.

Toute autre feature en dépend : créer un type de contenu, éditer une entrée, publier, servir l'API
de delivery — chacune suppose de savoir **qui** agit et **ce qu'il a le droit de faire**. C'est donc
la première brique à poser, avant toute fonctionnalité de contenu.

Le choix de rôles dynamiques en base a une conséquence directe : Better Auth ne gère nativement que
des rôles déclarés dans le code. La vérification des permissions est donc une couche à écrire, pas
une option à activer.

## Objectif & périmètre

Fermer la boucle complète, de l'instance vierge jusqu'au refus effectif d'une action non autorisée.

**Dans le périmètre**

- Amorçage du premier administrateur par un assistant d'installation web
- Connexion et déconnexion depuis l'admin
- Résolution de l'appelant et de ses rôles sur chaque requête API
- Gestion des rôles et de leurs permissions depuis l'admin
- Attribution des rôles aux utilisateurs
- Garde d'autorisation appliqué aux routes
- Accès anonyme à l'API de delivery, gouverné par le rôle `public`

**Décisions**

- Une permission porte sur un couple **type de contenu × action** parmi `read`, `create`, `update`,
  `delete`, `publish`, avec la possibilité de viser tous les types
- Rôles livrés : `admin` et `public` (déjà semés par la migration initiale), plus `editor`
- La **révocation est immédiate** : les permissions sont relues à chaque requête
- Supprimer un rôle encore porté est **refusé**, avec la liste des utilisateurs concernés

**Hors périmètre**

- OAuth, SSO et fournisseurs d'identité externes
- Double authentification
- Mot de passe oublié et invitation d'utilisateurs par email — les deux supposent une brique SMTP
  qui n'existe pas
- Journal d'audit des changements de rôles

## Notes techniques

La table `permissions` a déjà la forme `(role_id, action, content_type_id nullable)`, où un
`content_type_id` nul signifie « tous les types ». La granularité retenue **ne demande donc aucune
migration**.

Les rôles système portent `is_system = true`. La suppression d'un type de contenu efface ses
permissions par `ON DELETE CASCADE` ; l'interface des rôles doit le refléter sans casser.

Better Auth gère ses 4 tables via son propre CLI, Kysely gère les 7 tables du CMS. Ne pas mélanger
les deux systèmes de migration — voir `bun run db:setup`.

Les schémas partagés vivent dans `@mooncello/contracts` : `role.schema.ts` est déjà écrit et porte
`permissionActionSchema`, `permissionSchema` et `roleSchema`. Le contrat de cette feature part de là
et se gèle avec `/claude-workflow:contract` avant de paralléliser front et back.

Le garde d'autorisation est un middleware Hono du module `auth`. Les routes ne réimplémentent jamais
la vérification.
