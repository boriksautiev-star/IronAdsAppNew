// screens/HistoryScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useCachedListings } from '../context/CachedListingsContext';
import { getImageUrl } from '../utils/imageUtils';
import { CachedImage } from '../components/CachedImage';
import { useTheme } from '../context/ThemeContext';
import LoadingIndicator from '../components/LoadingIndicator';

export default function HistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getCached } = useCachedListings();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/listings/history/my');
      const data = Array.isArray(response.data) ? response.data : (response.data.history || []);
      setHistory(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchHistory();
    }, [])
  );

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

  const handleDeleteHistoryItem = (viewId) => {
    if (!viewId) return;
    Alert.alert(
      'Удалить запись',
      'Вы уверены, что хотите удалить эту запись из истории?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/listings/history/${viewId}`);
              setHistory(prev => prev.filter(item => item.view_id !== viewId));
            } catch (err) {
              console.error(err);
              Alert.alert('Ошибка', 'Не удалось удалить запись');
            }
          },
        },
      ]
    );
  };

  const clearHistory = () => {
    Alert.alert(
      'Очистить историю',
      'Вы уверены, что хотите удалить всю историю просмотров?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/listings/history/clear');
              setHistory([]);
            } catch (err) {
              console.error(err);
              Alert.alert('Ошибка', 'Не удалось очистить историю');
            }
          },
        },
      ]
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={clearHistory} style={{ marginRight: 16 }}>
          <Text style={{ fontSize: 18, color: colors.primary }}>Очистить</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);

  const renderItem = ({ item }) => {
    const imageUrl = getImageUrlWithCache(item);
    const viewId = item.view_id;
    const title = item.title || 'Без названия';
    const price = item.price ? `${item.price} ₽` : 'Цена не указана';
    const city = item.city_name || item.city || 'Город не указан';
    const viewedAt = item.viewed_at ? new Date(item.viewed_at).toLocaleDateString('ru-RU') : 'Дата неизвестна';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
        onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
        onLongPress={() => viewId && handleDeleteHistoryItem(viewId)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {imageUrl ? (
            <CachedImage
              uri={imageUrl}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.inputBackground }]} />
          )}
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>{price}</Text>
            <Text style={[styles.meta, { color: colors.secondaryText }]}>{city}</Text>
            <Text style={[styles.date, { color: colors.secondaryText }]}>Просмотрено: {viewedAt}</Text>
          </View>
          {viewId && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteHistoryItem(viewId)}>
              <Text style={[styles.deleteButtonText, { color: '#ff3b30' }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingIndicator size={60} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Вы ещё не просматривали объявления</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => String(item.view_id || item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { borderRadius: 10, marginBottom: 10, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardContent: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  image: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  meta: { fontSize: 14, marginTop: 2 },
  date: { fontSize: 12, marginTop: 2 },
  deleteButton: { padding: 8, marginLeft: 8 },
  deleteButtonText: { fontSize: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
});