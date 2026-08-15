# Mooncello

## WHAT

CMS headless open source (MIT). Les types de contenu se créent **depuis l'admin**, pas dans le code :
l'utilisateur définit ses champs, le CMS valide et sert le contenu via une API REST.

Monorepo Turborepo, TypeScript partout, Bun comme runtime et gestionnaire de paquets.

| Paquet | Rôle |
|---|---|
| `apps/api` | Hono · Kysely · Better Auth · Scalar — API d'admin et API de delivery |
| `apps/admin` | React · Vite · TanStack · `@empreint/ui` — panel d'administration |
| `packages/field-types` | Registre des types de champs et génération des schémas zod |
| `packages/contracts` | Schémas de requête et réponse partagés front ↔ back |
| `packages/typescript-config` | Configs `tsc` communes |

## WHY

Les décisions structurantes, et ce qui les justifie. **Ne les défais pas sans raison explicite.**

### Le contenu vit en JSONB, pas en tables par type

`content_types` porte les définitions, `entries.data` porte le contenu en JSONB. Le schéma SQL ne
change **jamais** : pas de DDL à l'exécution, Kysely reste typé, créer un type est un `INSERT`, faire
évoluer un type est un `UPDATE`. Les champs imbriqués et répétables sont gratuits.

Contrepartie assumée : Postgres ne garantit plus la forme du contenu. C'est `buildEntrySchema()` qui
la garantit, à l'écriture, via l'API — seul chemin d'écriture réel.

### Écriture stricte, lecture tolérante

`buildEntrySchema(fields, 'write')` refuse les clés inconnues, les types invalides et les champs
requis manquants. `buildEntrySchema(fields, 'read')` rend tout optionnel.

Sans ça, ajouter un champ requis rendrait rétroactivement invalides toutes les entrées existantes,
qu'on ne pourrait alors même plus rouvrir pour les corriger.

### Publication appariée, deux lignes par entrée

Une entrée logique = un `documentId` = deux lignes au plus, une `draft` et une `published`, garanties
par la contrainte `entries_document_status_unique`. Publier recopie `draft` vers `published`.

Le modèle à simple colonne `status` a été écarté : éditer une entrée publiée modifierait
immédiatement ce qui est en ligne.

### Rôles dynamiques, y compris le rôle `public`

Les rôles et permissions vivent en base (`roles`, `permissions`, `user_roles`) et se créent depuis
l'admin. Le rôle système `public` gouverne l'accès anonyme à l'API de delivery — c'est pourquoi il
n'y a pas de table de tokens d'API.

Better Auth ne gère nativement que des rôles déclarés en code : la vérification des permissions est
donc une couche maison, branchée sur ces tables.

### Deux systèmes de migration, volontairement séparés

Better Auth gère ses 4 tables (`user`, `session`, `account`, `verification`) via son propre CLI ;
Kysely gère les 7 tables du CMS. `user_roles.user_id` n'a donc **pas** de clé étrangère vers `user` :
c'est le prix du découplage entre les deux systèmes.

`bun run db:setup` enchaîne les deux dans le bon ordre.

## HOW

### Démarrer

```bash
cp .env.example .env   # puis remplacer BETTER_AUTH_SECRET
bun install
bun run db:setup       # Postgres + migrations auth + migrations CMS
bun run dev
```

API sur `http://localhost:3333` (doc Scalar sur `/docs`), admin sur `http://localhost:5173`,
Postgres sur `5433`. Ces ports non standards évitent une collision avec d'autres projets locaux.

### Vérifier

```bash
bun run check      # Biome — lint et format
bun run typecheck  # tsc sur les 4 paquets
bun run test       # Vitest
bun run fsd        # Steiger — conformité Feature-Sliced Design
```

Ces quatre commandes tournent en CI. Elles doivent passer avant toute PR.

### Architecture back — `apps/api`

Monolithe modulaire découpé en **vertical slices**. Un module est un bounded context (`auth`,
`content`, `media`, `delivery`) et n'expose que son `index.ts` ; une slice contient sa route, sa
logique et son accès données plutôt que d'être éclatée par couche. Voir `apps/api/src/modules/README.md`.

Les colonnes SQL sont en snake_case, le `CamelCasePlugin` de Kysely les expose en camelCase. Les
migrations écrivent donc du snake_case, le code applicatif du camelCase.

### Architecture front — `apps/admin`

**Feature-Sliced Design v2.1**, vérifié mécaniquement par `bun run fsd`. Le skill
`claude-workflow:feature-sliced-design` fait foi. Un import ne traverse jamais une slice : il passe
par sa public API. Les segments se nomment par intention (`ui`, `model`, `api`, `lib`, `config`).

### Conventions

`docs/naming-conventions.md` est la source canonique. Biome en applique une partie mécaniquement
(`useFilenamingConvention`, `useNamingConvention`, `noDefaultExport`).

**N'écris pas de commentaires dans le code.** Pas de mention de co-auteur dans les commits.

### Workflow

1. `/claude-workflow:spec` — rédige ou met à jour `specs/<feature>/`
2. `/claude-workflow:contract` — gèle le contrat dans `packages/contracts` avant de paralléliser
3. `/claude-workflow:orchestrator <slug>` — implémente une story via les agents `backend` et
   `front-web` en parallèle, sur worktrees isolés
4. `/claude-workflow:reviewer` puis `/claude-workflow:pr`

Une story à la fois. Ne merge jamais sur `main`, ne merge jamais une PR.

### Design

- Design system : https://www.figma.com/design/abcTVPXgfYtRfMMU2xkJbY/Mooncello---DS
- Maquettes : https://www.figma.com/design/9f0uFGGdTmCUONpaeQImuB/Mooncello

Les composants viennent de `@empreint/ui`, les icônes de `lucide-react`. Le MCP Figma est en
**lecture seule** : les outils d'écriture sont refusés dans `.claude/settings.json`.
