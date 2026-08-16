# Conventions de nommage

Source **canonique** des conventions de nommage de Mooncello. Les agents et les skills s'y
conforment. Les règles Biome `useFilenamingConvention`, `useNamingConvention` et `noDefaultExport`
en appliquent mécaniquement une partie — ce document couvre le reste.

---

## Universel

| Élément | Convention | Exemple |
|---|---|---|
| Dossier | kebab-case | `content-types/` |
| Fichier | kebab-case | `entry-repository.ts` |
| Variable / fonction | camelCase | `buildEntrySchema` |
| Type / interface | PascalCase | `FieldDefinition` |
| Constante de module | UPPER_SNAKE_CASE | `FIELD_KINDS` |
| Boolean | préfixe `is`/`has`/`should` | `isRequired`, `hasAccess` |
| Export | **named export**, jamais `default` | `export const …` |
| Test | colocalisé, `*.test.ts(x)` | `build-entry-schema.test.ts` |

Les seules exceptions à `noDefaultExport` sont les fichiers de configuration
(`vite.config.ts`, `playwright.config.ts`, `steiger.config.js`, `.storybook/*`) et les stories.

Les tests de bout en bout Playwright font exception à `*.test.ts(x)` : ils vivent dans
`apps/admin/e2e/`, hors de `src/`, et se nomment `*.spec.ts`. Le suffixe distinct est **délibéré** —
il les tient hors du `include` de Vitest (`src/**/*.test.{ts,tsx}`), de sorte que `bun run test`
n'essaie jamais de démarrer un navigateur et une base de données. Ils restent couverts par
`bun run typecheck`, qui inclut `e2e/**/*.ts`.

---

## Front — `apps/admin`

| Élément | Convention | Exemple |
|---|---|---|
| Composant | PascalCase, **1 par fichier** | `DashboardPage` |
| Fichier de composant | kebab-case | `dashboard-page.tsx` |
| Props | `<Composant>Props` | `DashboardPageProps` |
| Hook | `use` + camelCase | `useContentTypes` |
| Fichier de hook | kebab-case | `use-content-types.ts` |
| Contexte | `<Nom>Context` | `AuthContext` |
| Page | suffixe `Page` | `EntriesPage` |
| Composant issu d'Empreint | `Empreint` + PascalCase | `<EmpreintSidebar>` |
| Public API d'une slice | `index.ts` à la racine de la slice | `pages/dashboard/index.ts` |

L'arborescence suit **Feature-Sliced Design v2.1** — voir le skill `feature-sliced-design`. Un
import ne traverse jamais une slice : il passe par sa public API.

---

## Back — `apps/api`

| Élément | Convention | Exemple |
|---|---|---|
| Fichier de routes | kebab-case, ressource au **pluriel** | `entries.routes.ts` |
| Handler | suffixe `*.handler.ts` | `publish-entry.handler.ts` |
| Service / logique métier | suffixe `*.service.ts` | `entry.service.ts` |
| Repository | suffixe `*.repository.ts` | `entry.repository.ts` |
| Middleware | suffixe `*.middleware.ts` | `error.middleware.ts` |
| Schéma zod interne | suffixe `*.schema.ts` | `entry-query.schema.ts` |
| Migration | `AAAA-MM-JJ-NNN-description.ts` | `2026-08-15-000-initial.ts` |
| Route HTTP | kebab-case, pluriel | `/content-types/:slug/entries` |

Les colonnes SQL sont en **snake_case** ; le `CamelCasePlugin` de Kysely les expose en camelCase
côté TypeScript. Les migrations écrivent donc du snake_case, le code applicatif du camelCase.

---

## Contrat partagé — `packages/contracts`

| Élément | Convention | Exemple |
|---|---|---|
| Schéma requête | `<action>RequestSchema` | `createEntryRequestSchema` |
| Schéma réponse | `<action>ResponseSchema` | `publishEntryResponseSchema` |
| Type inféré | `z.infer` exporté, PascalCase | `type CreateEntryRequest` |
| Fichier | `<ressource>.schema.ts` | `entry.schema.ts` |

Aucun schéma de requête ou de réponse ne vit dans `apps/` : le front et le back importent tous les
deux depuis `@mooncello/contracts`.
