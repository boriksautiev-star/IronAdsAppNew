import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { logout } from '../services/auth';
import { CachedImage } from '../components/CachedImage';

const BASE_URL_IMAGES = 'https://ironads.ru';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [archivedListings, setArchivedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Chats')}
          style={{ marginRight: 16 }}
        >
          <Text style={{ fontSize: 24 }}>💬</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.error('Ошибка загрузки пользователя:', e);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const [activeRes, archivedRes] = await Promise.all([
        api.get('/listings/my'),
        api.get('/listings/my/archived'),
      ]);
      setMyListings(activeRes.data || []);
      setArchivedListings(archivedRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки объявлений:', err);
      Alert.alert('Ошибка', 'Не удалось загрузить ваши объявления');
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserData(), fetchListings()]);
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshAll();
    }, [])
  );

  // ===== ДЕЙСТВИЯ С ОБЪЯВЛЕНИЯМИ =====
  const handleArchive = async (id) => {
    Alert.alert(
      'Архивировать',
      'Переместить объявление в архив?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Архивировать',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.post(`/listings/${id}/archive`);
              await fetchListings();
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось заархивировать');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (id) => {
    setActionLoading(true);
    try {
      await api.post(`/listings/${id}/restore`);
      await fetchListings();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось восстановить');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBump = async (id) => {
    setActionLoading(true);
    try {
      await api.post(`/listings/${id}/bump`);
      Alert.alert('Успех', 'Объявление поднято!');
      await fetchListings();
    } catch (err) {
      const msg = err.response?.data?.error || 'Не удалось поднять';
      Alert.alert('Ошибка', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePermanent = async (id) => {
    Alert.alert(
      'Удалить навсегда',
      'Вы уверены? Это действие необратимо.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/my/${id}/permanent`);
              await fetchListings();
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось удалить');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const renderListingItem = ({ item }) => {
    const imageUrl = item.first_media?.file_path
      ? BASE_URL_IMAGES + item.first_media.file_path
      : null;

    const isArchived = item.status === 'archived';

    return (
      <View style={styles.listingCard}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
          disabled={actionLoading}
        >
          {imageUrl ? (
            <CachedImage
              uri={imageUrl}
              style={styles.listingImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.listingImage, { backgroundColor: '#e0e0e0' }]} />
          )}
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.listingPrice}>{item.price} ₽</Text>
            <Text style={styles.listingMeta}>
              {item.city_name || 'Город не указан'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => navigation.navigate('EditListing', { id: item.id })}
            disabled={actionLoading}
          >
            <Text style={styles.actionIconText}>✏️</Text>
          </TouchableOpacity>

          {isArchived ? (
            <>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleRestore(item.id)}
                disabled={actionLoading}
              >
                <Text style={styles.actionIconText}>↩️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionIcon, styles.dangerIcon]}
                onPress={() => handleDeletePermanent(item.id)}
                disabled={actionLoading}
              >
                <Text style={styles.actionIconText}>🗑️</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleBump(item.id)}
                disabled={actionLoading}
              >
                <Text style={styles.actionIconText}>⬆️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleArchive(item.id)}
                disabled={actionLoading}
              >
                <Text style={styles.actionIconText}>📁</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка профиля...</Text>
      </View>
    );
  }

  const currentListings = activeTab === 'active' ? myListings : archivedListings;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
        }
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{user?.username || 'Пользователь'}</Text>
            {user?.is_partner === true && (
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerBadgeText}>🤝 Партнёр</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
          {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
        </View>

        <View style={styles.actionsVertical}>
          <TouchableOpacity
            style={styles.actionButtonVertical}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.actionButtonText}>✏️ Редактировать профиль</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonVertical}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.actionButtonText}>📜 История просмотров</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonVertical}
            onPress={() => navigation.navigate('Subscriptions')}
          >
            <Text style={styles.actionButtonText}>💳 Подписки</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{myListings.length}</Text>
            <Text style={styles.statLabel}>Активных</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{archivedListings.length}</Text>
            <Text style={styles.statLabel}>В архиве</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Активные
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'archived' && styles.tabActive]}
            onPress={() => setActiveTab('archived')}
          >
            <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
              Архив
            </Text>
          </TouchableOpacity>
        </View>

        {currentListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'У вас нет активных объявлений' : 'Архив пуст'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={currentListings}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderListingItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            extraData={actionLoading}
          />
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Выйти</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
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
  userInfo: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginRight: 6,
  },
  partnerBadge: {
    backgroundColor: '#34c759',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 4,
  },
  partnerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 2,
  },
  actionsVertical: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    marginTop: 10,
  },
  actionButtonVertical: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    marginTop: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  statLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8e8e93',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  listContainer: {
    padding: 16,
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 10,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  listingPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 2,
  },
  listingMeta: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionIcon: {
    padding: 6,
    marginLeft: 8,
  },
  actionIconText: {
    fontSize: 20,
  },
  dangerIcon: {},
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  logoutButton: {
    margin: 20,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ff3b30',
    fontSize: 18,
    fontWeight: '600',
  },
});