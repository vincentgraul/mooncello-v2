# Specs

Les specs fonctionnelles de Mooncello, versionnées avec le code.

## Structure

```
specs/
└── <feature>/
    ├── README.md        cadrage de la feature
    └── <story>.md       une story par fichier
```

## Cycle de vie

1. `/claude-workflow:spec` — entretien guidé qui produit ou met à jour un dossier `specs/<feature>/`
2. `/claude-workflow:orchestrator <slug>` — implémente une story via les agents front et back en
   parallèle, sur des worktrees isolés, autour d'un contrat gelé
3. `/claude-workflow:pr` — ouvre la pull request une fois la story terminée

Une story est implémentée **une par une**. Le contrat d'interface est figé avant de lancer les
lanes front et back, pour qu'elles codent contre la même source de vérité sans se marcher dessus.
