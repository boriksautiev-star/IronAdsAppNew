import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import api, { getUnreadCount } from '../services/api';

export default function ChatsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('active');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const getUserId = async () => {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setCurrentUserId(user.id);
      }
    };
    getUserId();
  }, []);

  const updateBadgeLocal = async () => {
    try {
      const data = await getUnreadCount();
      await Notifications.setBadgeCountAsync(data.count || 0);
    } catch (e) {}
  };

  const fetchChats = async (tab = activeTab) => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const endpoint = tab === 'active' ? '/chats' : '/chats/archived';
      const response = await api.get(endpoint);
      const chatsData = Array.isArray(response.data) ? response.data : [];
      const enrichedChats = chatsData.map(chat => {
        const isBuyer = chat.buyer_id === currentUserId;
        const otherName = isBuyer ? chat.seller_name : chat.buyer_name;
        const otherId = isBuyer ? chat.seller_id : chat.buyer_id;
        const unread = parseInt(chat.unread_count) || 0;
        const lastMessage = chat.listing_title || 'Чат без объявления';
        return {
          ...chat,
          otherName,
          otherId,
          unread,
          lastMessage,
          lastActivity: chat.updated_at || chat.created_at,
        };
      });
      setChats(enrichedChats);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось загрузить чаты');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (currentUserId) {
        fetchChats(activeTab);
        updateBadgeLocal();
      }
    }, [currentUserId, activeTab])
  );

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
  };

  const handleArchive = async (chatId) => {
    try {
      await api.post(`/chats/${chatId}/archive`);
      Alert.alert('Успех', 'Чат архивирован');
      fetchChats(activeTab);
      updateBadgeLocal();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось архивировать чат');
    }
  };

  const handleRestore = async (chatId) => {
    try {
      await api.post(`/chats/${chatId}/restore`);
      Alert.alert('Успех', 'Чат восстановлен');
      fetchChats(activeTab);
      updateBadgeLocal();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось восстановить чат');
    }
  };

  const handleDelete = async (chatId) => {
    Alert.alert(
      'Удалить чат',
      'Вы уверены, что хотите удалить этот чат? Это действие необратимо.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/chats/${chatId}`);
              Alert.alert('Успех', 'Чат удалён');
              fetchChats(activeTab);
              updateBadgeLocal();
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось удалить чат');
            }
          },
        },
      ]
    );
  };

  const handleLongPress = (item) => {
    const isArchived = activeTab === 'archived';
    const actions = [
      {
        text: isArchived ? 'Восстановить' : 'Архивировать',
        onPress: isArchived
          ? () => handleRestore(item.id)
          : () => handleArchive(item.id),
      },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => handleDelete(item.id),
      },
      { text: 'Отмена', style: 'cancel' },
    ];
    Alert.alert(
      `Чат с ${item.otherName}`,
      'Выберите действие',
      actions,
      { cancelable: true }
    );
  };

  const renderItem = ({ item }) => {
    const name = item.otherName || 'Пользователь';
    const lastMsg = item.lastMessage || 'Нет сообщений';
    const unread = item.unread || 0;
    const time = item.lastActivity
      ? new Date(item.lastActivity).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMsg}
          </Text>
          {time ? <Text style={styles.chatTime}>{time}</Text> : null}
        </View>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка чатов...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => handleTabSwitch('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Активные
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'archived' && styles.tabActive]}
          onPress={() => handleTabSwitch('archived')}
        >
          <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
            Архив
          </Text>
        </TouchableOpacity>
      </View>

      {chats.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {activeTab === 'active'
              ? 'У вас нет активных чатов'
              : 'Архив пуст'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchChats(activeTab);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
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
  listContent: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  chatTime: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 18,
    color: '#8e8e93',
    textAlign: 'center',
  },
});