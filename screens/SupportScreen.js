// screens/SupportScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const SupportScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Ошибка', 'Заполните тему и текст сообщения.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/support/tickets', {
        subject: subject.trim(),
        message: message.trim(),
      });
      Alert.alert('Успешно', 'Ваше обращение отправлено. Мы ответим вам в ближайшее время.');
      navigation.goBack();
    } catch (error) {
      console.warn('Ошибка отправки на сервер:', error);
      let errorMessage = 'Пожалуйста, напишите нам на почту: ironads@yandex.ru';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error + '\n\n' + errorMessage;
      }
      Alert.alert(
        'Не удалось отправить через приложение',
        errorMessage,
        [
          {
            text: 'Написать письмо',
            onPress: () => Linking.openURL('mailto:ironads@yandex.ru?subject=Обращение в поддержку'),
          },
          { text: 'ОК', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>Служба поддержки</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Опишите вашу проблему или вопрос, и мы свяжемся с вами.
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Тема обращения"
          placeholderTextColor={colors.secondaryText}
          value={subject}
          onChangeText={setSubject}
          maxLength={100}
        />

        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Подробно опишите ситуацию..."
          placeholderTextColor={colors.secondaryText}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Отправить</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => Linking.openURL('mailto:ironads@yandex.ru')}
        >
          <Text style={[styles.emailButtonText, { color: colors.primary }]}>Или напишите нам на почту</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 30 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  input: { borderRadius: 8, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  textArea: { minHeight: 120, paddingTop: 14 },
  sendButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emailButton: { paddingVertical: 12, alignItems: 'center' },
  emailButtonText: { fontSize: 16, textDecorationLine: 'underline' },
});

export default SupportScreen;