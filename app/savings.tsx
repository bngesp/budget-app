import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { upsertSavingsEntry, computeRealIncome } from '../lib/db';
import { fmtAmount, currentMonthLabel } from '../lib/utils';

export default function SavingsScreen() {
  const { settings, summary, incomeSources, savingsHistory, currentSavings, refresh } = useApp();
  const sym = settings.currencySymbol;
  const todayMonth = format(new Date(), 'yyyy-MM');

  const displayedSavings = currentSavings
    ? (currentSavings.actual ?? currentSavings.calculated)
    : Math.max(0, summary.totalIncome - summary.totalExpenses);

  const calculatedSavings = currentSavings?.calculated
    ?? Math.max(0, summary.totalIncome - summary.totalExpenses);

  const totalCumulated = savingsHistory.reduce(
    (sum, e) => sum + (e.actual ?? e.calculated),
    0
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleOpenModal = () => {
    setInputValue(String(Math.round(displayedSavings)));
    setModalVisible(true);
  };

  const handleSaveActual = async () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Valeur invalide', 'Entrez un montant positif.');
      return;
    }
    try {
      const realIncome = await computeRealIncome(todayMonth);
      const calculated = Math.max(0, realIncome - summary.totalExpenses);
      await upsertSavingsEntry({ month: todayMonth, calculated, actual: parsed, note: null });
      await refresh();
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    }
  };

  const activeSourcesTotal = incomeSources
    .filter(src => src.active === 1)
    .reduce((sum, src) => sum + src.amount, 0);

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
              calculé : {fmtAmount(calculatedSavings, sym)}
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
              <Text style={s.rowLeft}>💸  Revenus variables <Text style={s.tagBlue}>(transactions)</Text></Text>
              <Text style={s.rowRight}>{fmtAmount(summary.totalIncome, sym)}</Text>
            </View>
          )}
          {(activeSourcesTotal > 0 || summary.totalIncome > 0) && (
            <View style={[s.row, s.rowTotal]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={[s.rowRight, s.totalValue]}>
                {fmtAmount(activeSourcesTotal + summary.totalIncome, sym)}
              </Text>
            </View>
          )}
          {activeSourcesTotal === 0 && summary.totalIncome === 0 && (
            <Text style={s.empty}>Aucun revenu ce mois. Ajoute des sources dans Réglages.</Text>
          )}
        </View>

        {/* ── Historique ── */}
        <View style={s.historySection}>
          <Text style={s.sectionLabel}>Historique</Text>
          {savingsHistory.length === 0 && (
            <Text style={s.empty}>Aucune entrée pour l'instant.</Text>
          )}
          {savingsHistory.map(entry => (
            <View key={entry.month} style={s.historyRow}>
              <Text style={s.historyMonth}>{currentMonthLabel(entry.month)}</Text>
              <Text style={s.historyAmount}>{fmtAmount(entry.actual ?? entry.calculated, sym)}</Text>
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

      {/* ── Modal ── */}
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
