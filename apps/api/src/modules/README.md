# Modules

L'API suit un **monolithe modulaire** découpé en **vertical slices**.

## Règle de découpage

Un **module** est un bounded context (`auth`, `content`, `media`, `delivery`). Il expose une API
publique via son `index.ts` ; aucun module n'importe un fichier interne d'un autre module.

Une **slice** est une feature à l'intérieur d'un module. Elle contient tout ce dont elle a besoin —
route, logique, accès données — plutôt que d'être éclatée par couche technique.

```
modules/
├── auth/
│   ├── auth.ts                  configuration Better Auth
│   ├── roles/                   slice : rôles et permissions dynamiques
│   └── index.ts
├── content/
│   ├── content-types/           slice : CRUD des définitions de types
│   ├── entries/                 slice : CRUD des entrées
│   ├── publishing/              slice : brouillon → publié
│   └── index.ts
├── media/
│   ├── upload/                  slice : upload et stockage
│   ├── storage/                 adaptateur de driver (local, S3)
│   └── index.ts
└── delivery/
    ├── entries/                 slice : lecture publique du contenu publié
    └── index.ts
```

## Nommage dans une slice

Voir `docs/naming-conventions.md`. En résumé : `*.handler.ts`, `*.service.ts`, `*.repository.ts`,
`*.schema.ts`, `*.middleware.ts`, tests colocalisés en `*.test.ts`.

## Contrat partagé

Les schémas de requête et de réponse ne vivent pas ici : ils sont dans `@mooncello/contracts`, pour
que le front et le back codent contre la même source de vérité.
