import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import api, { toggleFavorite } from '../services/api';
import { logout } from '../services/auth';
import { CachedImage } from '../components/CachedImage'; // 👈 новый импорт

const BASE_URL_IMAGES = 'https://ironads.ru';
const PAGE_SIZE = 20;

export default function HomeScreen() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState({});
  const abortControllerRef = useRef(null);
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();
  const route = useRoute();

  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    categoryName: '',
    regionId: '',
    regionName: '',
    priceFrom: '',
    priceTo: '',
    type: 'sell',
    sort: 'date_desc',
  });

  // ===== КАСТОМНЫЙ ХЕДЕР =====
  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <View
          style={[
            styles.customHeader,
            {
              backgroundColor: '#ffffff',
              borderBottomColor: '#e5e5ea',
              paddingTop: insets.top,
            },
          ]}
        >
          <Text style={styles.headerTitle}>IronAds</Text>
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => navigation.navigate('CreateListing')}
            >
              <Text style={styles.toolbarIcon}>➕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => navigation.navigate('Filters', { filters })}
            >
              <Text style={styles.toolbarIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Text style={styles.toolbarIcon}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => navigation.navigate('Chats')}
            >
              <Text style={styles.toolbarIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.toolbarIcon}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={async () => {
                await logout();
                navigation.replace('Auth');
              }}
            >
              <Text style={styles.toolbarIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      ),
      headerTitle: '',
      headerTransparent: false,
    });
  }, [navigation, filters, insets]);

  // ===== ЛОГИКА ЗАГРУЗКИ =====
  useEffect(() => {
    if (route.params?.filters) {
      setFilters(route.params.filters);
      setPage(1);
      setListings([]);
      setHasMore(true);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }
  }, [route.params?.filters]);

  const mergeListings = (existing, newItems) => {
    const validNewItems = newItems.filter(item => item && item.id != null);
    const existingIds = new Set(existing.map(item => item.id).filter(id => id != null));
    const uniqueNew = validNewItems.filter(item => !existingIds.has(item.id));
    if (uniqueNew.length !== validNewItems.length) {
      console.warn(`⚠️ Найдено ${validNewItems.length - uniqueNew.length} дублирующихся объявлений, они пропущены`);
    }
    return [...existing, ...uniqueNew];
  };

  const fetchListings = async (reset = false) => {
    if (reset) {
      setPage(1);
      setListings([]);
      setHasMore(true);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }
    const currentPage = reset ? 1 : page;
    if (!hasMore && !reset) return;
    if (loading) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = { limit: PAGE_SIZE, page: currentPage };
      if (filters.search) params.search = filters.search;
      if (filters.categoryId) params.category_id = filters.categoryId;
      if (filters.regionId) params.region_id = filters.regionId;
      if (filters.priceFrom) params.min_price = filters.priceFrom;
      if (filters.priceTo) params.max_price = filters.priceTo;
      if (filters.type && filters.type !== 'all') params.type = filters.type;
      if (filters.sort) params.sort = filters.sort;

      const response = await api.get('/listings/filter', { params, signal: controller.signal });
      const listingsData = response.data.listings || response.data;
      const pagination = response.data.pagination;

      const validListings = listingsData.filter(item => item && item.id != null);
      const newListings = validListings.map(item => ({
        ...item,
        is_favorite: item.is_favorite || false,
      }));

      const favMap = {};
      newListings.forEach(item => { favMap[item.id] = item.is_favorite; });

      if (reset) {
        setListings(newListings);
        setFavorites(favMap);
      } else {
        setListings(prev => mergeListings(prev, newListings));
        setFavorites(prev => ({ ...prev, ...favMap }));
      }

      if (pagination) {
        setHasMore(pagination.page < pagination.pages);
      } else {
        setHasMore(newListings.length === PAGE_SIZE);
      }
      setPage(currentPage + 1);
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        console.log('Запрос отменён');
        return;
      }
      console.error('❌ Ошибка загрузки:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    fetchListings(true);
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [filters]);

  useFocusEffect(useCallback(() => {}, []));

  const handleToggleFavorite = async (listingId) => {
    if (!listingId) return;
    const current = favorites[listingId];
    setFavorites(prev => ({ ...prev, [listingId]: !current }));
    try {
      const res = await toggleFavorite(listingId);
      setFavorites(prev => ({ ...prev, [listingId]: res.favorited }));
    } catch (err) {
      setFavorites(prev => ({ ...prev, [listingId]: current }));
      Alert.alert('Ошибка', 'Не удалось изменить избранное');
    }
  };

  const loadMore = () => { if (!loading && hasMore) fetchListings(); };
  const refreshListings = () => { setRefreshing(true); fetchListings(true); };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getImageUrl = (item) => {
    let url = null;
    if (item.first_media && item.first_media.file_path) url = item.first_media.file_path;
    else if (item.first_photo) url = item.first_photo;
    else if (item.media && item.media.length > 0 && item.media[0].file_path) url = item.media[0].file_path;
    if (url) return url.startsWith('http') ? url : BASE_URL_IMAGES + url;
    return null;
  };

  const renderItem = ({ item }) => {
    if (!item || !item.id) return null;

    const imageUrl = getImageUrl(item);
    const isFav = favorites[item.id] || false;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: '#ffffff', shadowColor: '#000' }]}
        onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {imageUrl ? (
            <CachedImage uri={imageUrl} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: '#f0f0f5' }]}>
              <Text style={styles.iconText}>{item.category_icon || '📄'}</Text>
            </View>
          )}
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: '#1c1c1e' }]} numberOfLines={2}>
              {item.title || 'Без названия'}
            </Text>
            <Text style={[styles.price, { color: '#007AFF' }]}>
              {item.price ? `${item.price} ₽` : 'Цена не указана'}
            </Text>
            {item.description && (
              <Text style={[styles.description, { color: '#6c6c70' }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: '#8e8e93' }]}>
                {item.city_name || item.city || 'Город не указан'}
              </Text>
              <Text style={[styles.metaText, { color: '#8e8e93' }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.favButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            onPress={() => handleToggleFavorite(item.id)}
          >
            <Text style={styles.favIcon}>{isFav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={[styles.footerText, { color: '#8e8e93' }]}>Загрузка...</Text>
      </View>
    );
  };

  if (loading && listings.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: '#f2f2f7' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: '#666' }]}>Загрузка объявлений...</Text>
      </View>
    );
  }

  if (error && listings.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: '#f2f2f7' }]}>
        <Text style={[styles.errorText, { color: 'red' }]}>Ошибка: {error}</Text>
        <TouchableOpacity onPress={refreshListings} style={[styles.retryButton, { backgroundColor: '#007AFF' }]}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f2f2f7' }]} edges={['left', 'right']}>
      <FlatList
        data={listings}
        keyExtractor={(item, index) => {
          return item && item.id != null ? String(item.id) : `fallback-${index}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={refreshListings}
        extraData={favorites}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  customHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 6,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toolbarButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  toolbarIcon: {
    fontSize: 22,
    color: '#1c1c1e',
  },
  list: { padding: 16 },
  card: {
    borderRadius: 12,
    marginBottom: 16,
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
    position: 'relative',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 40 },
  infoContainer: { flex: 1, justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  price: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  description: { fontSize: 14, marginBottom: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 12 },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 20,
    padding: 4,
    opacity: 0.9,
  },
  favIcon: { fontSize: 28 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  footerText: { marginLeft: 8, fontSize: 14 },
});