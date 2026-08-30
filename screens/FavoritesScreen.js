import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFavorites } from '../services/api';
import { CachedImage } from '../components/CachedImage';

const BASE_URL_IMAGES = 'https://ironads.ru';

export default function FavoritesScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFavorites();
      const validListings = data.filter(item => item && item.id != null);
      setListings(validListings);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки избранного');
      Alert.alert('Ошибка', 'Не удалось загрузить избранное');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getImageUrl = (item) => {
    let url = null;
    if (item.first_photo) {
      url = item.first_photo.startsWith('http')
        ? item.first_photo
        : BASE_URL_IMAGES + item.first_photo;
    } else if (item.first_media && item.first_media.file_path) {
      const path = item.first_media.file_path;
      url = path.startsWith('http') ? path : BASE_URL_IMAGES + path;
    } else if (item.media && Array.isArray(item.media) && item.media.length > 0) {
      const first = item.media[0];
      if (first.file_path) {
        const path = first.file_path;
        url = path.startsWith('http') ? path : BASE_URL_IMAGES + path;
      }
    }
    return url;
  };

  const renderItem = ({ item }) => {
    if (!item || !item.id) return null;

    const imageUrl = getImageUrl(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
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
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>{item.category_icon || '📄'}</Text>
            </View>
          )}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title || 'Без названия'}
            </Text>
            <Text style={styles.price}>
              {item.price ? `${item.price} ₽` : 'Цена не указана'}
            </Text>
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {item.city_name || item.city || 'Город не указан'}
              </Text>
              <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка избранного...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Ошибка: {error}</Text>
        <TouchableOpacity onPress={fetchFavorites} style={styles.retryButton}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>У вас пока нет избранных объявлений</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `fallback-${index}`)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 40,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#6c6c70',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});