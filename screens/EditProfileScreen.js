import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { unlinkSocial } from '../services/api';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
        setUsername(userData.username || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Ошибка', 'Имя пользователя обязательно');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Ошибка', 'Email обязателен');
      return;
    }

    setLoading(true);
    try {
      const updateData = { username, email, phone };
      if (password.trim()) {
        updateData.password = password.trim();
      }
      await api.put('/auth/profile', updateData);
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        const updatedUser = { ...userData, username, email, phone };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      Alert.alert('Успех', 'Профиль обновлён');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      let errorMessage = 'Не удалось обновить профиль';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSocial = (provider) => {
    navigation.navigate('OAuth', { provider, mode: 'link' });
  };

  const handleUnlinkSocial = async (provider) => {
    Alert.alert(
      'Отвязать соцсеть',
      `Вы уверены, что хотите отвязать ${provider === 'yandex' ? 'Яндекс' : 'ВКонтакте'}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отвязать',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkSocial(provider);
              Alert.alert('Успех', 'Соцсеть отвязана');
              const response = await api.get('/auth/me');
              await AsyncStorage.setItem('user', JSON.stringify(response.data));
              setUser(response.data);
            } catch (err) {
              console.error(err);
              Alert.alert('Ошибка', 'Не удалось отвязать соцсеть');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Редактирование профиля</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Имя пользователя *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Ваше имя"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Телефон</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+7 999 123-45-67"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Новый пароль (оставьте пустым, чтобы не менять)</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Новый пароль"
            secureTextEntry
          />
        </View>

        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Привязка социальных сетей</Text>

          <View style={styles.socialRow}>
            <Text style={styles.socialLabel}>Яндекс</Text>
            {user?.yandex_id ? (
              <TouchableOpacity
                style={[styles.socialButton, styles.unlinkButton]}
                onPress={() => handleUnlinkSocial('yandex')}
              >
                <Text style={styles.socialButtonText}>Отвязать</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleLinkSocial('yandex')}
              >
                <Text style={styles.socialButtonText}>Привязать</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.socialRow}>
            <Text style={styles.socialLabel}>ВКонтакте</Text>
            {user?.vk_id ? (
              <TouchableOpacity
                style={[styles.socialButton, styles.unlinkButton]}
                onPress={() => handleUnlinkSocial('vk')}
              >
                <Text style={styles.socialButtonText}>Отвязать</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleLinkSocial('vk')}
              >
                <Text style={styles.socialButtonText}>Привязать</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Сохранить</Text>
          )}
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1c1c1e',
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1c1e',
  },
  socialSection: {
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  socialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1c1c1e',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  socialLabel: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  socialButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unlinkButton: {
    backgroundColor: '#ff3b30',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});