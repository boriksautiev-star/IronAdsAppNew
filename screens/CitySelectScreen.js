// screens/CitySelectScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';

export default function CitySelectScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { regionId, onSelect } = route.params || {};

  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCityName, setManualCityName] = useState('');

  useEffect(() => {
    if (!regionId) {
      setError('Сначала выберите регион');
      setLoading(false);
      return;
    }
    fetchCities();
  }, [regionId]);

  const fetchCities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/cities?region_id=${regionId}&limit=1000`);
      let citiesData = response.data || [];
      // Если пришёл массив объектов с полем name
      if (Array.isArray(citiesData) && citiesData.length > 0) {
        citiesData.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        setCities(citiesData);
        setFilteredCities(citiesData);
      } else {
        // Если пусто или не массив – предлагаем ручной ввод
        setCities([]);
        setFilteredCities([]);
        setManualMode(true);
      }
    } catch (err) {
      console.error('Ошибка загрузки городов:', err);
      setError('Не удалось загрузить города');
      // Автоматически переключаем в ручной режим
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search.trim()) {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(search.toLowerCase().trim())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cities);
    }
  }, [search, cities]);

  const handleSelect = (city) => {
    if (onSelect) {
      onSelect({ id: city.id, name: city.name });
    }
    navigation.goBack();
  };

  const handleManualSelect = () => {
    const name = manualCityName.trim();
    if (!name) {
      Alert.alert('Внимание', 'Введите название города');
      return;
    }
    if (onSelect) {
      // Для ручного ввода id ставим 0 или null, чтобы сервер понимал, что это ручной ввод
      onSelect({ id: 0, name: name, manual: true });
    }
    navigation.goBack();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка городов...</Text>
      </View>
    );
  }

  // Если ошибка или нет городов – показываем ручной ввод
  if (error || (cities.length === 0 && !manualMode)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Города не найдены'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setManualMode(true);
          setError(null);
        }}>
          <Text style={styles.retryText}>Ввести вручную</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retryButton, { marginTop: 8, backgroundColor: '#e5e5ea' }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.retryText, { color: '#1c1c1e' }]}>Отмена</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (manualMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Введите город</Text>
        </View>
        <View style={styles.manualContainer}>
          <Text style={styles.manualHint}>Введите название города вручную:</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="Например: Владикавказ"
            value={manualCityName}
            onChangeText={setManualCityName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleManualSelect}
          />
          <TouchableOpacity style={styles.manualButton} onPress={handleManualSelect}>
            <Text style={styles.manualButtonText}>Выбрать</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.manualButton, styles.manualCancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.manualCancelButtonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Выбор города</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск города..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filteredCities.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Города не найдены</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setManualMode(true)}>
            <Text style={styles.retryText}>Ввести вручную</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginRight: 40, // чтобы компенсировать кнопку закрытия
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  searchInput: {
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  itemText: {
    fontSize: 16,
    color: '#1c1c1e',
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
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 16,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualHint: {
    fontSize: 16,
    textAlign: 'center',
    color: '#1c1c1e',
    marginBottom: 20,
  },
  manualInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  manualButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualCancelButton: {
    backgroundColor: '#e5e5ea',
  },
  manualCancelButtonText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '500',
  },
});