import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { toggleFavorite, checkFavorite, createChat } from '../services/api';
import { useCachedListings } from '../context/CachedListingsContext';
import { getImageUrl } from '../utils/imageUtils';
import { CachedImage } from '../components/CachedImage';

const BASE_URL_IMAGES = 'https://ironads.ru';
const { width: screenWidth } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { updateCache } = useCachedListings();
  const insets = useSafeAreaInsets();

  // Константа отступа для системных кнопок Android
  const BOTTOM_OFFSET = Platform.OS === 'android' ? 30 : 20;

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const response = await api.get(`/listings/${id}`);
      const data = response.data;
      updateCache(data);
      setListing(data);
      try {
        const favRes = await checkFavorite(id);
        setFavorited(favRes.favorited);
      } catch (e) {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) {
      Alert.alert('Ошибка', 'Некорректный ID объявления');
      return;
    }
    try {
      const res = await toggleFavorite(id);
      setFavorited(res.favorited);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось изменить избранное');
    }
  };

  const handleCall = () => {
    const phone = listing?.phone || listing?.user_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Номер не указан');
    }
  };

  const handleWhatsApp = () => {
    const whatsapp = listing?.whatsapp || listing?.user_whatsapp;
    if (whatsapp) {
      Linking.openURL(`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`);
    } else {
      Alert.alert('WhatsApp не указан');
    }
  };

  const handleTelegram = () => {
    const telegram = listing?.telegram || listing?.user_telegram;
    if (telegram) {
      Linking.openURL(`https://t.me/${telegram.replace('@', '')}`);
    } else {
      Alert.alert('Telegram не указан');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${listing.title} - ${listing.price} ₽\n${BASE_URL_IMAGES}/listing/${listing.id}`,
      });
    } catch (e) {}
  };

  const handleWriteToSeller = async () => {
    if (!listing?.id) {
      Alert.alert('Ошибка', 'Объявление не найдено');
      return;
    }
    setCreatingChat(true);
    try {
      const response = await createChat(listing.id);
      const chatId = response.id;
      if (chatId) {
        navigation.replace('ChatDetail', { chatId });
      } else {
        Alert.alert('Ошибка', 'Не удалось создать чат');
      }
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      let errorMessage = 'Не удалось создать чат';
      if (error.response?.data?.error) {
        errorMessage = typeof error.response.data.error === 'string'
          ? error.response.data.error
          : JSON.stringify(error.response.data.error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setCreatingChat(false);
    }
  };

  const handleScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка объявления...</Text>
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Ошибка: {error || 'Объявление не найдено'}</Text>
      </View>
    );
  }

  const media = listing.media || [];
  const totalPhotos = media.length;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: 0 }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + BOTTOM_OFFSET },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          {totalPhotos > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScrollEnd}
              >
                {media.map((item, index) => (
                  <CachedImage
                    key={index}
                    uri={BASE_URL_IMAGES + item.file_path}
                    style={styles.fullImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentImageIndex + 1} / {totalPhotos}
                </Text>
              </View>
              <View style={styles.dotsContainer}>
                {media.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentImageIndex === index && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>Фото отсутствуют</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{listing.price} ₽</Text>
          {listing.price_max && (
            <Text style={styles.priceMax}>до {listing.price_max} ₽</Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {listing.city_name || listing.city || 'Город не указан'}
            </Text>
            <Text style={styles.meta}>
              {new Date(listing.created_at).toLocaleDateString('ru-RU')}
            </Text>
          </View>
          {listing.category_name && (
            <Text style={styles.category}>
              {listing.category_icon || ''} {listing.category_name}
            </Text>
          )}
          {listing.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          )}

          {(listing.phone || listing.whatsapp || listing.telegram) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Контакты</Text>
              <View style={styles.contactsRow}>
                {listing.phone && (
                  <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                    <Text style={styles.contactButtonText}>📞 Позвонить</Text>
                  </TouchableOpacity>
                )}
                {listing.whatsapp && (
                  <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
                    <Text style={styles.contactButtonText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                )}
                {listing.telegram && (
                  <TouchableOpacity style={styles.contactButton} onPress={handleTelegram}>
                    <Text style={styles.contactButtonText}>✈️ Telegram</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.writeButton, creatingChat && styles.writeButtonDisabled]}
              onPress={handleWriteToSeller}
              disabled={creatingChat}
            >
              {creatingChat ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.writeButtonText}>✉️ Написать продавцу</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
              <Text style={styles.actionButtonText}>
                {favorited ? '❤️ В избранном' : '🤍 В избранное'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionButtonText}>📤 Поделиться</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Дополнительный отступ в конце для гарантии */}
        <View style={{ height: insets.bottom + BOTTOM_OFFSET }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
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
  },
  imageContainer: {
    width: screenWidth,
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
  },
  fullImage: {
    width: screenWidth,
    height: 300,
  },
  noImage: {
    width: screenWidth,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  noImageText: {
    color: '#888',
    fontSize: 16,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  priceMax: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: '#6c6c70',
  },
  category: {
    fontSize: 14,
    color: '#6c6c70',
    marginBottom: 8,
  },
  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1c1c1e',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: '#3a3a3c',
  },
  contactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  contactButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 10,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  writeButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeButtonDisabled: {
    backgroundColor: '#a8d5b0',
  },
  writeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
});