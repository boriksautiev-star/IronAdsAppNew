import React, { useState, useEffect } from 'react';
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
import { useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function RenewPackageScreen() {
  const route = useRoute();
  const { subscriptionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [allListings, setAllListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Получаем информацию о пакете
      const subRes = await api.get(`/subscriptions/${subscriptionId}`);
      setSubscription(subRes.data);

      // Получаем все объявления пользователя
      const allRes = await api.get('/listings/my');
      setAllListings(allRes.data || []);

      // Предварительно выбираем те, что уже в пакете (через /listings)
      const packageListings = await api.get(`/subscriptions/${subscriptionId}/listings`);
      const ids = packageListings.data.map(l => l.id);
      setSelectedIds(ids);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные для продления');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [subscriptionId])
  );

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRenew = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одно объявление');
      return;
    }
    try {
      await api.post(`/subscriptions/${subscriptionId}/renew`, { listingIds: selectedIds });
      Alert.alert('Успех', 'Пакет продлён!');
      // Возвращаемся назад
      // navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось продлить');
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => toggleSelect(item.id)}
      >
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemPrice}>{item.price} ₽</Text>
        {isSelected && <Text style={styles.checkMark}>✓</Text>}
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Продление пакета</Text>
      <Text style={styles.subHeader}>Выберите объявления для продления</Text>
      <FlatList
        data={allListings}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity style={styles.renewButton} onPress={handleRenew}>
        <Text style={styles.renewButtonText}>Продлить выбранные ({selectedIds.length})</Text>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  itemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1c1c1e',
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 12,
  },
  checkMark: {
    fontSize: 18,
    color: '#007AFF',
  },
  renewButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  renewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});