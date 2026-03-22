import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { fmtAmount, getDayProgress, projectEndOfMonth, getCategoryColor } from '../lib/utils';

export default function ForecastScreen() {
  const { summary, categories, settings } = useApp();

  const { dayOfMonth, daysInMonth, pct: dayPct } = getDayProgress(
    new Date().toISOString().slice(0, 7)
  );

  const projected = projectEndOfMonth(summary.totalExpenses, dayOfMonth, daysInMonth);
  const income = summary.totalIncome || settings.monthlyIncome;
  const projectedSavings = income - projected;
  const savingsRate = income > 0 ? Math.round((projectedSavings / income) * 100) : 0;
  const isOnTrack = projected <= income;

  // Daily budget
  const dailyBudget = income / daysInMonth;
  const dailyActual = dayOfMonth > 0 ? summary.totalExpenses / dayOfMonth : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Progress through month */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Avancement du mois</Text>
        <View style={styles.progressRow}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${dayPct}%` as any, backgroundColor: '#185FA5' }]} />
          </View>
          <Text style={styles.progressLabel}>Jour {dayOfMonth}/{daysInMonth} ({dayPct}%)</Text>
        </View>
      </View>

      {/* Forecast cards */}
      <View style={styles.fcGrid}>
        <View style={[styles.fcCard, { flex: 1 }]}>
          <Text style={styles.fcLabel}>Dépensé</Text>
          <Text style={[styles.fcValue, { color: '#E24B4A' }]}>{fmtAmount(summary.totalExpenses, settings.currencySymbol)}</Text>
        </View>
        <View style={[styles.fcCard, { flex: 1, marginHorizontal: 8 }]}>
          <Text style={styles.fcLabel}>Projection</Text>
          <Text style={[styles.fcValue, { color: isOnTrack ? '#1D9E75' : '#E24B4A' }]}>{fmtAmount(projected, settings.currencySymbol)}</Text>
          <Text style={[styles.fcSub, { color: isOnTrack ? '#1D9E75' : '#E24B4A' }]}>{isOnTrack ? '✓ OK' : `+${fmtAmount(projected - income, settings.currencySymbol)}`}</Text>
        </View>
        <View style={[styles.fcCard, { flex: 1 }]}>
          <Text style={styles.fcLabel}>Épargne</Text>
          <Text style={[styles.fcValue, { color: projectedSavings >= 0 ? '#1D9E75' : '#E24B4A' }]}>{fmtAmount(Math.abs(projectedSavings), settings.currencySymbol)}</Text>
          <Text style={styles.fcSub}>Taux: {Math.max(0, savingsRate)}%</Text>
        </View>
      </View>

      {/* Daily pace */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rythme quotidien</Text>
        <View style={styles.paceRow}>
          <View style={styles.paceItem}>
            <Text style={styles.paceLabel}>Budget/jour</Text>
            <Text style={styles.paceValue}>{fmtAmount(dailyBudget, settings.currencySymbol)}</Text>
          </View>
          <View style={styles.paceDivider} />
          <View style={styles.paceItem}>
            <Text style={styles.paceLabel}>Dépensé/jour</Text>
            <Text style={[styles.paceValue, { color: dailyActual > dailyBudget ? '#E24B4A' : '#1D9E75' }]}>
              {fmtAmount(dailyActual, settings.currencySymbol)}
            </Text>
          </View>
          <View style={styles.paceDivider} />
          <View style={styles.paceItem}>
            <Text style={styles.paceLabel}>Écart/jour</Text>
            <Text style={[styles.paceValue, { color: dailyActual > dailyBudget ? '#E24B4A' : '#1D9E75' }]}>
              {dailyActual > dailyBudget ? '+' : ''}{fmtAmount(dailyActual - dailyBudget, settings.currencySymbol)}
            </Text>
          </View>
        </View>
      </View>

      {/* Budget progress per category */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budget par catégorie</Text>
        {categories.filter(c => c.type === 'expense' && c.budget > 0).map(cat => {
          const spent = summary.byCategory[cat.name] ?? 0;
          const pct = Math.min(spent / cat.budget, 1);
          const over = spent > cat.budget;
          const remaining = cat.budget - spent;
          return (
            <View key={cat.id} style={styles.catProgRow}>
              <View style={styles.catProgTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                <Text style={[styles.catAmt, { color: over ? '#E24B4A' : '#444441' }]}>
                  {fmtAmount(spent, settings.currencySymbol)} / {fmtAmount(cat.budget, settings.currencySymbol)}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, {
                  width: `${Math.round(pct * 100)}%` as any,
                  backgroundColor: over ? '#E24B4A' : cat.color,
                }]} />
              </View>
              <Text style={[styles.catStatus, { color: over ? '#E24B4A' : '#1D9E75' }]}>
                {over
                  ? `⚠ Dépassé de ${fmtAmount(Math.abs(remaining), settings.currencySymbol)}`
                  : `Reste ${fmtAmount(remaining, settings.currencySymbol)}`}
              </Text>
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
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#444441', marginBottom: 12 },
  progressRow: { gap: 6 },
  barTrack: { height: 8, backgroundColor: '#F1EFE8', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#888780' },
  fcGrid: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, marginBottom: 4 },
  fcCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: '#D3D1C7', alignItems: 'center' },
  fcLabel: { fontSize: 11, color: '#888780', marginBottom: 4, textAlign: 'center' },
  fcValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  fcSub: { fontSize: 11, color: '#888780', marginTop: 2 },
  paceRow: { flexDirection: 'row', alignItems: 'center' },
  paceItem: { flex: 1, alignItems: 'center' },
  paceDivider: { width: 0.5, height: 40, backgroundColor: '#D3D1C7' },
  paceLabel: { fontSize: 11, color: '#888780', marginBottom: 4 },
  paceValue: { fontSize: 13, fontWeight: '600', color: '#2C2C2A', textAlign: 'center' },
  catProgRow: { paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#F1EFE8' },
  catProgTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, fontWeight: '500', color: '#2C2C2A' },
  catAmt: { fontSize: 12, fontWeight: '500' },
  catStatus: { fontSize: 11, marginTop: 4 },
});
