import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  exportAllData, importAllData, saveSetting,
  addIncomeSource, updateIncomeSource, deleteIncomeSource,
} from '../lib/db';

import { useApp } from '../context/AppContext';
import { fmtAmount } from '../lib/utils';

export default function SettingsScreen() {
  const { settings, incomeSources, refresh } = useApp();
  const [income, setIncome] = useState(settings.monthlyIncome.toString());

  // ── Income sources state ──
  const [addingSource, setAddingSource] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIcon, setNewIcon] = useState('💼');

  async function handleExport() {
    try {
      const json = await exportAllData();
      await Share.share({ message: json, title: 'Budget Tracker - Export' });
    } catch (e) {
      Alert.alert('Erreur', 'Export impossible');
    }
  }

  async function handleSaveSettings() {
    const val = parseFloat(income);
    if (!val || val <= 0) return Alert.alert('Erreur', 'Montant invalide');
    await saveSetting('monthlyIncome', val.toString());
    await refresh();
    Alert.alert('✓', 'Paramètres sauvegardés');
  }

  async function handleAddSource() {
    const amt = parseFloat(newAmount);
    if (!newName.trim()) return Alert.alert('Erreur', 'Le nom est requis.');
    if (!amt || amt <= 0) return Alert.alert('Erreur', 'Montant invalide.');
    await addIncomeSource({ name: newName.trim(), amount: amt, icon: newIcon, active: 1 });
    setNewName('');
    setNewAmount('');
    setNewIcon('💼');
    setAddingSource(false);
    await refresh();
  }

  async function handleToggleSource(id: number, active: number) {
    await updateIncomeSource(id, { active: active === 1 ? 0 : 1 });
    await refresh();
  }

  async function handleDeleteSource(id: number, name: string) {
    Alert.alert('Supprimer', `Supprimer « ${name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await deleteIncomeSource(id);
        await refresh();
      }},
    ]);
  }

  async function handleReset() {
    Alert.alert(
      'Réinitialiser',
      'Toutes les données seront supprimées. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: async () => {
          await importAllData('{"transactions":[],"categories":[],"settings":[]}');
          await refresh();
          Alert.alert('✓', 'Données réinitialisées');
        }},
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* General settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Général</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Revenu mensuel (MAD)</Text>
          <TextInput
            style={styles.input}
            value={income}
            onChangeText={setIncome}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.btn} onPress={handleSaveSettings}>
            <Text style={styles.btnLabel}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Income sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenus récurrents</Text>
        <View style={styles.card}>
          {incomeSources.length === 0 && !addingSource && (
            <Text style={styles.empty}>Aucune source de revenu configurée.</Text>
          )}
          {incomeSources.map(src => (
            <View key={src.id} style={styles.sourceRow}>
              <Text style={styles.sourceIcon}>{src.icon}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.sourceName, src.active === 0 && styles.inactive]}>{src.name}</Text>
                <Text style={styles.sourceAmt}>{fmtAmount(src.amount, settings.currencySymbol)}/mois</Text>
              </View>
              <TouchableOpacity onPress={() => handleToggleSource(src.id, src.active)} style={styles.iconBtn}>
                <Ionicons name={src.active === 1 ? 'eye-outline' : 'eye-off-outline'} size={18} color={src.active === 1 ? '#1D9E75' : '#B4B2A9'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteSource(src.id, src.name)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color="#E24B4A" />
              </TouchableOpacity>
            </View>
          ))}

          {addingSource && (
            <View style={styles.addForm}>
              <View style={styles.addFormRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nom (ex: Salaire)"
                />
                <TextInput
                  style={[styles.input, { width: 90 }]}
                  value={newIcon}
                  onChangeText={setNewIcon}
                  placeholder="💼"
                />
              </View>
              <TextInput
                style={styles.input}
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="decimal-pad"
                placeholder="Montant mensuel"
              />
              <View style={styles.addFormActions}>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setAddingSource(false)}>
                  <Text style={styles.btnSecondaryLabel}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { flex: 1, marginLeft: 8 }]} onPress={handleAddSource}>
                  <Text style={styles.btnLabel}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!addingSource && (
            <TouchableOpacity style={styles.addRow} onPress={() => setAddingSource(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#185FA5" />
              <Text style={styles.addLabel}>Ajouter une source</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Données</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleExport}>
            <Ionicons name="share-outline" size={20} color="#185FA5" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Exporter les données</Text>
              <Text style={styles.rowSub}>Partager un fichier JSON de sauvegarde</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B4B2A9" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={handleReset}>
            <Ionicons name="trash-outline" size={20} color="#E24B4A" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: '#E24B4A' }]}>Réinitialiser</Text>
              <Text style={styles.rowSub}>Supprimer toutes les transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B4B2A9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Base de données</Text>
            <Text style={styles.infoValue}>expo-sqlite (locale)</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Devise</Text>
            <Text style={styles.infoValue}>MAD (Dirham marocain)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1EFE8' },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 12, padding: 14, borderWidth: 0.5, borderColor: '#D3D1C7' },
  label: { fontSize: 12, color: '#888780', marginBottom: 6 },
  input: { height: 40, borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 8, paddingHorizontal: 12, fontSize: 15, fontWeight: '600', color: '#2C2C2A', backgroundColor: '#F1EFE8', marginBottom: 10 },
  btn: { backgroundColor: '#185FA5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  rowTitle: { fontSize: 14, color: '#2C2C2A', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#888780', marginTop: 2 },
  separator: { height: 0.5, backgroundColor: '#F1EFE8', marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  infoLabel: { fontSize: 13, color: '#888780' },
  infoValue: { fontSize: 13, color: '#2C2C2A', fontWeight: '500' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F1EFE8' },
  sourceIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  sourceName: { fontSize: 14, color: '#2C2C2A', fontWeight: '500' },
  sourceAmt: { fontSize: 12, color: '#888780', marginTop: 2 },
  inactive: { color: '#B4B2A9', textDecorationLine: 'line-through' },
  iconBtn: { padding: 6, marginLeft: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, gap: 8 },
  addLabel: { color: '#185FA5', fontSize: 14, fontWeight: '500' },
  addForm: { marginTop: 10, gap: 8 },
  addFormRow: { flexDirection: 'row', alignItems: 'center' },
  addFormActions: { flexDirection: 'row', marginTop: 4 },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: '#D3D1C7', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnSecondaryLabel: { color: '#888780', fontSize: 14, fontWeight: '500' },
  empty: { color: '#B4B2A9', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
});
