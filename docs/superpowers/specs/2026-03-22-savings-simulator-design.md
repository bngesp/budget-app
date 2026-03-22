# Design Spec — Épargne & Simulateur

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Budget Tracker (React Native + Expo, expo-sqlite, offline-only)

---

## Résumé

Ajout de deux nouveaux onglets à l'application existante :
1. **Épargne** — suivi mensuel de l'épargne (calculé auto + ajustement manuel), historique cumulatif, sources de revenus récurrentes.
2. **Simulateur** — deux modes : "Objectif" (montant cible + mensualité → durée) et "Projection" (mensualité → montant à 1/5/10 ans avec intérêts).

Aucun backend. Tout en local via expo-sqlite.

---

## 1. Modèle de données

### Nouvelles tables SQLite

Ces deux tables sont ajoutées à la fonction `initDb()` existante dans `lib/db.ts` avec `CREATE TABLE IF NOT EXISTS`. Comme `db` est une variable de module réinitialisée à `null` à chaque lancement, `initDb()` s'exécute à chaque démarrage de l'app — les tables seront donc créées pour les utilisateurs existants dès la prochaine ouverture.

**`income_sources`** — Sources de revenus récurrentes configurées par l'utilisateur.
```sql
id      INTEGER PRIMARY KEY AUTOINCREMENT
name    TEXT    NOT NULL            -- ex: 'Salaire', 'Loyer reçu'
amount  REAL    NOT NULL            -- montant mensuel attendu
icon    TEXT    NOT NULL DEFAULT '💼'
active  INTEGER NOT NULL DEFAULT 1  -- 1 = actif, 0 = suspendu
```

**`savings_entries`** — Une entrée par mois d'épargne.
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
month       TEXT    NOT NULL UNIQUE   -- 'YYYY-MM'
calculated  REAL    NOT NULL          -- revenus réels − dépenses (auto)
actual      REAL                      -- nullable : montant réellement mis de côté (saisi manuellement)
note        TEXT
```

### Logique revenus (clarification anti-double-comptage)

Le **revenu réel du mois** = somme des `income_sources` actives + transactions de type `income` du mois.

Règle claire sur l'usage :
- `income_sources` = revenus **récurrents fixes** (salaire, loyer perçu). L'utilisateur ne les saisit PAS en plus comme transactions income.
- Transactions `income` = revenus **variables ponctuels** (freelance, prime, remboursement). Seule façon d'ajouter ces revenus.

`Settings.monthlyIncome` **n'est pas modifié** — il reste utilisé par les écrans existants (`forecast.tsx`, `index.tsx`) qui ne font l'objet d'aucune modification dans ce spec. `income_sources` est un concept additionnel propre aux nouveaux écrans Épargne et Simulateur uniquement.

Une nouvelle fonction `computeRealIncome(month: string): Promise<number>` est ajoutée à `lib/db.ts` :
```ts
// Retourne sum(income_sources actives) + totalIncome des transactions du mois
async function computeRealIncome(month: string): Promise<number>
```
Cette fonction est utilisée par l'écran Épargne pour calculer le champ `calculated` d'une `SavingsEntry` :
```
calculated = await computeRealIncome(month) - monthSummary.totalExpenses
```

### Types TypeScript à ajouter (`types/index.ts`)

```ts
export interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  icon: string;
  active: number; // 1 | 0
}

export interface SavingsEntry {
  id: number;
  month: string;        // 'YYYY-MM'
  calculated: number;
  actual: number | null; // null = pas encore saisi, on affiche `calculated`
  note: string | null;
}
```

---

## 2. Écrans

### 2.1 Onglet "Épargne" (`app/savings.tsx`)

**Zone principale — Ce mois :**
- Grand chiffre centré : `actual ?? calculated` du mois courant
- Mention sous le chiffre : "calculé : X د.م · modifier" — tap ouvre une modale inline pour saisir le montant réel (appel `upsertSavingsEntry`)
- Section revenus du mois : liste `income_sources` actives + transactions `income` du mois, avec total
- Typographie seule, pas de graphiques

**Zone secondaire — Historique :**
- `savingsHistory` chargé **sans filtre de mois** (tous les mois, tri DESC)
- Ligne par mois : label mois (`currentMonthLabel`) + montant (`actual ?? calculated`)
- Ligne finale "Total cumulé" = somme de tous les `actual ?? calculated`, couleur `#185FA5`
- Fond `#f9f9f9`

**Style UI :** fond `#ffffff`, accents `#185FA5` / `#1D9E75`, labels `#bbb`, bordures `#f0f0f0`.

---

### 2.2 Onglet "Simulateur" (`app/simulator.tsx`)

Sous-onglets en haut : `Objectif` | `Projection` (switcher, border-bottom actif `#185FA5`).

---

#### Mode Objectif

**Inputs utilisateur :**
| Champ | Type | Remarque |
|---|---|---|
| Montant cible | Nombre | ex: 600 000 |
| Déjà épargné | Nombre | Pré-rempli = total cumulé depuis `savingsHistory` |
| Épargne mensuelle | Nombre | Montant que l'utilisateur prévoit de verser chaque mois |
| Taux annuel % | Nombre | Optionnel, défaut 0 |

**Outputs calculés :**
- Durée estimée (mois → affichée en "X ans Y mois")
- Date d'atteinte estimée
- 3 scénarios comparatifs (chips)

**Algorithme de calcul :**

```
r_mensuel = taux_annuel / 100 / 12
solde = déjà_épargné

Si r_mensuel === 0 :
  mois_nécessaires = ceil((cible − déjà_épargné) / épargne_mensuelle)

Sinon :
  // Simulation mois par mois (max 600 mois = 50 ans)
  mois_nécessaires = 0
  solde = déjà_épargné
  tant que solde < cible ET mois_nécessaires < 600 :
    solde = solde * (1 + r_mensuel) + épargne_mensuelle
    mois_nécessaires++
  Si mois_nécessaires === 600 : afficher "Objectif non atteignable en 50 ans"
```

**3 scénarios comparatifs :**
Générés à 60 %, 100 % et 150 % de `épargne_mensuelle` (arrondis à la centaine la plus proche). Chaque chip affiche le montant mensuel → durée calculée avec le même algorithme. Le chip à 100 % est mis en surbrillance (bleu).

---

#### Mode Projection

**Inputs utilisateur :**
| Champ | Type | Remarque |
|---|---|---|
| Épargne mensuelle | Nombre | |
| Capital initial | Nombre | Pré-rempli = total cumulé |
| Taux annuel % | Nombre | Optionnel, défaut 0 |

**Outputs :** 3 cartes côte à côte pour 1 an, 5 ans, 10 ans.

**Formule FV :**
```
n = horizon en mois (12, 60, 120)
r = taux_annuel / 100 / 12

Si r === 0 :
  FV = capital_initial + épargne_mensuelle * n

Sinon :
  FV = épargne_mensuelle * ((1+r)^n − 1) / r  +  capital_initial * (1+r)^n
```

Chaque carte affiche :
- Montant total (`fmtAmount`)
- Dont intérêts = FV − capital_initial − (épargne_mensuelle * n), si taux > 0

---

## 3. Modifications de fichiers existants

| Fichier | Modification |
|---|---|
| `types/index.ts` | Ajouter `IncomeSource`, `SavingsEntry`. **Ne pas modifier** `Settings` ni `MonthSummary`. |
| `lib/db.ts` | Ajouter les 2 tables dans `initDb()` ; CRUD pour `income_sources` et `savings_entries` ; ajouter `computeRealIncome(month)` ; mettre à jour `exportAllData()` et `importAllData()` pour inclure les nouvelles tables. Dans `importAllData()`, les champs nullable (`actual`, `note`) se sérialisent en JSON `null` et se réinsèrent avec `null` (pas de valeur omise). |
| `context/AppContext.tsx` | Ajouter `incomeSources: IncomeSource[]`, `savingsHistory: SavingsEntry[]`, `currentSavings: SavingsEntry \| null`. `savingsHistory` : chargé **sans filtre de mois** (tous les mois, tri DESC), rechargé à chaque `refresh()`. `currentSavings` : toujours calé sur `format(new Date(), 'yyyy-MM')` (le mois calendaire réel), **pas** sur `currentMonth` — l'écran Épargne montre toujours le mois courant réel indépendamment du mois sélectionné ailleurs. |
| `app/_layout.tsx` | Ajouter 2 onglets : "Épargne" (save-outline, label "Épargne") et "Simul." (calculator-outline, label "Simul.") entre Prévisions et Réglages. |
| `app/settings.tsx` | Nouvelle section "Revenus récurrents" : liste `income_sources` + ajout/suppression/activation. Le champ "Revenu mensuel" existant **est conservé** (utilisé par les écrans existants). |
| `app/index.tsx` | Ajouter métrique "Épargne cumulée" (somme `actual ?? calculated` de tous les mois) sur le dashboard |

---

## 4. Navigation

Barre d'onglets — 7 onglets, labels courts pour tenir sur petits écrans :

| # | Screen | Icône | Label |
|---|---|---|---|
| 1 | index | home-outline | Accueil |
| 2 | transactions | list-outline | Dépenses |
| 3 | budget | wallet-outline | Budgets |
| 4 | forecast | trending-up-outline | Prévisions |
| 5 | savings | save-outline | Épargne |
| 6 | simulator | calculator-outline | Simul. |
| 7 | settings | settings-outline | Réglages |

---

## 5. Ce qui ne change pas

- `transactions.tsx`, `add-transaction.tsx`, `budget.tsx`, `forecast.tsx` — aucune modification.
- La logique SQLite existante — inchangée, seulement des ajouts.

---

## 6. Style UI

Direction validée : **Option A — Blanc & bleu** (cohérent avec l'app existante)
- Fond : `#ffffff` / sections secondaires `#f9f9f9`
- Accents primaires : `#185FA5` (bleu) et `#1D9E75` (vert)
- Texte principal : `#1a1a1a`, secondaire : `#888`, labels : `#bbb`
- Bordures : `#f0f0f0`
- Typographie : grand chiffre centré pour la métrique principale, hiérarchie claire
- Pas de graphiques, information minimale par écran
