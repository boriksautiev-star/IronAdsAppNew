// context/UnreadCountContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export const UnreadCountContext = createContext();

export const UnreadCountProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/chats/unread-count'); // ваш эндпоинт
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.log('Ошибка получения количества непрочитанных:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  return (
    <UnreadCountContext.Provider value={{ unreadCount, setUnreadCount, refetch: fetchUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
};