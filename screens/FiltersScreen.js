import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function FiltersScreen({ route }) {
  const navigation = useNavigation();
  const initialFilters = route.params?.filters || {};

  const [search, setSearch] = useState(initialFilters.search || '');
  const [categoryName, setCategoryName] = useState(initialFilters.categoryName || '');
  const [categoryId, setCategoryId] = useState(initialFilters.categoryId || '');
  const [regionName, setRegionName] = useState(initialFilters.regionName || '');
  const [regionId, setRegionId] = useState(initialFilters.regionId || '');
  const [priceFrom, setPriceFrom] = useState(initialFilters.priceFrom || '');
  const [priceTo, setPriceTo] = useState(initialFilters.priceTo || '');
  const [type, setType] = useState(initialFilters.type || 'sell');
  const [sort, setSort] = useState(initialFilters.sort || 'date_desc');

  const applyFilters = () => {
    const filters = {
      search,
      categoryId,
      categoryName,
      regionId,
      regionName,
      priceFrom: priceFrom ? Number(priceFrom) : undefined,
      priceTo: priceTo ? Number(priceTo) : undefined,
      type,
      sort,
    };
    navigation.navigate('Home', { filters });
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryName('');
    setCategoryId('');
    setRegionName('');
    setRegionId('');
    setPriceFrom('');
    setPriceTo('');
    setType('sell');
    setSort('date_desc');
    const filters = {
      search: '',
      categoryId: '',
      categoryName: '',
      regionId: '',
      regionName: '',
      priceFrom: undefined,
      priceTo: undefined,
      type: 'sell',
      sort: 'date_desc',
    };
    navigation.navigate('Home', { filters });
  };

  const selectCategory = () => {
    navigation.navigate('CategorySelect', {
      selectedId: categoryId,
      onSelect: (category) => {
        setCategoryName(category.name);
        setCategoryId(category.id);
      },
    });
  };

  const selectRegion = () => {
    navigation.navigate('RegionSelect', {
      selectedId: regionId,
      onSelect: (region) => {
        setRegionName(region.name);
        setRegionId(region.id);
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Фильтры</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Поиск по тексту</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔍</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите слово"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Категория</Text>
          <TouchableOpacity style={styles.selector} onPress={selectCategory}>
            <Text style={styles.selectorText}>{categoryName || 'Выбрать категорию'}</Text>
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Цена</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceLabel}>от</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                keyboardType="numeric"
                value={priceFrom}
                onChangeText={setPriceFrom}
              />
            </View>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceLabel}>до</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="100000"
                keyboardType="numeric"
                value={priceTo}
                onChangeText={setPriceTo}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Регион</Text>
          <TouchableOpacity style={styles.selector} onPress={selectRegion}>
            <Text style={styles.selectorText}>{regionName || 'Выбрать регион'}</Text>
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Тип</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, type === 'sell' && styles.segmentActive]}
              onPress={() => setType('sell')}
            >
              <Text style={[styles.segmentText, type === 'sell' && styles.segmentTextActive]}>Продажа</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, type === 'rent' && styles.segmentActive]}
              onPress={() => setType('rent')}
            >
              <Text style={[styles.segmentText, type === 'rent' && styles.segmentTextActive]}>Аренда</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Сортировка</Text>
          <View style={styles.sortOptions}>
            <TouchableOpacity
              style={[styles.sortOption, sort === 'date_desc' && styles.sortOptionActive]}
              onPress={() => setSort('date_desc')}
            >
              <Text style={[styles.sortOptionText, sort === 'date_desc' && styles.sortOptionTextActive]}>Сначала новые</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOption, sort === 'price_asc' && styles.sortOptionActive]}
              onPress={() => setSort('price_asc')}
            >
              <Text style={[styles.sortOptionText, sort === 'price_asc' && styles.sortOptionTextActive]}>Сначала дешёвые</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOption, sort === 'price_desc' && styles.sortOptionActive]}
              onPress={() => setSort('price_desc')}
            >
              <Text style={[styles.sortOptionText, sort === 'price_desc' && styles.sortOptionTextActive]}>Сначала дорогие</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Сбросить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.applyButton]} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Применить</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1c1c1e' },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 24, color: '#007AFF' },
  scrollContent: { padding: 16 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', color: '#1c1c1e', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d1d6', paddingHorizontal: 12, paddingVertical: 2 },
  inputIcon: { fontSize: 18, marginRight: 10, color: '#8e8e93' },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, color: '#1c1c1e' },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d1d6', paddingHorizontal: 16, paddingVertical: 14 },
  selectorText: { fontSize: 16, color: '#1c1c1e' },
  selectorArrow: { fontSize: 24, color: '#c7c7cc' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d1d6', paddingHorizontal: 12, paddingVertical: 2, marginRight: 8 },
  priceLabel: { fontSize: 16, color: '#8e8e93', marginRight: 8 },
  priceInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: '#1c1c1e' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 8, padding: 2 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  segmentText: { fontSize: 16, fontWeight: '500', color: '#8e8e93' },
  segmentTextActive: { color: '#007AFF' },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  sortOption: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#d1d1d6', marginRight: 10, marginBottom: 8 },
  sortOptionActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  sortOptionText: { fontSize: 14, color: '#1c1c1e' },
  sortOptionTextActive: { color: '#ffffff' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 32 },
  button: { flex: 1, paddingVertical: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resetButton: { backgroundColor: '#f2f2f7', marginRight: 8, borderWidth: 1, borderColor: '#d1d1d6' },
  resetButtonText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  applyButton: { backgroundColor: '#007AFF', marginLeft: 8 },
  applyButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});