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
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function PlansScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [isPartner, setIsPartner] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      setIsPartner(userData.is_partner === true);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      const plansResponse = await api.get('/subscriptions/plans');
      let plansData = plansResponse.data || [];

      // ===== СТРАХОВОЧНАЯ ГРУППИРОВКА =====
      const plansByType = {};
      plansData.forEach(plan => {
        const key = plan.type;
        if (!plansByType[key] || plan.duration > plansByType[key].duration) {
          plansByType[key] = plan;
        }
      });
      const uniquePlans = Object.values(plansByType);
      if (uniquePlans.length < plansData.length) {
        console.warn('⚠️ Найдено несколько активных планов одного типа. Оставлены только с максимальным сроком.');
      }
      setPlans(uniquePlans);

      const subsResponse = await api.get('/subscriptions/my');
      setActiveSubscriptions(subsResponse.data || []);
    } catch (err) {
      console.error('❌ Ошибка загрузки данных:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const isPlanActive = (planType) => {
    return activeSubscriptions.some(
      (sub) => sub.package_type === planType && sub.is_active === true
    );
  };

  const getPlanDisplayName = (plan) => {
    if (plan.name) return plan.name;
    if (plan.type === 'listing') return 'Размещение';
    if (plan.type === 'renewal') return 'Продление';
    if (plan.type === 'autobump') return 'Автоподнятие';
    return plan.name || 'Тариф';
  };

  const getMaxSlots = (plan) => {
    return plan.max_slots || plan.slots || 5;
  };

  const handlePurchase = async (plan) => {
    Alert.alert(
      'Покупка подписки',
      `Вы уверены, что хотите приобрести "${getPlanDisplayName(plan)}" за ${plan.price} ₽?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Купить',
          onPress: async () => {
            try {
              await api.post('/subscriptions/purchase', { planId: plan.id });
              Alert.alert('Успех', 'Подписка приобретена!');
              fetchData();
              navigation.goBack();
            } catch (error) {
              Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось приобрести подписку');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isActive = isPlanActive(item.type);
    const maxSlots = getMaxSlots(item);
    const displayName = getPlanDisplayName(item);
    const buttonText = isActive ? 'Докупить' : (item.price === 0 ? 'Активировать' : 'Купить');

    const isPartnerPlan = item.is_partner === true || item.for_partner === true;

    return (
      <View style={[styles.card, isActive && styles.activeCard]}>
        <Text style={styles.planName}>{displayName}</Text>
        <Text style={styles.planPrice}>
          {item.price === 0 ? 'Бесплатно' : `${item.price} ₽`}
        </Text>
        <Text style={styles.planDuration}>Срок: {item.duration} дней</Text>
        <Text style={styles.planSlots}>
          {isPartnerPlan ? '🤝 Партнёрский тариф' : '📦 Объявлений в пакете:'} {maxSlots}
        </Text>
        <Text style={styles.planDescription}>{item.description || displayName}</Text>

        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>✅ Активен</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.buyButton]}
          onPress={() => handlePurchase(item)}
        >
          <Text style={styles.buyButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка тарифов...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: 'red' }]}>
          Ошибка загрузки: {error}
        </Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Text style={styles.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Нет доступных тарифов</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isPartner && (
        <View style={styles.partnerBanner}>
          <Text style={styles.partnerBannerText}>
            🤝 Вы партнёр. Вам доступны специальные условия.
          </Text>
        </View>
      )}

      <Text style={styles.header}>Выберите тариф</Text>

      <FlatList
        data={plans}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
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
    color: '#8e8e93',
    textAlign: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  partnerBanner: {
    backgroundColor: '#ffd60a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  partnerBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeCard: {
    borderColor: '#34c759',
    borderWidth: 2,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  planDuration: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  planSlots: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c1c1e',
    marginTop: 2,
  },
  planDescription: {
    fontSize: 14,
    color: '#6c6c70',
    marginTop: 4,
  },
  activeBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#34c759',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  buyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});