import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useCachedListings } from '../context/CachedListingsContext';
import { getImageUrl } from '../utils/imageUtils';
import { CachedImage } from '../components/CachedImage';

export default function AvailableListingsScreen({ navigation }) {
  const route = useRoute();
  const { subscriptionId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allListings, setAllListings] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [adding, setAdding] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  const { getCached } = useCachedListings();

  const loadAllListings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/listings/my', { params: { limit: 1000 } });
      const data = res.data || [];
      setAllListings(data);
      applyLocalFilters('', 'all', 'active', data);
    } catch (error) {
      console.error('Ошибка загрузки объявлений:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить объявления');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyLocalFilters = (search, type, status, sourceData = null) => {
    const data = sourceData || allListings;
    let filtered = [...data];

    if (search.trim()) {
      const lower = search.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower)
      );
    }

    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }

    if (status !== 'all') {
      filtered = filtered.filter(item => item.status === status);
    }

    setListings(filtered);
    setSelectedIds([]);
  };

  const applyFilters = useCallback(() => {
    applyLocalFilters(searchText, filterType, filterStatus);
  }, [searchText, filterType, filterStatus, allListings]);

  const resetFilters = useCallback(() => {
    setSearchText('');
    setFilterType('all');
    setFilterStatus('active');
    applyLocalFilters('', 'all', 'active');
  }, [allListings]);

  useFocusEffect(
    useCallback(() => {
      loadAllListings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAllListings();
  };

  const selectAllListings = async () => {
    setLoadingAll(true);
    try {
      const allIds = listings.map(item => item.id);
      setSelectedIds(allIds);
    } finally {
      setLoadingAll(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    selectAllListings();
  };

  const clearAll = () => setSelectedIds([]);

  const handleAddSelected = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Внимание', 'Выберите хотя бы одно объявление');
      return;
    }
    Alert.alert(
      'Подтверждение',
      `Добавить ${selectedIds.length} объявлений в пакет?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Добавить',
          onPress: async () => {
            setAdding(true);
            let success = 0, errors = 0;
            for (const id of selectedIds) {
              try {
                await api.post(`/subscriptions/${subscriptionId}/listings`, { listingId: id });
                success++;
              } catch (e) {
                errors++;
              }
            }
            setAdding(false);
            if (errors > 0) {
              Alert.alert('Частичный успех', `Добавлено ${success}, ошибок ${errors}`);
            } else {
              Alert.alert('Успех', `Добавлено ${success} объявлений`);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getImageUrlWithCache = (item) => {
    let url = getImageUrl(item);
    if (!url) {
      const cached = getCached(item.id);
      if (cached) {
        url = getImageUrl(cached);
      }
    }
    return url;
  };

  const renderItem = ({ item }) => {
    const selected = selectedIds.includes(item.id);
    const imageUrl = getImageUrlWithCache(item);
    return (
      <TouchableOpacity style={[styles.item, selected && styles.selected]} onPress={() => toggleSelect(item.id)}>
        {imageUrl ? (
          <CachedImage
            uri={imageUrl}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>{item.price} ₽</Text>
        </View>
        {selected && <Text style={styles.check}>✓</Text>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const totalSelected = selectedIds.length;
  const totalVisible = listings.length;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Выбор объявлений</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по названию или описанию..."
          value={searchText}
          onChangeText={setSearchText}
          blurOnSubmit={false}
          returnKeyType="search"
          onSubmitEditing={applyFilters}
        />
        <TouchableOpacity style={styles.searchButton} onPress={applyFilters}>
          <Text style={styles.searchButtonText}>Поиск</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
          <Text style={styles.resetButtonText}>Сброс</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === 'all' && styles.activeFilter]}
          onPress={() => setFilterType('all')}
        >
          <Text>Все</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === 'sell' && styles.activeFilter]}
          onPress={() => setFilterType('sell')}
        >
          <Text>Продажа</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === 'rent' && styles.activeFilter]}
          onPress={() => setFilterType('rent')}
        >
          <Text>Аренда</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterStatus === 'active' && styles.activeFilter]}
          onPress={() => setFilterStatus('active')}
        >
          <Text>Активные</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterStatus === 'archived' && styles.activeFilter]}
          onPress={() => setFilterStatus('archived')}
        >
          <Text>Архив</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectionBar}>
        <Text style={styles.selectionText}>
          Выбрано: {totalSelected} {totalVisible > 0 ? `из ${totalVisible}` : ''}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={selectAll} disabled={loadingAll}>
            {loadingAll ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.actionText}>Все</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll}><Text style={styles.actionText}>Снять</Text></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `fallback-${index}`)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Нет объявлений</Text>}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
      />

      <TouchableOpacity
        style={[
          styles.addButton,
          (selectedIds.length === 0 || adding) && styles.disabledButton,
          { bottom: insets.bottom + 20 }
        ]}
        onPress={handleAddSelected}
        disabled={selectedIds.length === 0 || adding}
      >
        {adding ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.addButtonText}>Добавить выбранные ({selectedIds.length})</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#e5e5ea',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#1c1c1e',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectionText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
  },
  actionText: {
    color: '#007AFF',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    alignItems: 'center',
  },
  selected: {
    backgroundColor: '#e0f0ff',
    borderColor: '#007AFF',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 10,
  },
  placeholderImage: {
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    color: '#8e8e93',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  price: {
    fontSize: 14,
    color: '#007AFF',
  },
  check: {
    fontSize: 18,
    color: '#007AFF',
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#8e8e93',
  },
});