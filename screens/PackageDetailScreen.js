import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import api from '../services/api';

// ===== КАСТОМНЫЙ DEBOUNCE =====
function useDebounce(callback, delay) {
  const timerRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      callback(...args);
      timerRef.current = null;
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export default function PackageDetailScreen() {
  const route = useRoute();
  const { subscriptionId } = route.params;

  // ===== СОСТОЯНИЯ =====
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [packageListings, setPackageListings] = useState([]);
  const [availableListings, setAvailableListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Фильтры
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  // ===== ЗАГРУЗКА ДАННЫХ =====
  const loadSubscriptionInfo = async () => {
    const res = await api.get(`/subscriptions/${subscriptionId}`);
    setSubscription(res.data);
    return res.data;
  };

  const loadPackageListings = async () => {
    const res = await api.get(`/subscriptions/${subscriptionId}/listings`);
    setPackageListings(res.data || []);
    return res.data;
  };

  const loadAvailableListings = async (reset = false) => {
    if (loadingMore && !reset) return;
    setLoadingMore(true);

    try {
      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20,
        search: search || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      };
      const res = await api.get('/listings/my', { params });
      const data = res.data || [];
      if (reset) {
        setAvailableListings(data);
        setPage(1);
        setHasMore(data.length === params.limit);
      } else {
        setAvailableListings(prev => [...prev, ...data]);
        setHasMore(data.length === params.limit);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить объявления');
    } finally {
      setLoadingMore(false);
    }
  };

  // ===== ЭФФЕКТ ДЛЯ ФИЛЬТРОВ =====
  // При изменении фильтров сбрасываем список, страницу и выбранные ID
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setSelectedIds([]);
    loadAvailableListings(true);
  }, [search, filterType, filterStatus]);

  // Загрузка всех данных при входе на экран
  const loadAllData = async () => {
    setLoading(true);
    try {
      await loadSubscriptionInfo();
      await loadPackageListings();
      // Первый вызов с текущими фильтрами
      await loadAvailableListings(true);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [subscriptionId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Дебаунс для поиска
  const debouncedSearch = useDebounce((text) => {
    setSearch(text);
  }, 400);

  // ===== ВЫБОР ОБЪЯВЛЕНИЙ =====
  const toggleSelect = (id) => {
    if (!subscription) return;
    const maxSlots = subscription.max_slots || 10;
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= maxSlots) {
          Alert.alert('Достигнут лимит', `Можно выбрать не более ${maxSlots} объявлений`);
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const selectAll = () => {
    if (!subscription) return;
    const maxSlots = subscription.max_slots || 10;
    const currentSelected = selectedIds;
    const availableIds = availableListings.map(item => item.id);
    const newIds = availableIds.filter(id => !currentSelected.includes(id));
    const freeSlots = maxSlots - currentSelected.length;
    const toAdd = newIds.slice(0, freeSlots);
    if (toAdd.length === 0) {
      Alert.alert('Внимание', 'Нет свободных объявлений для добавления или лимит исчерпан');
    } else {
      setSelectedIds(prev => [...prev, ...toAdd]);
    }
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const selectFreeOnly = () => {
    if (!subscription) return;
    const maxSlots = subscription.max_slots || 10;
    const currentSelected = selectedIds;
    const alreadyInPackage = packageListings.map(item => item.id);
    const freeIds = availableListings
      .filter(item => !alreadyInPackage.includes(item.id))
      .map(item => item.id)
      .filter(id => !currentSelected.includes(id));
    const freeSlots = maxSlots - currentSelected.length;
    const toAdd = freeIds.slice(0, freeSlots);
    if (toAdd.length === 0) {
      Alert.alert('Внимание', 'Нет свободных объявлений для добавления или лимит исчерпан');
    } else {
      setSelectedIds(prev => [...prev, ...toAdd]);
    }
  };

  // ===== ДОБАВЛЕНИЕ ВЫБРАННЫХ =====
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
            try {
              let successCount = 0;
              let errorCount = 0;
              for (const id of selectedIds) {
                try {
                  await api.post(`/subscriptions/${subscriptionId}/listings`, { listingId: id });
                  successCount++;
                } catch (e) {
                  errorCount++;
                }
              }
              if (errorCount > 0) {
                Alert.alert('Частичный успех', `Добавлено ${successCount}, ошибок ${errorCount}`);
              } else {
                Alert.alert('Успех', `Добавлено ${successCount} объявлений`);
              }
              setSelectedIds([]);
              await loadPackageListings();
              await loadAvailableListings(true);
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось добавить объявления');
            }
          },
        },
      ]
    );
  };

  // ===== УДАЛЕНИЕ ИЗ ПАКЕТА =====
  const handleRemoveListing = (id, title) => {
    Alert.alert(
      'Удалить из пакета',
      `Удалить "${title}" из пакета?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/subscriptions/${subscriptionId}/listings/${id}`);
              Alert.alert('Успех', 'Объявление удалено из пакета');
              await loadPackageListings();
              await loadAvailableListings(true);
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить');
            }
          },
        },
      ]
    );
  };

  // ===== РЕНДЕР =====
  const renderPackageItem = ({ item }) => (
    <View style={styles.packageItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemPrice}>{item.price} ₽</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveListing(item.id, item.title)}
      >
        <Text style={styles.removeButtonText}>Удалить</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvailableItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const isInPackage = packageListings.some(p => p.id === item.id);
    const disabled = isInPackage;

    return (
      <TouchableOpacity
        style={[
          styles.availableItem,
          isSelected && styles.selectedItem,
          disabled && styles.disabledItem,
        ]}
        onPress={() => !disabled && toggleSelect(item.id)}
        disabled={disabled}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemPrice}>{item.price} ₽</Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
        {isInPackage && <Text style={styles.badge}>В пакете</Text>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  const maxSlots = subscription?.max_slots || 10;
  const usedSlots = packageListings.length;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Управление пакетом</Text>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Занято: {usedSlots} / {maxSlots} слотов
        </Text>
        <TouchableOpacity onPress={loadPackageListings}>
          <Text style={styles.refreshText}>Обновить</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Объявления в пакете</Text>
      {packageListings.length === 0 ? (
        <Text style={styles.emptyText}>Нет объявлений</Text>
      ) : (
        <FlatList
          data={packageListings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPackageItem}
          scrollEnabled={false}
          style={styles.packageList}
        />
      )}

      <Text style={styles.sectionTitle}>Доступные объявления</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Поиск по названию..."
        onChangeText={debouncedSearch}
      />
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
          Выбрано: {selectedIds.length} / {maxSlots - usedSlots}
        </Text>
        <View style={styles.selectionActions}>
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.actionText}>Все</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.actionText}>Снять</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={selectFreeOnly}>
            <Text style={styles.actionText}>Свободные</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={availableListings}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAvailableItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => loadAvailableListings(false)}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loadingMore && <ActivityIndicator style={styles.loader} />
        }
        style={styles.availableList}
      />

      <TouchableOpacity
        style={[
          styles.addButton,
          selectedIds.length === 0 && styles.disabledButton,
        ]}
        onPress={handleAddSelected}
        disabled={selectedIds.length === 0}
      >
        <Text style={styles.addButtonText}>
          Добавить выбранные ({selectedIds.length})
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginTop: 12,
    marginBottom: 8,
  },
  packageList: {
    marginBottom: 12,
  },
  packageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5ea',
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
    color: '#1c1c1e',
  },
  selectionActions: {
    flexDirection: 'row',
  },
  actionText: {
    color: '#007AFF',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  availableList: {
    flex: 1,
  },
  availableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  selectedItem: {
    backgroundColor: '#e0f0ff',
    borderColor: '#007AFF',
  },
  disabledItem: {
    opacity: 0.5,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    marginLeft: 8,
  },
  badge: {
    fontSize: 12,
    color: '#8e8e93',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginVertical: 10,
  },
  loader: {
    padding: 20,
  },
});