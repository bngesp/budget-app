import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addTransaction } from '../lib/db';
import { useApp } from '../context/AppContext';
import { todayISO } from '../lib/utils';

export default function AddTransactionScreen() {
  const { categories, settings, refresh } = useApp();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');

  async function handleSave() {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amt || amt <= 0) return Alert.alert('Erreur', 'Montant invalide');
    if (!description.trim()) return Alert.alert('Erreur', 'Description requise');
    if (!category) return Alert.alert('Erreur', 'Sélectionne une catégorie');
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) return Alert.alert('Erreur', 'Date invalide (AAAA-MM-JJ)');

    setLoading(true);
    try {
      await addTransaction({ type, amount: amt, description: description.trim(), category, date });
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la transaction');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Type toggle */}
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive, type === 'expense' && { backgroundColor: '#E24B4A' }]}
          onPress={() => { setType('expense'); setCategory(''); }}
        >
          <Ionicons name="arrow-down" size={16} color={type === 'expense' ? '#fff' : '#888780'} />
          <Text style={[styles.typeBtnLabel, type === 'expense' && { color: '#fff' }]}>Dépense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'income' && styles.typeBtnActive, type === 'income' && { backgroundColor: '#1D9E75' }]}
          onPress={() => { setType('income'); setCategory(''); }}
        >
          <Ionicons name="arrow-up" size={16} color={type === 'income' ? '#fff' : '#888780'} />
          <Text style={[styles.typeBtnLabel, type === 'income' && { color: '#fff' }]}>Revenu</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <View style={styles.amountCard}>
        <Text style={styles.amountCurrency}>{settings.currencySymbol}</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#B4B2A9"
          autoFocus
        />
      </View>

      <View style={styles.card}>
        {/* Description */}
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Courses Carrefour"
          placeholderTextColor="#B4B2A9"
          returnKeyType="next"
        />

        {/* Date */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor="#B4B2A9"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      {/* Categories */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Catégorie</Text>
        <View style={styles.catGrid}>
          {filteredCats.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, category === c.name && { borderColor: c.color, backgroundColor: c.color + '18' }]}
              onPress={() => setCategory(c.name)}
            >
              <Text style={styles.catChipIcon}>{c.icon}</Text>
              <Text style={[styles.catChipLabel, category === c.name && { color: c.color, fontWeight: '600' }]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveBtnLabel}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1EFE8' },
  typeRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#fff' },
  typeBtnActive: { borderWidth: 0 },
  typeBtnLabel: { fontSize: 14, fontWeight: '500', color: '#888780' },
  amountCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 0.5, borderColor: '#D3D1C7', paddingHorizontal: 16, paddingVertical: 8 },
  amountCurrency: { fontSize: 22, color: '#888780', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '600', color: '#2C2C2A' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 12, padding: 14, borderWidth: 0.5, borderColor: '#D3D1C7' },
  fieldLabel: { fontSize: 12, color: '#888780', marginBottom: 6 },
  input: { height: 40, borderWidth: 0.5, borderColor: '#D3D1C7', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#2C2C2A', backgroundColor: '#F1EFE8' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: '#D3D1C7', backgroundColor: '#F1EFE8' },
  catChipIcon: { fontSize: 14 },
  catChipLabel: { fontSize: 12, color: '#444441' },
  saveBtn: { backgroundColor: '#185FA5', marginHorizontal: 16, marginBottom: 32, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
