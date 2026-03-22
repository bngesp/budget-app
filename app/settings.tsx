import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { exportAllData, importAllData, saveSetting } from '../lib/db';
import { useApp } from '../context/AppContext';

export default function SettingsScreen() {
  const { settings, refresh } = useApp();
  const [income, setIncome] = useState(settings.monthlyIncome.toString());

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
});
