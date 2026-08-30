import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import api from '../services/api';

export default function CitySelectScreen({ navigation, route }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(route.params?.selectedId || null);
  const [parentId, setParentId] = useState(route.params?.parentId || null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCityName, setManualCityName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    fetchItems(parentId);
  }, [parentId]);

  const fetchItems = async (regionId) => {
    setLoading(true);
    setManualMode(false);
    try {
      let url;
      if (regionId) {
        url = `/cities/by-region/${regionId}`;
      } else {
        url = '/cities/regions/all';
      }
      console.log('📡 Запрос:', url);
      const response = await api.get(url);
      console.log('✅ Ответ (сырые данные):', response.data);

      if (!Array.isArray(response.data) || response.data.length === 0) {
        if (regionId) {
          const region = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;
          if (region) {
            setSelectedRegion(region);
            setManualMode(true);
            setItems([]);
          } else {
            Alert.alert('Ошибка', 'Не удалось загрузить города. Введите название вручную.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          }
        } else {
          Alert.alert('Ошибка', 'Не удалось загрузить список регионов');
          setItems([]);
        }
        setLoading(false);
        return;
      }

      setItems(response.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      if (regionId) {
        const region = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;
        if (region) {
          setSelectedRegion(region);
          setManualMode(true);
          setItems([]);
        } else {
          Alert.alert('Ошибка', 'Не удалось загрузить данные');
          navigation.goBack();
        }
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить список регионов');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (item) => {
    if (manualMode) return;
    setLoadingChildren(true);

    // Если мы уже на уровне городов – выбираем город
    if (breadcrumb.length > 0) {
      setSelectedId(item.id);
      if (route.params?.onSelect) {
        route.params.onSelect({ id: item.id, name: item.name });
      }
      navigation.goBack();
      setLoadingChildren(false);
      return;
    }

    // Иначе это регион – загружаем города
    try {
      const url = `/cities/by-region/${item.id}`;
      console.log('📡 Запрос городов для региона:', item.id, url);
      const response = await api.get(url);
      let cities = response.data || [];

      if (!Array.isArray(cities) || cities.length === 0) {
        setSelectedRegion(item);
        setManualMode(true);
        setItems([]);
        setLoadingChildren(false);
        return;
      }

      if (cities.length > 0 && cities[0].region_id !== undefined) {
        const filtered = cities.filter(city => city.region_id === item.id);
        cities = filtered;
      }

      if (cities.length > 0) {
        setParentId(item.id);
        setBreadcrumb([...breadcrumb, item]);
        setItems(cities);
        setManualMode(false);
      } else {
        setSelectedRegion(item);
        setManualMode(true);
        setItems([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки городов:', err);
      setSelectedRegion(item);
      setManualMode(true);
      setItems([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleManualSelect = () => {
    const name = manualCityName.trim();
    if (!name) {
      Alert.alert('Внимание', 'Введите название города');
      return;
    }
    if (route.params?.onSelect) {
      const region = selectedRegion || (breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null);
      route.params.onSelect({
        id: region ? region.id : null,
        name: name,
        manual: true,
      });
    }
    navigation.goBack();
  };

  const goBackLevel = () => {
    if (manualMode) {
      setManualMode(false);
      setManualCityName('');
      setSelectedRegion(null);
      if (breadcrumb.length > 0) {
        const newBreadcrumb = [...breadcrumb];
        newBreadcrumb.pop();
        const prev = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null;
        setBreadcrumb(newBreadcrumb);
        setParentId(prev ? prev.id : null);
      } else {
        navigation.goBack();
      }
      return;
    }

    const newBreadcrumb = [...breadcrumb];
    newBreadcrumb.pop();
    const prev = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null;
    setBreadcrumb(newBreadcrumb);
    setParentId(prev ? prev.id : null);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, selectedId === item.id && styles.itemSelected]}
      onPress={() => handleSelect(item)}
      disabled={loadingChildren || manualMode}
    >
      <Text style={styles.itemName}>{item.name}</Text>
      {loadingChildren ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <Text style={styles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );

  // ===== КНОПКА "ВВЕСТИ ВРУЧНУЮ" =====
  const renderManualButton = () => {
    if (manualMode) return null;
    if (breadcrumb.length === 0) return null; // показываем только когда есть города
    return (
      <TouchableOpacity style={styles.manualButton} onPress={() => setManualMode(true)}>
        <Text style={styles.manualButtonText}>✏️ Ввести вручную</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (manualMode) {
            setManualMode(false);
            setManualCityName('');
            setSelectedRegion(null);
            if (breadcrumb.length > 0) {
              const newBreadcrumb = [...breadcrumb];
              newBreadcrumb.pop();
              const prev = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null;
              setBreadcrumb(newBreadcrumb);
              setParentId(prev ? prev.id : null);
            } else {
              setParentId(null);
              fetchItems(null);
            }
          } else {
            navigation.goBack();
          }
        }} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {manualMode
            ? 'Введите город'
            : (breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Выбор города')
          }
        </Text>
        {breadcrumb.length > 0 && !manualMode && (
          <TouchableOpacity onPress={goBackLevel} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        {manualMode && (
          <TouchableOpacity onPress={() => {
            setManualMode(false);
            setManualCityName('');
            setSelectedRegion(null);
            if (breadcrumb.length > 0) {
              const newBreadcrumb = [...breadcrumb];
              newBreadcrumb.pop();
              const prev = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null;
              setBreadcrumb(newBreadcrumb);
              setParentId(prev ? prev.id : null);
            } else {
              setParentId(null);
              fetchItems(null);
            }
          }} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
      </View>

      {loadingChildren && !manualMode && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      )}

      {manualMode ? (
        <View style={styles.manualContainer}>
          <Text style={styles.manualHint}>
            {selectedRegion
              ? `Введите город для региона "${selectedRegion.name}":`
              : 'Введите название города вручную:'}
          </Text>
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
            onPress={() => {
              setManualMode(false);
              setManualCityName('');
              setSelectedRegion(null);
              if (breadcrumb.length > 0) {
                const newBreadcrumb = [...breadcrumb];
                newBreadcrumb.pop();
                const prev = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : null;
                setBreadcrumb(newBreadcrumb);
                setParentId(prev ? prev.id : null);
              } else {
                setParentId(null);
                fetchItems(null);
              }
            }}
          >
            <Text style={styles.manualCancelButtonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item, index) => (item.id ? String(item.id) : `fallback-${index}`)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListFooterComponent={renderManualButton}
          />
        </>
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
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  itemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: '#1c1c1e',
  },
  arrow: {
    fontSize: 24,
    color: '#c7c7cc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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