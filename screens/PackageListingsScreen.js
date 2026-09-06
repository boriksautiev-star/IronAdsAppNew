// screens/PackageListingsScreen.js
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
import { useTheme } from '../context/ThemeContext';

export default function PackageListingsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { subscriptionId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
        style={[
          styles.item,
          { backgroundColor: colors.card, borderColor: colors.border },
          isSelected && { borderColor: colors.primary, backgroundColor: colors.inputBackground },
        ]}
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
          <View style={[styles.itemImage, styles.placeholderImage, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.placeholderText, { color: colors.secondaryText }]}>📷</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{item.price} ₽</Text>
        </View>
        {selectionMode && (
          <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: colors.card }]}>
            {isSelected && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
          </View>
        )}
        {!selectionMode && (
          <TouchableOpacity
            style={[styles.removeBtn, isRemoving && styles.disabledBtn, { backgroundColor: '#ff3b30' }]}
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const maxSlots = subscription?.max_slots || 10;
  const usedSlots = listings.length;
  const freeSlots = maxSlots - usedSlots;
  const percentFilled = maxSlots > 0 ? (usedSlots / maxSlots) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Объявления в пакете</Text>

      <View style={[styles.slotsInfo, { backgroundColor: colors.card }]}>
        <Text style={[styles.slotsText, { color: colors.text }]}>
          Использовано {usedSlots} из {maxSlots} слотов
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
          <View style={[styles.progressFill, { width: `${Math.min(percentFilled, 100)}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.slotsFree, { color: colors.secondaryText }]}>Свободно: {freeSlots}</Text>
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.toolbarBtn, selectionMode && { backgroundColor: colors.primary }]}
          onPress={() => {
            if (selectionMode) {
              setSelectedIds([]);
              setSelectionMode(false);
            } else {
              setSelectionMode(true);
            }
          }}
        >
          <Text style={[styles.toolbarBtnText, selectionMode && { color: '#fff' }]}>
            {selectionMode ? 'Отмена' : 'Выбрать'}
          </Text>
        </TouchableOpacity>

        {selectionMode && (
          <>
            <TouchableOpacity style={styles.toolbarBtn} onPress={selectAll}>
              <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>Все</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={clearAll}>
              <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>Снять</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolbarBtn, styles.dangerBtn, selectedIds.length === 0 && styles.disabledBtn, { backgroundColor: '#ff3b30' }]}
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
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.secondaryText }]}>В пакете нет объявлений</Text>}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
      />

      <TouchableOpacity
        style={[
          styles.addButton,
          { backgroundColor: colors.primary },
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
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  slotsInfo: { borderRadius: 8, padding: 12, marginBottom: 12 },
  slotsText: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  slotsFree: { fontSize: 14, marginTop: 4 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 8, padding: 8, marginBottom: 12 },
  toolbarBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  toolbarBtnText: { fontSize: 14, fontWeight: '500' },
  dangerBtn: {},
  dangerText: { color: '#fff' },
  disabledBtn: { opacity: 0.5 },
  listContent: { paddingBottom: 20 },
  item: { flexDirection: 'row', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, alignItems: 'center' },
  itemImage: { width: 50, height: 50, borderRadius: 6, marginRight: 10 },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 20 },
  info: { flex: 1 },
  title: { fontSize: 16 },
  price: { fontSize: 14 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  checkmark: { fontSize: 18 },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, minWidth: 60, alignItems: 'center' },
  removeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 20 },
  addButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});