import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

export default function SubscriptionsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions/my');
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки подписок:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить подписки');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSubscriptions();
    }, [])
  );

  const handleCancel = async (id) => {
    Alert.alert(
      'Отмена подписки',
      'Вы уверены, что хотите отменить подписку?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отменить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/subscriptions/${id}/cancel`);
              Alert.alert('Успех', 'Подписка отменена');
              fetchSubscriptions();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось отменить подписку');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const endDate = new Date(item.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const used = item.listings_count || 0;
    const max = item.max_slots || 0;
    const percent = max > 0 ? (used / max) * 100 : 0;

    return (
      <View style={styles.card}>
        <Text style={styles.packageName}>
          {item.package_type === 'listing' && 'Продление'}
          {item.package_type === 'renewal' && 'Продление'}
          {item.package_type === 'autobump' && 'Автоподнятие'}
        </Text>

        <View style={styles.slotsContainer}>
          <Text style={styles.slotsText}>
            Занято: {used} / {max} слотов
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(percent, 100)}%` }]} />
          </View>
        </View>

        <Text style={styles.info}>
          Действует до: {new Date(item.end_date).toLocaleDateString()}
        </Text>
        <Text style={[styles.daysLeft, daysLeft < 3 && styles.daysWarning]}>
          {daysLeft > 0 ? `Осталось ${daysLeft} дней` : 'Истекла'}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('PackageListings', { subscriptionId: item.id })}
          >
            <Text style={styles.buttonText}>Управлять</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.renewButton}
            onPress={() => navigation.navigate('RenewPackage', { subscriptionId: item.id })}
          >
            <Text style={styles.buttonText}>Продлить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(item.id)}
          >
            <Text style={styles.buttonText}>Отменить</Text>
          </TouchableOpacity>
        </View>
      </View>
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

  if (subscriptions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>У вас нет активных подписок</Text>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => navigation.navigate('Plans')}
        >
          <Text style={styles.buyButtonText}>Купить подписку</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 }
        ]}
      />
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: insets.bottom + 20 }
        ]}
        onPress={() => navigation.navigate('Plans')}
      >
        <Text style={styles.fabText}>+ Тарифы</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  emptyText: { fontSize: 16, color: '#8e8e93', textAlign: 'center', marginBottom: 20 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  packageName: { fontSize: 18, fontWeight: '600', color: '#1c1c1e', marginBottom: 4 },
  slotsContainer: { marginVertical: 6 },
  slotsText: { fontSize: 14, color: '#6c6c70', marginBottom: 2 },
  progressBar: { height: 6, backgroundColor: '#e5e5ea', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 3 },
  info: { fontSize: 14, color: '#6c6c70', marginVertical: 2 },
  daysLeft: { fontSize: 14, fontWeight: '500', color: '#34c759', marginVertical: 6 },
  daysWarning: { color: '#ff3b30' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  manageButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, flex: 1, marginRight: 6, alignItems: 'center' },
  renewButton: { backgroundColor: '#34c759', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, flex: 1, marginHorizontal: 6, alignItems: 'center' },
  cancelButton: { backgroundColor: '#ff3b30', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, flex: 1, marginLeft: 6, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  buyButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});