// screens/OAuthScreen.js
import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { loginWithOAuth } from '../services/auth';
import { linkYandex, linkVk } from '../services/api';
import { useAuth } from '../context/AuthContext';

const OAUTH_URLS = {
  yandex: 'https://ironads.ru/auth/yandex',
  vk: 'https://ironads.ru/auth/vk',
};

export default function OAuthScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { provider, mode = 'login' } = route.params || {};
  const webViewRef = useRef(null);
  const { loadUser } = useAuth();

  if (!provider || !OAUTH_URLS[provider]) {
    Alert.alert('Ошибка', 'Некорректный провайдер');
    navigation.goBack();
    return null;
  }

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;
    console.log(`🔗 OAuth URL (${mode}):`, url);

    const tokenMatch = url.match(/[?&]token=([^&]+)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      console.log('🔑 Получен токен для входа:', token);
      await loginWithOAuth(token);
      await loadUser(); // Обновляем пользователя – навигатор автоматически переключится на Main
      // Не вызываем replace – навигатор переключится сам
      return;
    }

    const codeMatch = url.match(/[?&]code=([^&]+)/);
    if (codeMatch) {
      const code = codeMatch[1];
      console.log(`🔑 Получен код для ${provider}:`, code);

      if (mode === 'link') {
        try {
          if (provider === 'yandex') {
            await linkYandex(code);
          } else if (provider === 'vk') {
            await linkVk(code);
          }
          Alert.alert('Успех', 'Соцсеть привязана!');
          navigation.goBack();
        } catch (error) {
          console.error('❌ Ошибка привязки:', error);
          let msg = 'Не удалось привязать соцсеть.';
          if (error.response?.data?.error) {
            msg = error.response.data.error;
          }
          Alert.alert('Ошибка', msg);
          navigation.goBack();
        }
      } else {
        await loginWithOAuth(code);
        await loadUser(); // Обновляем пользователя – навигатор автоматически переключится на Main
        // Не вызываем replace
      }
      return;
    }

    if (url.includes('settings.html?linked=yandex') || url.includes('settings.html?linked=vk')) {
      Alert.alert('Успех', 'Соцсеть привязана!');
      navigation.goBack();
      return;
    }

    if (url.includes('https://ironads.ru/profile')) {
      Alert.alert('Успех', 'Соцсеть привязана!');
      navigation.goBack();
      return;
    }

    if (url.includes('https://ironads.ru') && !url.includes('/auth/')) {
      if (mode === 'login') {
        Alert.alert('Вход выполнен', 'Пожалуйста, войдите через логин и пароль.');
        navigation.goBack();
      }
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: OAUTH_URLS[provider] }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Загрузка страницы авторизации...</Text>
          </View>
        )}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
      />
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>Закрыть</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});