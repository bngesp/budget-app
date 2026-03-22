import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { fmtAmount, fmtDate, currentMonthLabel, getCategoryColor } from '../lib/utils';

export default function DashboardScreen() {
  const { transactions, categories, settings, summary, currentMonth, loading } = useApp();

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#185FA5" /></View>;
  }

  const balanceColor = summary.balance >= 0 ? '#1D9E75' : '#E24B4A';
  const savingsRate = summary.totalIncome > 0
    ? Math.round((summary.balance / summary.totalIncome) * 100) : 0;

  const topCats = Object.entries(summary.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const recent = transactions.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <Text style={styles.monthLabel}>{currentMonthLabel(currentMonth)}</Text>
        <Text style={[styles.savingsRate, { color: savingsRate >= 0 ? '#1D9E75' : '#E24B4A' }]}>
          Épargne: {savingsRate}%
        </Text>
      </View>

      {/* Metric cards */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { flex: 1 }]}>
          <Text style={styles.metricLabel}>Revenus</Text>
          <Text style={[styles.metricValue, { color: '#185FA5' }]}>
            {fmtAmount(summary.totalIncome, settings.currencySymbol)}
          </Text>
        </View>
        <View style={[styles.metricCard, { flex: 1, marginHorizontal: 8 }]}>
          <Text style={styles.metricLabel}>Dépenses</Text>
          <Text style={[styles.metricValue, { color: '#E24B4A' }]}>
            {fmtAmount(summary.totalExpenses, settings.currencySymbol)}
          </Text>
        </View>
        <View style={[styles.metricCard, { flex: 1 }]}>
          <Text style={styles.metricLabel}>Solde</Text>
          <Text style={[styles.metricValue, { color: balanceColor }]}>
            {fmtAmount(summary.balance, settings.currencySymbol)}
          </Text>
        </View>
      </View>

      {/* Top categories */}
      {topCats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top catégories</Text>
          {topCats.map(([name, amt]) => {
            const cat = categories.find(c => c.name === name);
            const budget = cat?.budget ?? 0;
            const pct = budget > 0 ? Math.min(amt / budget, 1) : 0;
            const over = budget > 0 && amt > budget;
            return (
              <View key={name} style={styles.catRow}>
                <Text style={styles.catIcon}>{cat?.icon ?? '📦'}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.catLabelRow}>
                    <Text style={styles.catName}>{name}</Text>
                    <Text style={[styles.catAmt, { color: over ? '#E24B4A' : '#2C2C2A' }]}>
                      {fmtAmount(amt, settings.currencySymbol)}
                    </Text>
                  </View>
                  {budget > 0 && (
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, {
                        width: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: over ? '#E24B4A' : getCategoryColor(categories, name),
                      }]} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Récentes</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Aucune transaction ce mois</Text>
        ) : (
          recent.map(t => (
            <View key={t.id} style={styles.txnRow}>
              <View style={[styles.txnIconBg, { backgroundColor: getCategoryColor(categories, t.category) + '22' }]}>
                <Text style={styles.txnIcon}>
                  {categories.find(c => c.name === t.category)?.icon ?? '📦'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnDesc}>{t.description}</Text>
                <Text style={styles.txnMeta}>{t.category} · {fmtDate(t.date)}</Text>
              </View>
              <Text style={[styles.txnAmt, { color: t.type === 'expense' ? '#E24B4A' : '#1D9E75' }]}>
                {t.type === 'expense' ? '-' : '+'}{fmtAmount(t.amount, settings.currencySymbol)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-transaction')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1EFE8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#2C2C2A', textTransform: 'capitalize' },
  savingsRate: { fontSize: 13, fontWeight: '500' },
  metricsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  metricCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: '#D3D1C7' },
  metricLabel: { fontSize: 11, color: '#888780', marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 12, padding: 14, borderWidth: 0.5, borderColor: '#D3D1C7' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#444441', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 12, color: '#185FA5' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  catIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 13, color: '#2C2C2A' },
  catAmt: { fontSize: 13, fontWeight: '500' },
  barTrack: { height: 6, backgroundColor: '#F1EFE8', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: '#F1EFE8' },
  txnIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnIcon: { fontSize: 16 },
  txnDesc: { fontSize: 13, fontWeight: '500', color: '#2C2C2A' },
  txnMeta: { fontSize: 11, color: '#888780', marginTop: 2 },
  txnAmt: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888780', fontSize: 13, paddingVertical: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center', shadowColor: '#185FA5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
