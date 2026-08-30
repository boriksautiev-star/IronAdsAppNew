import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useCachedListings } from '../context/CachedListingsContext';
import { getImageUrl } from '../utils/imageUtils';
import { CachedImage } from '../components/CachedImage';

export default function PackageListingsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { subscriptionId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [removingIds, setRemovingIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const { getCached } = useCachedListings();

  const loadData = async () => {
    try {
      const [subRes, listRes] = await Promise.all([
        api.get(`/subscriptions/${subscriptionId}`),
        api.get(`/subscriptions/${subscriptionId}/listings`),
      ]);
      setSubscription(subRes.data);
      setListings(listRes.data || []);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные пакета');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        setSelectionMode(false);
        setSelectedIds([]);
      };
    }, [subscriptionId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  const handleRemoveSingle = async (id, title) => {
    Alert.alert(
      'Удалить из пакета',
      `Удалить "${title}" из пакета?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setRemovingIds(prev => [...prev, id]);
            try {
              await api.delete(`/subscriptions/${subscriptionId}/listings/${id}`);
              Alert.alert('Успех', 'Объявление удалено из пакета');
              setListings(prev => prev.filter(item => item.id !== id));
              const subRes = await api.get(`/subscriptions/${subscriptionId}`);
              setSubscription(subRes.data);
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить объявление');
            } finally {
              setRemovingIds(prev => prev.filter(rid => rid !== id));
            }
          },
        },
      ]
    );
  };

  const handleRemoveSelected = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Внимание', 'Выберите хотя бы одно объявление');
      return;
    }
    Alert.alert(
      'Подтверждение',
      `Удалить ${selectedIds.length} объявлений из пакета?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setRemovingIds(prev => [...prev, ...selectedIds]);
            let success = 0, errors = 0;
            for (const id of selectedIds) {
              try {
                await api.delete(`/subscriptions/${subscriptionId}/listings/${id}`);
                success++;
              } catch (e) {
                errors++;
              }
            }
            setRemovingIds(prev => prev.filter(id => !selectedIds.includes(id)));
            if (errors > 0) {
              Alert.alert('Частичный успех', `Удалено ${success}, ошибок ${errors}`);
            } else {
              Alert.alert('Успех', `Удалено ${success} объявлений`);
            }
            setListings(prev => prev.filter(item => !selectedIds.includes(item.id)));
            const subRes = await api.get(`/subscriptions/${subscriptionId}`);
            setSubscription(subRes.data);
            setSelectedIds([]);
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = listings.map(item => item.id);
    setSelectedIds(allIds);
  };

  const clearAll = () => setSelectedIds([]);

  const renderItem = ({ item }) => {
    const isRemoving = removingIds.includes(item.id);
    const isSelected = selectedIds.includes(item.id);
    const imageUrl = getImageUrlWithCache(item);

    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => {
          if (selectionMode) {
            toggleSelect(item.id);
          }
        }}
        disabled={!selectionMode}
        activeOpacity={selectionMode ? 0.7 : 1}
      >
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
        {selectionMode && (
          <View style={styles.checkbox}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {!selectionMode && (
          <TouchableOpacity
            style={[styles.removeBtn, isRemoving && styles.disabledBtn]}
            onPress={() => handleRemoveSingle(item.id, item.title)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.removeText}>Удалить</Text>
            )}
          </TouchableOpacity>
        )}
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

  const maxSlots = subscription?.max_slots || 10;
  const usedSlots = listings.length;
  const freeSlots = maxSlots - usedSlots;
  const percentFilled = maxSlots > 0 ? (usedSlots / maxSlots) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Объявления в пакете</Text>

      <View style={styles.slotsInfo}>
        <Text style={styles.slotsText}>
          Использовано {usedSlots} из {maxSlots} слотов
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(percentFilled, 100)}%` }]} />
        </View>
        <Text style={styles.slotsFree}>Свободно: {freeSlots}</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, selectionMode && styles.toolbarBtnActive]}
          onPress={() => {
            if (selectionMode) {
              setSelectedIds([]);
              setSelectionMode(false);
            } else {
              setSelectionMode(true);
            }
          }}
        >
          <Text style={[styles.toolbarBtnText, selectionMode && styles.toolbarBtnTextActive]}>
            {selectionMode ? 'Отмена' : 'Выбрать'}
          </Text>
        </TouchableOpacity>

        {selectionMode && (
          <>
            <TouchableOpacity style={styles.toolbarBtn} onPress={selectAll}>
              <Text style={styles.toolbarBtnText}>Все</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={clearAll}>
              <Text style={styles.toolbarBtnText}>Снять</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolbarBtn, styles.dangerBtn, selectedIds.length === 0 && styles.disabledBtn]}
              onPress={handleRemoveSelected}
              disabled={selectedIds.length === 0}
            >
              <Text style={[styles.toolbarBtnText, styles.dangerText]}>
                Удалить ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `fallback-${index}`)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>В пакете нет объявлений</Text>}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
      />

      <TouchableOpacity
        style={[
          styles.addButton,
          { bottom: insets.bottom + 20 }
        ]}
        onPress={() => navigation.navigate('AvailableListings', { subscriptionId })}
      >
        <Text style={styles.addButtonText}>+ Добавить объявления</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  slotsInfo: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  slotsText: { fontSize: 14, fontWeight: '500', color: '#1c1c1e', marginBottom: 4 },
  progressBar: { height: 8, backgroundColor: '#e5e5ea', borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  slotsFree: { fontSize: 14, color: '#8e8e93', marginTop: 4 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 12 },
  toolbarBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  toolbarBtnActive: { backgroundColor: '#007AFF' },
  toolbarBtnText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  toolbarBtnTextActive: { color: '#fff' },
  dangerBtn: { backgroundColor: '#ff3b30' },
  dangerText: { color: '#fff' },
  disabledBtn: { opacity: 0.5 },
  listContent: { padding: 16 },
  item: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 6, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  selectedItem: { borderColor: '#007AFF', backgroundColor: '#e0f0ff' },
  itemImage: { width: 50, height: 50, borderRadius: 6, marginRight: 10 },
  placeholderImage: { backgroundColor: '#e5e5ea', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 20, color: '#8e8e93' },
  info: { flex: 1 },
  title: { fontSize: 16 },
  price: { fontSize: 14, color: '#007AFF' },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8, backgroundColor: '#fff' },
  checkmark: { fontSize: 18, color: '#007AFF' },
  removeBtn: { backgroundColor: '#ff3b30', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, minWidth: 60, alignItems: 'center' },
  removeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 20, color: '#8e8e93' },
  addButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});