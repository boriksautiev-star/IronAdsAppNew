import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

const BASE_URL_IMAGES = 'https://ironads.ru';

export default function EditListingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [type, setType] = useState('sell');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityName, setCityName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [showTelegram, setShowTelegram] = useState(true);

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  useEffect(() => {
    fetchListing();
  }, []);

  const fetchListing = async () => {
    try {
      const response = await api.get(`/listings/${id}`);
      const data = response.data;
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPriceFrom(String(data.price || ''));
      setPriceTo(data.price_max ? String(data.price_max) : '');
      setType(data.type || 'sell');
      setCategoryId(data.category_id || '');
      setCategoryName(data.category_name || '');
      setCityId(data.city_id || '');
      setCityName(data.city_name || '');
      setPhone(data.phone || '');
      setWhatsapp(data.whatsapp || '');
      setTelegram(data.telegram || '');
      setShowPhone(data.show_phone !== undefined ? data.show_phone : true);
      setShowWhatsapp(data.show_whatsapp !== undefined ? data.show_whatsapp : true);
      setShowTelegram(data.show_telegram !== undefined ? data.show_telegram : true);
      setExistingImages(data.media || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось загрузить объявление');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = () => {
    navigation.navigate('CategorySelect', {
      selectedId: categoryId,
      onSelect: (category) => {
        setCategoryName(category.name);
        setCategoryId(category.id);
      },
    });
  };

  const selectCity = () => {
    navigation.navigate('CitySelect', {
      selectedId: cityId,
      onSelect: (city) => {
        setCityName(city.name);
        setCityId(city.id);
      },
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Нужно разрешение на доступ к галерее');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const newImagesArray = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || asset.type || 'image/jpeg',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
      }));
      setNewImages(prev => [...prev, ...newImagesArray].slice(0, 10 - existingImages.length));
    }
  };

  const removeNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите заголовок');
      return;
    }
    if (!priceFrom || isNaN(Number(priceFrom))) {
      Alert.alert('Ошибка', 'Введите корректную цену (от)');
      return;
    }
    if (!categoryId) {
      Alert.alert('Ошибка', 'Выберите категорию');
      return;
    }
    if (!cityId) {
      Alert.alert('Ошибка', 'Выберите город');
      return;
    }
    if (!phone.trim() && !whatsapp.trim() && !telegram.trim()) {
      Alert.alert('Ошибка', 'Укажите хотя бы один контакт');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('price', priceFrom);
    if (priceTo) formData.append('price_max', priceTo);
    formData.append('category_id', categoryId);
    formData.append('city_id', cityId);
    formData.append('type', type);
    formData.append('phone', phone.trim());
    formData.append('whatsapp', whatsapp.trim());
    formData.append('telegram', telegram.trim());
    formData.append('show_phone', String(showPhone));
    formData.append('show_whatsapp', String(showWhatsapp));
    formData.append('show_telegram', String(showTelegram));

    newImages.forEach((img, index) => {
      formData.append('media', { uri: img.uri, type: img.type, name: img.name });
    });

    setSaving(true);
    try {
      await api.put(`/listings/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Успех', 'Объявление обновлено');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      let errorMessage = 'Не удалось обновить объявление';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка объявления...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Заголовок *</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Продам iPhone 13"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Подробное описание"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Цена *</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceLabel}>от</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                keyboardType="numeric"
                value={priceFrom}
                onChangeText={setPriceFrom}
              />
            </View>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceLabel}>до</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="необязательно"
                keyboardType="numeric"
                value={priceTo}
                onChangeText={setPriceTo}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Тип</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, type === 'sell' && styles.segmentActive]}
              onPress={() => setType('sell')}
            >
              <Text style={[styles.segmentText, type === 'sell' && styles.segmentTextActive]}>Продажа</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, type === 'rent' && styles.segmentActive]}
              onPress={() => setType('rent')}
            >
              <Text style={[styles.segmentText, type === 'rent' && styles.segmentTextActive]}>Аренда</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Категория *</Text>
          <TouchableOpacity style={styles.selector} onPress={selectCategory}>
            <Text style={styles.selectorText}>{categoryName || 'Выбрать категорию'}</Text>
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Город *</Text>
          <TouchableOpacity style={styles.selector} onPress={selectCity}>
            <Text style={styles.selectorText}>{cityName || 'Выбрать город'}</Text>
            <Text style={styles.selectorArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Контакты *</Text>
          <TextInput
            style={styles.input}
            placeholder="Телефон"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="WhatsApp (номер)"
            keyboardType="phone-pad"
            value={whatsapp}
            onChangeText={setWhatsapp}
          />
          <TextInput
            style={styles.input}
            placeholder="Telegram (@username)"
            value={telegram}
            onChangeText={setTelegram}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Показывать телефон</Text>
            <Switch value={showPhone} onValueChange={setShowPhone} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Показывать WhatsApp</Text>
            <Switch value={showWhatsapp} onValueChange={setShowWhatsapp} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Показывать Telegram</Text>
            <Switch value={showTelegram} onValueChange={setShowTelegram} />
          </View>
        </View>

        {existingImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Текущие фото</Text>
            <View style={styles.imageList}>
              {existingImages.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: BASE_URL_IMAGES + img.file_path }}
                  style={styles.imagePreview}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Добавить новые фото (до 10 шт.)</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            <Text style={styles.imagePickerText}>📸 Выбрать фото</Text>
          </TouchableOpacity>
          <View style={styles.imageList}>
            {newImages.map((img, index) => (
              <View key={index} style={styles.imageItem}>
                <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeNewImage(index)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Сохранить изменения</Text>}
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
  content: {
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1c1e',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginRight: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#8e8e93',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#1c1c1e',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e5e5ea',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8e8e93',
  },
  segmentTextActive: {
    color: '#007AFF',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  selectorArrow: {
    fontSize: 24,
    color: '#c7c7cc',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  imagePickerButton: {
    backgroundColor: '#e5e5ea',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#007AFF',
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  imageItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(255,0,0,0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});