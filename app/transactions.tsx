import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deleteTransaction } from '../lib/db';
import { useApp } from '../context/AppContext';
import { fmtAmount, fmtDate, getCategoryColor } from '../lib/utils';
import { Transaction } from '../types';

export default function TransactionsScreen() {
  const { transactions, categories, settings, refresh } = useApp();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) &&
        !t.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleDelete(t: Transaction) {
    Alert.alert('Supprimer', `Supprimer "${t.description}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await deleteTransaction(t.id);
        await refresh();
      }},
    ]);
  }

  function renderItem({ item: t }: { item: Transaction }) {
    const catIcon = categories.find(c => c.name === t.category)?.icon ?? '📦';
    const color = getCategoryColor(categories, t.category);
    return (
      <View style={styles.txnRow}>
        <View style={[styles.iconBg, { backgroundColor: color + '22' }]}>
          <Text style={styles.icon}>{catIcon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.desc}>{t.description}</Text>
          <Text style={styles.meta}>{t.category} · {fmtDate(t.date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amt, { color: t.type === 'expense' ? '#E24B4A' : '#1D9E75' }]}>
            {t.type === 'expense' ? '-' : '+'}{fmtAmount(t.amount, settings.currencySymbol)}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(t)} style={{ marginTop: 4 }}>
            <Ionicons name="trash-outline" size={14} color="#B4B2A9" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color="#888780" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher..."
          placeholderTextColor="#B4B2A9"
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#888780" /></TouchableOpacity> : null}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
              {f === 'all' ? 'Tout' : f === 'expense' ? 'Dépenses' : 'Revenus'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucune transaction</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-transaction')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1EFE8' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, marginBottom: 6, borderRadius: 10, borderWidth: 0.5, borderColor: '#D3D1C7', paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: '#2C2C2A' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#D3D1C7' },
  filterBtnActive: { backgroundColor: '#185FA5', borderColor: '#185FA5' },
  filterLabel: { fontSize: 12, color: '#888780' },
  filterLabelActive: { color: '#fff', fontWeight: '500' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#D3D1C7' },
  iconBg: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 17 },
  desc: { fontSize: 13, fontWeight: '500', color: '#2C2C2A' },
  meta: { fontSize: 11, color: '#888780', marginTop: 2 },
  amt: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888780', fontSize: 13, paddingVertical: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#185FA5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
