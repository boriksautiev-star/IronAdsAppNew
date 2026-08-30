import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login, register } from '../services/auth';

export default function AuthScreen() {
  const navigation = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Ошибка', 'Заполните все обязательные поля');
      return;
    }
    if (!isLogin && !email) {
      Alert.alert('Ошибка', 'Для регистрации укажите email');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
        Alert.alert('Успех', 'Вы вошли в систему');
        navigation.replace('Home');
      } else {
        await register(username, email, password, phone);
        Alert.alert('Успех', 'Регистрация завершена!');
        navigation.replace('Home');
      }
    } catch (err) {
      Alert.alert('Ошибка', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>{isLogin ? 'Вход' : 'Регистрация'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Имя пользователя"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Телефон (необязательно)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Войти' : 'Зарегистрироваться'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </Text>
          </TouchableOpacity>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, styles.yandexButton]}
              onPress={() => navigation.navigate('OAuth', { provider: 'yandex' })}
            >
              <Text style={styles.socialButtonText}>Войти через Яндекс</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, styles.vkButton]}
              onPress={() => navigation.navigate('OAuth', { provider: 'vk' })}
            >
              <Text style={styles.socialButtonText}>Войти через ВКонтакте</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#1c1c1e' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16, backgroundColor: '#f9f9f9' },
  button: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  switchButton: { marginTop: 16, alignItems: 'center' },
  switchText: { color: '#007AFF', fontSize: 16 },
  socialButtons: { marginTop: 16 },
  socialButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  yandexButton: { backgroundColor: '#FC3F1D' },
  vkButton: { backgroundColor: '#2787F5' },
  socialButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});