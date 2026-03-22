import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateCategory, deleteCategory, addCategory, saveSetting } from '../lib/db';
import { useApp } from '../context/AppContext';
import { fmtAmount, PALETTE } from '../lib/utils';

const ICONS = ['🛒','🏠','🚗','🎬','💊','👕','🍽️','📱','📚','💼','💻','✈️','🎮','🐾','💰','📦'];

export default function BudgetScreen() {
  const { categories, settings, summary, refresh } = useApp();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBudget, setEditBudget] = useState('');
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [showAddForm, setShowAddForm] = useState(false);
  const [incomeEdit, setIncomeEdit] = useState(settings.monthlyIncome.toString());

  const expenseCats = categories.filter(c => c.type === 'expense');
  const totalBudget = expenseCats.reduce((s, c) => s + c.budget, 0);

  async function saveIncome() {
    const val = parseFloat(incomeEdit);
    if (!val || val <= 0) return Alert.alert('Erreur', 'Montant invalide');
    await saveSetting('monthlyIncome', val.toString());
    await refresh();
    Alert.alert('✓', 'Revenu mensuel mis à jour');
  }

  async function saveBudget(id: number) {
    const val = parseFloat(editBudget);
    if (isNaN(val) || val < 0) return Alert.alert('Erreur', 'Montant invalide');
    await updateCategory(id, { budget: val });
    await refresh();
    setEditingId(null);
  }

  async function handleDelete(id: number, name: string) {
    Alert.alert('Supprimer', `Supprimer la catégorie "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await deleteCategory(id);
        await refresh();
      }},
    ]);
  }

  async function handleAdd() {
    if (!newName.trim()) return Alert.alert('Erreur', 'Nom requis');
    const budget = parseFloat(newBudget) || 0;
    await addCategory({ name: newName.trim(), budget, color: PALETTE[categories.length % PALETTE.length], icon: newIcon, type: 'expense' });
    await refresh();
    setNewName(''); setNewBudget(''); setNewIcon('📦');
    setShowAddForm(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Monthly income */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Revenu mensuel</Text>
        <View style={styles.incomeRow}>
          <TextInput
            style={styles.incomeInput}
            value={incomeEdit}
            onChangeText={setIncomeEdit}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Text style={styles.currency}>{settings.currencySymbol}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={saveIncome}>
            <Text style={styles.saveBtnLabel}>Sauvegarder</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>Budget total dépenses: {fmtAmount(totalBudget, settings.currencySymbol)}</Text>
        <Text style={[styles.sub, { color: totalBudget > settings.monthlyIncome ? '#E24B4A' : '#1D9E75' }]}>
          {totalBudget > settings.monthlyIncome
            ? `⚠ Dépasse le revenu de ${fmtAmount(totalBudget - settings.monthlyIncome, settings.currencySymbol)}`
            : `✓ Marge: ${fmtAmount(settings.monthlyIncome - totalBudget, settings.currencySymbol)}`}
        </Text>
      </View>

      {/* Categories */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Catégories de dépenses</Text>
          <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
            <Ionicons name={showAddForm ? 'close-circle-outline' : 'add-circle-outline'} size={22} color="#185FA5" />
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.addForm}>
            <View style={styles.iconPicker}>
              {ICONS.map(ic => (
                <TouchableOpacity key={ic} onPress={() => setNewIcon(ic)}
                  style={[styles.iconOpt, newIcon === ic && styles.iconOptActive]}>
                  <Text style={styles.iconOptText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.addInput} value={newName} onChangeText={setNewName} placeholder="Nom de la catégorie" />
            <View style={styles.addRow}>
              <TextInput style={[styles.addInput, { flex: 1 }]} value={newBudget} onChangeText={setNewBudget}
                keyboardType="decimal-pad" placeholder="Budget (MAD)" />
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Text style={styles.addBtnLabel}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {expenseCats.map(cat => {
          const spent = summary.byCategory[cat.name] ?? 0;
          const pct = cat.budget > 0 ? Math.min(spent / cat.budget, 1) : 0;
          const over = cat.budget > 0 && spent > cat.budget;
          const editing = editingId === cat.id;

          return (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catIconBg, { backgroundColor: cat.color + '22' }]}>
                <Text>{cat.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.catTop}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <View style={styles.catActions}>
                    <TouchableOpacity onPress={() => { setEditingId(editing ? null : cat.id); setEditBudget(cat.budget.toString()); }}>
                      <Ionicons name={editing ? 'checkmark' : 'pencil-outline'} size={15} color="#185FA5" />
                    </TouchableOpacity>
                    {editing && (
                      <TouchableOpacity onPress={() => saveBudget(cat.id)} style={{ marginLeft: 8 }}>
                        <Ionicons name="save-outline" size={15} color="#1D9E75" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(cat.id, cat.name)} style={{ marginLeft: 8 }}>
                      <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                    </TouchableOpacity>
                  </View>
                </View>
                {editing ? (
                  <TextInput
                    style={styles.budgetEdit}
                    value={editBudget}
                    onChangeText={setEditBudget}
                    keyboardType="decimal-pad"
                    autoFocus
                    onSubmitEditing={() => saveBudget(cat.id)}
                  />
                ) : (
                  <Text style={[styles.catBudget, { color: over ? '#E24B4A' : '#888780' }]}>
                    {fmtAmount(spent, settings.currencySymbol)} / {fmtAmount(cat.budget, settings.currencySymbol)}
                    {over ? ' ⚠' : ''}
                  </Text>
                )}
                {cat.budget > 0 && !editing && (
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, {
                      width: `${Math.round(pct * 100)}%` as any,
                      backgroundColor: over ? '#E24B4A' : cat.color,
                    }]} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1EFE8' },
  card: { backgroundColor: '#fff', borderRadius: 12, margin: 12, marginBottom: 4, padding: 14, borderWidth: 0.5, borderColor: '#D3D1C7' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#444441' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  incomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 6 },
  incomeInput: { flex: 1, height: 40, borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 8, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', color: '#2C2C2A', backgroundColor: '#F1EFE8' },
  currency: { fontSize: 14, color: '#888780' },
  saveBtn: { backgroundColor: '#185FA5', borderRadius: 8, paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '500' },
  sub: { fontSize: 12, color: '#888780', marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#F1EFE8' },
  catIconBg: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  catName: { fontSize: 13, fontWeight: '500', color: '#2C2C2A' },
  catActions: { flexDirection: 'row', alignItems: 'center' },
  catBudget: { fontSize: 12, marginBottom: 5 },
  barTrack: { height: 6, backgroundColor: '#F1EFE8', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  budgetEdit: { height: 34, borderWidth: 0.5, borderColor: '#185FA5', borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: '#2C2C2A', backgroundColor: '#E6F1FB', marginBottom: 4 },
  addForm: { backgroundColor: '#F1EFE8', borderRadius: 10, padding: 12, marginBottom: 14 },
  iconPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  iconOpt: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#D3D1C7' },
  iconOptActive: { borderColor: '#185FA5', backgroundColor: '#E6F1FB' },
  iconOptText: { fontSize: 18 },
  addInput: { height: 38, borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 8, paddingHorizontal: 10, fontSize: 13, backgroundColor: '#fff', marginBottom: 8, color: '#2C2C2A' },
  addRow: { flexDirection: 'row', gap: 8 },
  addBtn: { backgroundColor: '#185FA5', borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
