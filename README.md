# Mooncello

CMS headless open source. Définissez vos types de contenu depuis l'interface d'administration,
servez-les via une API REST.

## Fonctionnement

Les types de contenu ne sont pas écrits dans le code : ils se créent depuis l'admin et vivent en
base. Une définition de type décrit ses champs — texte, nombre, date, énumération, média, relation,
ou groupe répétable imbriqué — et le CMS en dérive à la volée le schéma de validation des entrées.

Le schéma SQL, lui, ne change jamais. Créer un type est une insertion, pas une migration.

## Stack

TypeScript · Bun · Turborepo · Biome

**API** — Hono, Kysely, PostgreSQL, Better Auth, Zod, Scalar
**Admin** — React, Vite, TanStack Router/Query/Form, `@empreint/ui`, Lucide

## Démarrer

Prérequis : [Bun](https://bun.sh) et Docker.

```bash
cp .env.example .env
bun install
bun run db:setup
bun run dev
```

| Service | URL |
|---|---|
| API | http://localhost:3333 |
| Documentation de l'API | http://localhost:3333/docs |
| Admin | http://localhost:5173 |
| PostgreSQL | `localhost:5433` |

Pensez à remplacer `BETTER_AUTH_SECRET` dans `.env` par une chaîne aléatoire d'au moins
32 caractères.

## Développer

```bash
bun run check      # lint et format
bun run typecheck
bun run test
bun run fsd        # conformité Feature-Sliced Design
```

## Licence

MIT — voir [LICENSE](LICENSE).
