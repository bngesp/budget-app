# Budget Tracker — Application Mobile

Application de suivi des dépenses avec base de données locale (expo-sqlite). Aucun backend, aucun compte requis.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | React Native + Expo SDK 52 |
| Navigation | Expo Router v4 (tabs) |
| Base de données | expo-sqlite (WAL mode) |
| Types | TypeScript strict |
| Icons | @expo/vector-icons (Ionicons) |
| Dates | date-fns |

## Structure du projet

```
budget-app/
├── app/
│   ├── _layout.tsx          # Root layout + navigation tabs
│   ├── index.tsx            # Tableau de bord
│   ├── transactions.tsx     # Liste + recherche + suppression
│   ├── add-transaction.tsx  # Formulaire ajout transaction
│   ├── budget.tsx           # Gestion budgets par catégorie
│   ├── forecast.tsx         # Prévisions fin de mois
│   └── settings.tsx         # Paramètres + export/import
├── context/
│   └── AppContext.tsx       # État global + refresh
├── lib/
│   ├── db.ts                # Toutes les opérations SQLite
│   └── utils.ts             # Helpers (format, calculs)
├── types/
│   └── index.ts             # Types TypeScript
├── app.config.ts
├── package.json
└── tsconfig.json
```

## Installation

```bash
# 1. Cloner et installer
cd budget-app
npm install

# 2. Lancer (scan le QR avec Expo Go sur iOS/Android)
npx expo start

# 3. Build Android APK (optionnel)
npx eas build --platform android --profile preview
```

## Base de données SQLite

Trois tables :

### `transactions`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
type TEXT          -- 'expense' | 'income'
amount REAL
description TEXT
category TEXT
date TEXT          -- 'YYYY-MM-DD'
createdAt TEXT
```

### `categories`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
name TEXT UNIQUE
budget REAL
color TEXT
icon TEXT
type TEXT          -- 'expense' | 'income' | 'both'
```

### `settings`
```sql
key TEXT PRIMARY KEY
value TEXT
```

## Fonctionnalités

- **Tableau de bord** — solde, métriques, top catégories, transactions récentes
- **Transactions** — ajout, liste filtrée, recherche, suppression
- **Budgets** — revenu mensuel, budget par catégorie, ajout/suppression catégories
- **Prévisions** — projection fin de mois, rythme quotidien, statut par catégorie
- **Paramètres** — export JSON (Share API), réinitialisation

## Extension possible

- Historique multi-mois (changer `currentMonth` dans le context)
- Graphiques (victory-native est dans les dépendances)
- Notifications (expo-notifications) pour alertes budget
- Import CSV
- Widget iOS/Android (expo-widgets)
