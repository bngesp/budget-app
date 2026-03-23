import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { fmtAmount } from '../lib/utils';
import {
  calcMonthsToGoal, formatDuration, targetDate,
  roundToHundred, calcFutureValue, calcInterestEarned,
} from '../lib/savings';

type Tab = 'objectif' | 'projection';

export default function SimulatorScreen() {
  const { settings, savingsHistory } = useApp();
  const sym = settings.currencySymbol;

  const totalCumulated = savingsHistory.reduce(
    (sum, e) => sum + (e.actual ?? e.calculated),
    0
  );

  const [tab, setTab] = useState<Tab>('objectif');

  // ── Objectif mode ──────────────────────────────
  const [targetStr, setTargetStr] = useState('');
  const [monthlyStr, setMonthlyStr] = useState('');
  const [rateStr, setRateStr] = useState('0');

  const target = parseFloat(targetStr) || 0;
  const monthly = parseFloat(monthlyStr) || 0;
  const annualRate = parseFloat(rateStr) || 0;

  const months = useMemo(
    () => calcMonthsToGoal(target, totalCumulated, monthly, annualRate),
    [target, totalCumulated, monthly, annualRate]
  );

  const scenarios = useMemo(() => {
    if (target <= 0) return null;
    return [0.6, 1.0, 1.5].map(factor => {
      const amt = roundToHundred(monthly * factor || target * 0.1 * factor);
      const m = calcMonthsToGoal(target, totalCumulated, amt, annualRate);
      return { factor, amt, months: m };
    });
  }, [target, totalCumulated, monthly, annualRate]);

  // ── Projection mode ────────────────────────────
  const [projMonthlyStr, setProjMonthlyStr] = useState('');
  const [projRateStr, setProjRateStr] = useState('0');
  const [projCapitalStr, setProjCapitalStr] = useState('');

  const projMonthly = parseFloat(projMonthlyStr) || 0;
  const projRate = parseFloat(projRateStr) || 0;
  const projCapital = parseFloat(projCapitalStr) || totalCumulated;

  const projections = useMemo(() => {
    if (projMonthly <= 0) return null;
    return [12, 60, 120].map(n => {
      const fv = calcFutureValue(projMonthly, projCapital, n, projRate);
      const interest = calcInterestEarned(fv, projMonthly, projCapital, n);
      return { years: n / 12, fv, interest };
    });
  }, [projMonthly, projCapital, projRate]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'objectif' && s.tabBtnActive]}
          onPress={() => setTab('objectif')}
        >
          <Text style={[s.tabLabel, tab === 'objectif' && s.tabLabelActive]}>
            🎯  Objectif
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'projection' && s.tabBtnActive]}
          onPress={() => setTab('projection')}
        >
          <Text style={[s.tabLabel, tab === 'projection' && s.tabLabelActive]}>
            📈  Projection
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Saved capital chip */}
          <View style={s.capitalChip}>
            <Text style={s.capitalLabel}>Capital actuel</Text>
            <Text style={s.capitalValue}>{fmtAmount(totalCumulated, sym)}</Text>
          </View>

          {tab === 'objectif' ? (
            <>
              {/* ── Objectif inputs ── */}
              <View style={s.section}>
                <Text style={s.sectionLabel}>Définir l'objectif</Text>

                <View style={s.inputRow}>
                  <Text style={s.inputLabel}>Montant cible</Text>
                  <TextInput
                    style={s.input}
                    value={targetStr}
                    onChangeText={setTargetStr}
                    keyboardType="numeric"
                    placeholder="ex: 50 000"
                    placeholderTextColor="#ccc"
                  />
                </View>

                <View style={s.inputRow}>
                  <Text style={s.inputLabel}>Épargne mensuelle</Text>
                  <TextInput
                    style={s.input}
                    value={monthlyStr}
                    onChangeText={setMonthlyStr}
                    keyboardType="numeric"
                    placeholder="ex: 2 000"
                    placeholderTextColor="#ccc"
                  />
                </View>

                <View style={s.inputRow}>
                  <Text style={s.inputLabel}>Taux annuel (%)</Text>
                  <TextInput
                    style={s.input}
                    value={rateStr}
                    onChangeText={setRateStr}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>

              {/* ── Result ── */}
              {target > 0 && monthly > 0 && (
                <View style={s.resultCard}>
                  <Text style={s.resultMonths}>{formatDuration(months)}</Text>
                  <Text style={s.resultSub}>
                    {isFinite(months)
                      ? `Objectif atteint en ${targetDate(months)}`
                      : 'Augmentez votre épargne mensuelle'}
                  </Text>
                </View>
              )}

              {/* ── Scenarios ── */}
              {scenarios && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Scénarios</Text>
                  {scenarios.map(({ factor, amt, months: m }) => (
                    <View key={factor} style={s.scenarioRow}>
                      <View style={s.scenarioLeft}>
                        <Text style={s.scenarioFactor}>{Math.round(factor * 100)}%</Text>
                        <Text style={s.scenarioAmt}>{fmtAmount(amt, sym)}/mois</Text>
                      </View>
                      <View style={s.scenarioRight}>
                        <Text style={s.scenarioDuration}>{formatDuration(m)}</Text>
                        {isFinite(m) && (
                          <Text style={s.scenarioDate}>{targetDate(m)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              {/* ── Projection inputs ── */}
              <View style={s.section}>
                <Text style={s.sectionLabel}>Paramètres de projection</Text>

                <View style={s.inputRow}>
                  <Text style={s.inputLabel}>Épargne mensuelle</Text>
                  <TextInput
                    style={s.input}
                    value={projMonthlyStr}
                    onChangeText={setProjMonthlyStr}
                    keyboardType="numeric"
                    placeholder="ex: 2 000"
                    placeholderTextColor="#ccc"
                  />
                </View>

                <View style={s.inputRow}>
                  <Text style={s.inputLabel}>Capital de départ</Text>
                  <TextInput
                    style={s.input}
                    value={projCapitalStr}
                    onChangeText={setProjCapitalStr}
                    keyboardType="numeric"
                    placeholder={`auto: ${fmtAmount(totalCumulated, sym)}`}
                    placeholderTextColor="#ccc"
                  />
                </View>

                <View style={s.inputRow}>
                  <Text style={s.inputLabel}>Taux annuel (%)</Text>
                  <TextInput
                    style={s.input}
                    value={projRateStr}
                    onChangeText={setProjRateStr}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>

              {/* ── Projection results ── */}
              {projections ? (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Projection</Text>
                  {projections.map(({ years, fv, interest }) => (
                    <View key={years} style={s.projRow}>
                      <View style={s.projLeft}>
                        <Text style={s.projYears}>{years} an{years > 1 ? 's' : ''}</Text>
                        <Text style={s.projContrib}>
                          dont {fmtAmount(interest, sym)} intérêts
                        </Text>
                      </View>
                      <Text style={s.projFV}>{fmtAmount(fv, sym)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.emptyState}>
                  <Text style={s.emptyText}>
                    Entrez un montant mensuel pour voir les projections.
                  </Text>
                </View>
              )}
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#185FA5' },
  tabLabel: { fontSize: 14, color: '#aaa', fontWeight: '500' },
  tabLabelActive: { color: '#185FA5', fontWeight: '700' },

  capitalChip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 20, marginTop: 16, marginBottom: 4,
    backgroundColor: '#f5f9ff', borderWidth: 1, borderColor: '#d0e4f8',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  capitalLabel: { fontSize: 12, color: '#185FA5' },
  capitalValue: { fontSize: 14, fontWeight: '700', color: '#185FA5' },

  section: { padding: 20 },
  sectionLabel: { fontSize: 11, color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  inputRow: { marginBottom: 14 },
  inputLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontWeight: '600', color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },

  resultCard: {
    marginHorizontal: 20, backgroundColor: '#185FA5', borderRadius: 16,
    paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center',
  },
  resultMonths: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  resultSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  scenarioRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  scenarioLeft: {},
  scenarioFactor: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  scenarioAmt: { fontSize: 12, color: '#888', marginTop: 2 },
  scenarioRight: { alignItems: 'flex-end' },
  scenarioDuration: { fontSize: 14, fontWeight: '600', color: '#1D9E75' },
  scenarioDate: { fontSize: 11, color: '#aaa', marginTop: 2 },

  projRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  projLeft: {},
  projYears: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  projContrib: { fontSize: 12, color: '#888', marginTop: 2 },
  projFV: { fontSize: 18, fontWeight: '700', color: '#1D9E75' },

  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 13, textAlign: 'center' },
});
