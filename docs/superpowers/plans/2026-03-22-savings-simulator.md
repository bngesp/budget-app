# Épargne & Simulateur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a savings tracking screen and a financial simulator screen to the existing offline Budget Tracker app.

**Architecture:** Extend the existing layered pattern — new DB functions in `lib/db.ts`, new types in `types/index.ts`, new state in `AppContext.tsx`, two new Expo Router tab screens. A separate `lib/savings.ts` holds pure calculator functions with no side effects.

**Tech Stack:** React Native + Expo SDK 52, expo-router v4, expo-sqlite (WAL), TypeScript strict, date-fns (fr locale), Ionicons.

**Note on testing:** No test runner is configured in this project. Verification is done by running `npx expo start` and checking behavior manually in Expo Go. Each task ends with a commit.

**Spec:** `docs/superpowers/specs/2026-03-22-savings-simulator-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `types/index.ts` | Add `IncomeSource`, `SavingsEntry` interfaces |
| Modify | `lib/db.ts` | New tables, CRUD for income_sources + savings_entries, computeRealIncome, export/import |
| Create | `lib/savings.ts` | Pure calculator functions (Objectif + Projection formulas) |
| Modify | `context/AppContext.tsx` | Add incomeSources, savingsHistory, currentSavings to global state |
| Modify | `app/_layout.tsx` | Add 2 new tabs (Épargne + Simul.) |
| Modify | `app/settings.tsx` | Add "Revenus récurrents" section |
| Modify | `app/index.tsx` | Add "Épargne cumulée" metric on dashboard |
| Create | `app/savings.tsx` | Savings screen — current month + history |
| Create | `app/simulator.tsx` | Simulator screen — Objectif + Projection tabs |

---

## Task 1: Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add `IncomeSource` and `SavingsEntry` to `types/index.ts`**

Append at the end of the file:

```ts
export interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  icon: string;
  active: number; // 1 = active, 0 = suspended
}

export interface SavingsEntry {
  id: number;
  month: string;        // 'YYYY-MM'
  calculated: number;
  actual: number | null; // null means not yet entered, display `calculated`
  note: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add IncomeSource and SavingsEntry types"
```

---

## Task 2: Database — New tables + income_sources CRUD

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Add new tables to `initDb()` in `lib/db.ts`**

In the `execAsync` SQL block inside `initDb()`, append after the existing `CREATE INDEX` statements:

```sql
CREATE TABLE IF NOT EXISTS income_sources (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT    NOT NULL,
  amount REAL    NOT NULL,
  icon   TEXT    NOT NULL DEFAULT '💼',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS savings_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  month       TEXT    NOT NULL UNIQUE,
  calculated  REAL    NOT NULL,
  actual      REAL,
  note        TEXT
);
```

- [ ] **Step 2: Add income_sources CRUD after the `// ─── SETTINGS` section**

```ts
// ─── INCOME SOURCES ──────────────────────────────────────────────────────────

export async function getIncomeSources(): Promise<IncomeSource[]> {
  const db = await getDb();
  return await db.getAllAsync<IncomeSource>(
    'SELECT * FROM income_sources ORDER BY name'
  );
}

export async function addIncomeSource(s: Omit<IncomeSource, 'id'>): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO income_sources (name, amount, icon, active) VALUES (?, ?, ?, ?)',
    [s.name, s.amount, s.icon, s.active]
  );
  return result.lastInsertRowId;
}

export async function updateIncomeSource(id: number, s: Partial<Omit<IncomeSource, 'id'>>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(s).map(k => `${k}=?`).join(', ');
  await db.runAsync(
    `UPDATE income_sources SET ${fields} WHERE id=?`,
    [...Object.values(s), id]
  );
}

export async function deleteIncomeSource(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM income_sources WHERE id=?', [id]);
}
```

- [ ] **Step 3: Add `computeRealIncome()` after the income_sources CRUD**

```ts
export async function computeRealIncome(month: string): Promise<number> {
  const db = await getDb();

  // Sum of active income_sources (recurring)
  const sourceRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM income_sources WHERE active = 1'
  );
  const sourcesTotal = sourceRow?.total ?? 0;

  // Sum of income transactions for the month
  const txnRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date LIKE ?`,
    [`${month}%`]
  );
  const txnTotal = txnRow?.total ?? 0;

  return sourcesTotal + txnTotal;
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add income_sources table, CRUD, and computeRealIncome"
```

---

## Task 3: Database — savings_entries CRUD

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Add savings_entries CRUD after `computeRealIncome()`**

```ts
// ─── SAVINGS ENTRIES ─────────────────────────────────────────────────────────

export async function getSavingsEntries(): Promise<SavingsEntry[]> {
  const db = await getDb();
  return await db.getAllAsync<SavingsEntry>(
    'SELECT * FROM savings_entries ORDER BY month DESC'
  );
}

export async function getSavingsEntry(month: string): Promise<SavingsEntry | null> {
  const db = await getDb();
  return await db.getFirstAsync<SavingsEntry>(
    'SELECT * FROM savings_entries WHERE month = ?',
    [month]
  ) ?? null;
}

export async function upsertSavingsEntry(entry: Omit<SavingsEntry, 'id'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO savings_entries (month, calculated, actual, note)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET
       calculated = excluded.calculated,
       actual     = excluded.actual,
       note       = excluded.note`,
    [entry.month, entry.calculated, entry.actual ?? null, entry.note ?? null]
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add savings_entries CRUD with upsert"
```

---

## Task 4: Database — update export/import

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Update `exportAllData()` to include new tables**

Replace the existing `exportAllData` function body:

```ts
export async function exportAllData(): Promise<string> {
  const db = await getDb();
  const transactions = await db.getAllAsync('SELECT * FROM transactions');
  const categories = await db.getAllAsync('SELECT * FROM categories');
  const settings = await db.getAllAsync('SELECT * FROM settings');
  const incomeSources = await db.getAllAsync('SELECT * FROM income_sources');
  const savingsEntries = await db.getAllAsync('SELECT * FROM savings_entries');
  return JSON.stringify(
    { transactions, categories, settings, incomeSources, savingsEntries, exportedAt: new Date().toISOString() },
    null,
    2
  );
}
```

- [ ] **Step 2: Update `importAllData()` to restore new tables**

In the existing `importAllData()` function:

1. Add the two new table deletes to the `execAsync` call:
```ts
await db.execAsync(
  'DELETE FROM transactions; DELETE FROM categories; DELETE FROM settings; DELETE FROM income_sources; DELETE FROM savings_entries;'
);
```

2. Add import loops after the existing `settings` loop:
```ts
for (const s of data.incomeSources || []) {
  await db.runAsync(
    'INSERT INTO income_sources (id, name, amount, icon, active) VALUES (?,?,?,?,?)',
    [s.id, s.name, s.amount, s.icon, s.active]
  );
}
for (const e of data.savingsEntries || []) {
  await db.runAsync(
    'INSERT INTO savings_entries (id, month, calculated, actual, note) VALUES (?,?,?,?,?)',
    [e.id, e.month, e.calculated, e.actual ?? null, e.note ?? null]
  );
}
```

Note: `actual` and `note` are nullable — always pass `?? null` to ensure SQL NULL (not undefined) is inserted.

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat: include income_sources and savings_entries in export/import"
```

---

## Task 5: Pure calculator functions

**Files:**
- Create: `lib/savings.ts`

- [ ] **Step 1: Create `lib/savings.ts` with all simulator math**

```ts
/**
 * Calculate months needed to reach a savings goal.
 * Returns Infinity if the goal cannot be reached within 600 months (50 years).
 */
export function calcMonthsToGoal(
  target: number,
  alreadySaved: number,
  monthlyAmount: number,
  annualRate: number
): number {
  if (monthlyAmount <= 0) return Infinity;
  const remaining = target - alreadySaved;
  if (remaining <= 0) return 0;

  const r = annualRate / 100 / 12;

  if (r === 0) {
    return Math.ceil(remaining / monthlyAmount);
  }

  let balance = alreadySaved;
  let months = 0;
  while (balance < target && months < 600) {
    balance = balance * (1 + r) + monthlyAmount;
    months++;
  }
  return months >= 600 ? Infinity : months;
}

/**
 * Format months as "X ans Y mois" (French).
 */
export function formatDuration(months: number): string {
  if (!isFinite(months)) return 'Objectif non atteignable en 50 ans';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mois`;
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} ${rem} mois`;
}

/**
 * Estimate the target date from today + N months.
 */
export function targetDate(months: number): string | null {
  if (!isFinite(months)) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' });
}

/**
 * Round a number to the nearest hundred.
 */
export function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

/**
 * Calculate future value of regular savings over N months.
 * Handles r === 0 safely (no division by zero).
 */
export function calcFutureValue(
  monthlyAmount: number,
  initialCapital: number,
  months: number,
  annualRate: number
): number {
  const r = annualRate / 100 / 12;
  if (r === 0) {
    return initialCapital + monthlyAmount * months;
  }
  return (
    monthlyAmount * ((Math.pow(1 + r, months) - 1) / r) +
    initialCapital * Math.pow(1 + r, months)
  );
}

/**
 * Calculate interest earned (FV minus pure contributions).
 */
export function calcInterestEarned(
  fv: number,
  monthlyAmount: number,
  initialCapital: number,
  months: number
): number {
  return fv - initialCapital - monthlyAmount * months;
}
```

- [ ] **Step 2: Verify file compiles (no TypeScript errors)**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/savings.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/savings.ts
git commit -m "feat: add pure savings calculator functions"
```

---

## Task 6: AppContext — extend global state

**Files:**
- Modify: `context/AppContext.tsx`

- [ ] **Step 1: Add new imports at the top of `AppContext.tsx`**

Add to the existing imports from `../lib/db`:
```ts
import {
  getTransactions, getCategories, getSettings, getMonthSummary,
  getIncomeSources, getSavingsEntries, getSavingsEntry,
} from '../lib/db';
```

Add to the existing imports from `../types`:
```ts
import { Transaction, Category, Settings, MonthSummary, IncomeSource, SavingsEntry } from '../types';
```

- [ ] **Step 2: Update `AppContextType` interface**

Add three fields to the existing interface:
```ts
interface AppContextType {
  // ...existing fields...
  incomeSources: IncomeSource[];
  savingsHistory: SavingsEntry[];
  currentSavings: SavingsEntry | null;
}
```

- [ ] **Step 3: Add state variables inside `AppProvider`**

After the existing `useState` declarations, add:
```ts
const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
const [savingsHistory, setSavingsHistory] = useState<SavingsEntry[]>([]);
const [currentSavings, setCurrentSavings] = useState<SavingsEntry | null>(null);
```

- [ ] **Step 4: Update `refresh()` to load new data**

Confirm `format` is already imported from `date-fns` at the top of the file (it is used by the existing `useState` for `currentMonth`). If not, add it: `import { format } from 'date-fns';`

Inside the existing `Promise.all` in `refresh()`, add the two new fetches:
```ts
const [txns, cats, stgs, sum, sources, history, curSav] = await Promise.all([
  getTransactions(currentMonth),
  getCategories(),
  getSettings(),
  getMonthSummary(currentMonth),
  getIncomeSources(),
  getSavingsEntries(),                                    // all months, no filter
  getSavingsEntry(format(new Date(), 'yyyy-MM')),         // today's real month only
]);
setTransactions(txns);
setCategories(cats);
setSettings(stgs);
setSummary(sum);
setIncomeSources(sources);
setSavingsHistory(history);
setCurrentSavings(curSav);
```

- [ ] **Step 5: Expose the three new fields in `AppContext.Provider`**

```tsx
<AppContext.Provider value={{
  transactions, categories, settings, summary,
  currentMonth, setCurrentMonth, refresh, loading,
  incomeSources, savingsHistory, currentSavings,
}}>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add context/AppContext.tsx
git commit -m "feat: add incomeSources, savingsHistory, currentSavings to AppContext"
```

---

## Task 7: Navigation — add 2 tabs

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Read `app/_layout.tsx`** to confirm the current tab order before inserting.

- [ ] **Step 2: Add two `Tabs.Screen` entries in `app/_layout.tsx`**

Insert before the existing `<Tabs.Screen name="settings" ...>` (which must be the last tab):

```tsx
<Tabs.Screen
  name="savings"
  options={{
    title: 'Épargne',
    tabBarIcon: ({ color, size }) => <Ionicons name="save-outline" size={size} color={color} />,
    tabBarLabel: 'Épargne',
  }}
/>
<Tabs.Screen
  name="simulator"
  options={{
    title: 'Simulateur',
    tabBarIcon: ({ color, size }) => <Ionicons name="calculator-outline" size={size} color={color} />,
    tabBarLabel: 'Simul.',
  }}
/>
```

- [ ] **Step 3: Create placeholder files so the router doesn't crash**

Create `app/savings.tsx`:
```tsx
import { View, Text } from 'react-native';
export default function SavingsScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Épargne</Text></View>;
}
```

Create `app/simulator.tsx`:
```tsx
import { View, Text } from 'react-native';
export default function SimulatorScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Simulateur</Text></View>;
}
```

- [ ] **Step 4: Run the app and verify 7 tabs appear without crash**

Run: `npx expo start`
Open in Expo Go. Verify: 7 tabs visible, tapping "Épargne" and "Simul." shows placeholder text.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/savings.tsx app/simulator.tsx
git commit -m "feat: add Épargne and Simulateur tabs to navigation"
```

---

## Task 8: Settings screen — income sources section

**Files:**
- Modify: `app/settings.tsx`

- [ ] **Step 1: Read the current `app/settings.tsx`** to understand its structure before modifying it.

- [ ] **Step 2: Add income sources state and handlers**

Import new DB functions at the top:
```ts
import { getIncomeSources, addIncomeSource, updateIncomeSource, deleteIncomeSource } from '../lib/db';
```

Also import `useApp` if not already, and add to destructuring:
```ts
const { incomeSources, refresh } = useApp();
```

Add local state for the "add" form:
```ts
const [newSourceName, setNewSourceName] = useState('');
const [newSourceAmount, setNewSourceAmount] = useState('');
const [newSourceIcon, setNewSourceIcon] = useState('💼');
```

- [ ] **Step 3: Add the "Revenus récurrents" section to the JSX**

Add a new section before the existing "Données" section. The section contains:
1. A header "Revenus récurrents"
2. A FlatList (or map) of existing `incomeSources` — each row shows `icon name` + `amount د.م` + a toggle active/inactive button + a delete button
3. An "Ajouter" mini-form: icon picker (reuse the existing one if available), text input for name, numeric input for amount, confirm button

Handler for adding:
```ts
const handleAddSource = async () => {
  if (!newSourceName.trim() || !newSourceAmount) return;
  await addIncomeSource({
    name: newSourceName.trim(),
    amount: parseFloat(newSourceAmount),
    icon: newSourceIcon,
    active: 1,
  });
  setNewSourceName('');
  setNewSourceAmount('');
  await refresh();
};
```

Handler for toggling active:
```ts
const handleToggleSource = async (s: IncomeSource) => {
  await updateIncomeSource(s.id, { active: s.active === 1 ? 0 : 1 });
  await refresh();
};
```

Handler for delete:
```ts
const handleDeleteSource = async (id: number) => {
  await deleteIncomeSource(id);
  await refresh();
};
```

- [ ] **Step 4: Run the app and verify the section appears and functions**

Open Réglages tab. Verify: "Revenus récurrents" section visible, can add a source (e.g., "Salaire" 8000 💼), source appears in list, toggle and delete work.

- [ ] **Step 5: Commit**

```bash
git add app/settings.tsx
git commit -m "feat: add income sources management in settings"
```

---

## Task 9: Dashboard — cumulative savings metric

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Read `app/index.tsx`** to understand the current metric layout.

- [ ] **Step 2: Add cumulative savings metric**

Add to the `useApp()` destructuring:
```ts
const { ..., savingsHistory } = useApp();
```

Compute the total:
```ts
const totalSaved = savingsHistory.reduce(
  (sum, e) => sum + (e.actual ?? e.calculated),
  0
);
```

Add a metric card (following the existing card style) showing:
- Label: "Épargne cumulée"
- Value: `fmtAmount(totalSaved, settings.currencySymbol)`

- [ ] **Step 3: Run the app and verify metric shows 0 (no entries yet)**

Open Accueil tab. Verify the new metric appears alongside existing metrics.

- [ ] **Step 4: Commit**

```bash
git add app/index.tsx
git commit -m "feat: add cumulative savings metric on dashboard"
```

---

## Task 10: Savings screen — full implementation

**Files:**
- Modify: `app/savings.tsx` (replace placeholder)

- [ ] **Step 1: Implement the full savings screen**

Replace `app/savings.tsx` with:

```tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { upsertSavingsEntry, computeRealIncome } from '../lib/db';
import { fmtAmount, currentMonthLabel } from '../lib/utils';
import type { SavingsEntry } from '../types';

export default function SavingsScreen() {
  const { settings, summary, incomeSources, savingsHistory, currentSavings, refresh } = useApp();
  const sym = settings.currencySymbol;
  const todayMonth = format(new Date(), 'yyyy-MM');

  // Displayed savings for current month
  const displayedSavings = currentSavings
    ? (currentSavings.actual ?? currentSavings.calculated)
    : Math.max(0, summary.totalIncome - summary.totalExpenses);

  // Total cumulated across all months
  const totalCumulated = savingsHistory.reduce(
    (sum, e) => sum + (e.actual ?? e.calculated),
    0
  );

  // Modal state for manual entry
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleOpenModal = () => {
    setInputValue(String(displayedSavings));
    setModalVisible(true);
  };

  const handleSaveActual = async () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Valeur invalide', 'Entrez un montant positif.');
      return;
    }
    try {
      const calculated = await computeRealIncome(todayMonth) - summary.totalExpenses;
      await upsertSavingsEntry({
        month: todayMonth,
        calculated: Math.max(0, calculated),
        actual: parsed,
        note: null,
      });
      await refresh();
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Ce mois ── */}
        <View style={s.heroSection}>
          <Text style={s.monthLabel}>{currentMonthLabel(todayMonth)}</Text>
          <Text style={s.heroAmount}>{fmtAmount(displayedSavings, sym)}</Text>
          <Text style={s.heroSub}>mis de côté ce mois</Text>

          <TouchableOpacity style={s.editPill} onPress={handleOpenModal}>
            <Text style={s.editPillText}>
              calculé : {fmtAmount(currentSavings?.calculated ?? Math.max(0, summary.totalIncome - summary.totalExpenses), sym)}
              {'  ·  '}
              <Text style={s.editLink}>modifier</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Revenus du mois ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Revenus du mois</Text>
          {incomeSources.filter(src => src.active === 1).map(src => (
            <View key={src.id} style={s.row}>
              <Text style={s.rowLeft}>{src.icon}  {src.name} <Text style={s.tag}>(récurrent)</Text></Text>
              <Text style={s.rowRight}>{fmtAmount(src.amount, sym)}</Text>
            </View>
          ))}
          {summary.totalIncome > 0 && (
            <View style={s.row}>
              <Text style={s.rowLeft}>💸  Transactions income <Text style={s.tagBlue}>(variable)</Text></Text>
              <Text style={s.rowRight}>{fmtAmount(summary.totalIncome, sym)}</Text>
            </View>
          )}
          <View style={[s.row, s.rowTotal]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={[s.rowRight, s.totalValue]}>
              {fmtAmount(
                incomeSources.filter(src => src.active === 1).reduce((sum, src) => sum + src.amount, 0) + summary.totalIncome,
                sym
              )}
            </Text>
          </View>
        </View>

        {/* ── Historique ── */}
        <View style={s.historySection}>
          <Text style={s.sectionLabel}>Historique</Text>
          {savingsHistory.length === 0 && (
            <Text style={s.empty}>Aucune entrée pour l'instant.</Text>
          )}
          {savingsHistory.map(entry => (
            <View key={entry.month} style={s.historyRow}>
              <Text style={s.historyMonth}>
                {currentMonthLabel(entry.month)}
              </Text>
              <Text style={s.historyAmount}>
                {fmtAmount(entry.actual ?? entry.calculated, sym)}
              </Text>
            </View>
          ))}
          {savingsHistory.length > 0 && (
            <View style={[s.historyRow, s.cumulRow]}>
              <Text style={s.cumulLabel}>Total cumulé</Text>
              <Text style={s.cumulAmount}>{fmtAmount(totalCumulated, sym)}</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Modal saisie montant réel ── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Épargne réelle — {currentMonthLabel(todayMonth)}</Text>
            <Text style={s.modalSub}>Combien as-tu réellement mis de côté ?</Text>
            <TextInput
              style={s.modalInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="0"
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={s.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSaveActual}>
                <Text style={s.btnSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heroSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  monthLabel: { fontSize: 12, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  heroAmount: { fontSize: 40, fontWeight: '700', color: '#1a1a1a', letterSpacing: -1 },
  heroSub: { fontSize: 12, color: '#aaa', marginTop: 4 },
  editPill: { marginTop: 14, backgroundColor: '#f5f9ff', borderWidth: 1, borderColor: '#d0e4f8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editPillText: { fontSize: 12, color: '#185FA5' },
  editLink: { textDecorationLine: 'underline' },
  section: { padding: 20 },
  historySection: { backgroundColor: '#f9f9f9', padding: 20 },
  sectionLabel: { fontSize: 11, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowLeft: { color: '#555', flex: 1 },
  rowRight: { fontWeight: '600', color: '#1a1a1a' },
  rowTotal: { borderBottomWidth: 0, marginTop: 4 },
  totalLabel: { color: '#1a1a1a', fontWeight: '700' },
  totalValue: { color: '#1D9E75', fontWeight: '700' },
  tag: { fontSize: 10, color: '#aaa' },
  tagBlue: { fontSize: 10, color: '#185FA5' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  historyMonth: { color: '#888' },
  historyAmount: { fontWeight: '600', color: '#1D9E75' },
  cumulRow: { borderBottomWidth: 0, marginTop: 4 },
  cumulLabel: { fontWeight: '700', color: '#1a1a1a' },
  cumulAmount: { fontWeight: '700', color: '#185FA5' },
  empty: { color: '#bbb', fontSize: 13, textAlign: 'center', marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnCancelText: { color: '#888', fontWeight: '600' },
  btnSave: { flex: 1, backgroundColor: '#185FA5', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontWeight: '700' },
});
```

- [ ] **Step 2: Run the app and verify the savings screen**

Open Épargne tab. Verify:
- Hero section shows 0 (no income sources or transactions yet)
- Tapping the "modifier" pill opens a modal with a numeric input
- Entering a value, saving, closes the modal and updates the displayed amount
- History section shows the new entry

- [ ] **Step 3: Commit**

```bash
git add app/savings.tsx
git commit -m "feat: implement savings screen with current month and history"
```

---

## Task 11: Simulator screen — full implementation

**Files:**
- Modify: `app/simulator.tsx` (replace placeholder)

- [ ] **Step 1: Implement the full simulator screen**

Replace `app/simulator.tsx` with:

```tsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  calcMonthsToGoal, formatDuration, targetDate,
  roundToHundred, calcFutureValue, calcInterestEarned,
} from '../lib/savings';
import { fmtAmount } from '../lib/utils';

type Tab = 'objectif' | 'projection';

export default function SimulatorScreen() {
  const { settings, savingsHistory } = useApp();
  const sym = settings.currencySymbol;
  const [activeTab, setActiveTab] = useState<Tab>('objectif');

  // Total cumulated savings (pre-fill "Déjà épargné")
  const totalSaved = savingsHistory.reduce(
    (sum, e) => sum + (e.actual ?? e.calculated),
    0
  );

  // ── Objectif state ──
  const [target, setTarget] = useState('');
  const [alreadySaved, setAlreadySaved] = useState(String(Math.round(totalSaved)));
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');

  // ── Projection state ──
  const [projMonthly, setProjMonthly] = useState('');
  const [projCapital, setProjCapital] = useState(String(Math.round(totalSaved)));
  const [projRate, setProjRate] = useState('');

  // ── Objectif results ──
  const objectifResult = useMemo(() => {
    const t = parseFloat(target);
    const a = parseFloat(alreadySaved) || 0;
    const m = parseFloat(monthly);
    const r = parseFloat(rate) || 0;
    if (!t || !m || t <= 0 || m <= 0) return null;
    const months = calcMonthsToGoal(t, a, m, r);
    return {
      months,
      duration: formatDuration(months),
      date: targetDate(months),
      scenarios: [
        { pct: 0.6, amount: roundToHundred(m * 0.6) },
        { pct: 1.0, amount: m },
        { pct: 1.5, amount: roundToHundred(m * 1.5) },
      ].map(sc => ({
        ...sc,
        months: calcMonthsToGoal(t, a, sc.amount, r),
        duration: formatDuration(calcMonthsToGoal(t, a, sc.amount, r)),
      })),
    };
  }, [target, alreadySaved, monthly, rate]);

  // ── Projection results ──
  const projectionResult = useMemo(() => {
    const m = parseFloat(projMonthly);
    const c = parseFloat(projCapital) || 0;
    const r = parseFloat(projRate) || 0;
    if (!m || m <= 0) return null;
    const horizons = [12, 60, 120];
    return horizons.map(n => {
      const fv = calcFutureValue(m, c, n, r);
      const interest = r > 0 ? calcInterestEarned(fv, m, c, n) : 0;
      return { n, label: n === 12 ? '1 an' : n === 60 ? '5 ans' : '10 ans', fv, interest };
    });
  }, [projMonthly, projCapital, projRate]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* ── Tab switcher ── */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tab, activeTab === 'objectif' && s.tabActive]} onPress={() => setActiveTab('objectif')}>
          <Text style={[s.tabText, activeTab === 'objectif' && s.tabTextActive]}>🎯  Objectif</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'projection' && s.tabActive]} onPress={() => setActiveTab('projection')}>
          <Text style={[s.tabText, activeTab === 'projection' && s.tabTextActive]}>📈  Projection</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {activeTab === 'objectif' && (
          <>
            <Text style={s.hint}>Combien dois-je épargner chaque mois pour atteindre mon objectif ?</Text>
            <Field label="Montant cible" value={target} onChange={setTarget} placeholder="600 000" />
            <Field label="Déjà épargné" value={alreadySaved} onChange={setAlreadySaved} placeholder="0" />
            <Field label="Épargne mensuelle" value={monthly} onChange={setMonthly} placeholder="3 000" />
            <Field label="Taux annuel %" value={rate} onChange={setRate} placeholder="0" />

            {objectifResult && (
              <>
                <View style={s.resultCard}>
                  <Text style={s.resultCardLabel}>Résultat</Text>
                  <Row label="Durée estimée" value={objectifResult.duration} big />
                  {objectifResult.date && (
                    <Row label="Date d'atteinte" value={objectifResult.date} />
                  )}
                </View>
                <View style={s.scenarios}>
                  {objectifResult.scenarios.map((sc, i) => (
                    <View key={i} style={[s.chip, i === 1 && s.chipActive]}>
                      <Text style={[s.chipAmount, i === 1 && s.chipAmountActive]}>
                        {fmtAmount(sc.amount, sym)}/m
                      </Text>
                      <Text style={[s.chipDuration, i === 1 && s.chipDurationActive]}>
                        {sc.duration}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {activeTab === 'projection' && (
          <>
            <Text style={s.hint}>Combien aurai-je si j'épargne régulièrement ?</Text>
            <Field label="Épargne mensuelle" value={projMonthly} onChange={setProjMonthly} placeholder="2 000" />
            <Field label="Capital initial" value={projCapital} onChange={setProjCapital} placeholder="0" />
            <Field label="Taux annuel %" value={projRate} onChange={setProjRate} placeholder="0" />

            {projectionResult && (
              <View style={s.projCards}>
                {projectionResult.map(({ n, label, fv, interest }) => (
                  <View key={n} style={s.projCard}>
                    <Text style={s.projCardLabel}>{label}</Text>
                    <Text style={s.projCardAmount}>{fmtAmount(fv, sym)}</Text>
                    {interest > 0 && (
                      <Text style={s.projCardInterest}>dont {fmtAmount(interest, sym)} d'intérêts</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor="#ccc"
      />
    </View>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={s.resultRow}>
      <Text style={s.resultRowLabel}>{label}</Text>
      <Text style={[s.resultRowValue, big && s.resultRowValueBig]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#185FA5' },
  tabText: { fontSize: 14, color: '#bbb', fontWeight: '500' },
  tabTextActive: { color: '#185FA5', fontWeight: '700' },
  scroll: { padding: 20, gap: 4 },
  hint: { fontSize: 12, color: '#aaa', marginBottom: 16, lineHeight: 18 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  fieldInput: { backgroundColor: '#f7f7f7', borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  resultCard: { backgroundColor: '#185FA5', borderRadius: 14, padding: 18, marginTop: 20, marginBottom: 12 },
  resultCardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultRowLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  resultRowValue: { color: '#fff', fontWeight: '600', fontSize: 14 },
  resultRowValueBig: { fontSize: 20, fontWeight: '700' },
  scenarios: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, backgroundColor: '#f7f7f7', borderRadius: 10, padding: 12, alignItems: 'center' },
  chipActive: { backgroundColor: '#f0f7ff', borderWidth: 1.5, borderColor: '#185FA5' },
  chipAmount: { fontSize: 11, color: '#888', marginBottom: 4 },
  chipAmountActive: { color: '#185FA5' },
  chipDuration: { fontWeight: '700', fontSize: 13, color: '#555' },
  chipDurationActive: { color: '#185FA5' },
  projCards: { flexDirection: 'row', gap: 8, marginTop: 20 },
  projCard: { flex: 1, backgroundColor: '#f7f7f7', borderRadius: 12, padding: 14, alignItems: 'center' },
  projCardLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  projCardAmount: { fontSize: 15, fontWeight: '700', color: '#185FA5', textAlign: 'center' },
  projCardInterest: { fontSize: 10, color: '#1D9E75', textAlign: 'center', marginTop: 4 },
});
```

- [ ] **Step 2: Run the app and verify the simulator**

Open Simul. tab. Verify:
- "Objectif" tab active by default
- Enter target=600000, already=0, monthly=3000, rate=0 → result card shows duration and 3 scenario chips
- Switch to "Projection" tab, enter monthly=2000, capital=0, rate=3 → 3 cards (1 an, 5 ans, 10 ans) with amounts + interest line
- Edge cases: rate=0 shows correct totals without "intérêts" line; empty fields show no result card

- [ ] **Step 3: Commit**

```bash
git add app/simulator.tsx
git commit -m "feat: implement simulator screen with Objectif and Projection modes"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full app walkthrough**

Run `npx expo start`. Go through each tab:
1. **Accueil** — "Épargne cumulée" metric visible (0 initially)
2. **Réglages** — Add an income source (ex: Salaire 8000 💼), verify it saves
3. **Épargne** — Hero shows updated income; tap "modifier", enter 1500, verify history row appears
4. **Accueil** — "Épargne cumulée" now shows 1 500 د.م
5. **Simul.** — "Déjà épargné" pre-filled with 1500; run a simulation

- [ ] **Step 2: Test export/import round-trip**

Go to Réglages → Export JSON, share to Files. Open the JSON and verify `incomeSources` and `savingsEntries` arrays are present and populated. Optionally reset and re-import to verify data is restored.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete savings and simulator feature — income sources, savings tracking, financial simulator"
```
