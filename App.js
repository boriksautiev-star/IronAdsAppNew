import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import ListingDetailScreen from './screens/ListingDetailScreen';
import AuthScreen from './screens/AuthScreen';
import OAuthScreen from './screens/OAuthScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import FiltersScreen from './screens/FiltersScreen';
import CategorySelectScreen from './screens/CategorySelectScreen';
import CitySelectScreen from './screens/CitySelectScreen';
import RegionSelectScreen from './screens/RegionSelectScreen';
import CreateListingScreen from './screens/CreateListingScreen';
import EditListingScreen from './screens/EditListingScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import HistoryScreen from './screens/HistoryScreen';
import ChatsScreen from './screens/ChatsScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import PlansScreen from './screens/PlansScreen';
import PackageListingsScreen from './screens/PackageListingsScreen';
import AvailableListingsScreen from './screens/AvailableListingsScreen';
import RenewPackageScreen from './screens/RenewPackageScreen';

import { isAuthenticated, getCurrentUser } from './services/auth';
import { registerPushToken, getUnreadCount } from './services/api';
import { CachedListingsProvider } from './context/CachedListingsContext';

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const updateBadge = async () => {
  try {
    const data = await getUnreadCount();
    const count = data.count || 0;
    await Notifications.setBadgeCountAsync(count);
    console.log(`🔴 Badge обновлён: ${count}`);
  } catch (error) {
    console.error('Ошибка обновления badge:', error);
  }
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigationRef = useRef();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      const userData = await getCurrentUser();
      setUser(userData);
      await registerForPushNotifications();
      await updateBadge();
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Permission for notifications not granted');
        return;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      console.log('Expo push token:', token);
      const deviceOs = Platform.OS === 'ios' ? 'ios' : 'android';
      await registerPushToken(token, deviceOs);
      await AsyncStorage.setItem('pushToken', token);
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  const handleNotificationResponse = async (response) => {
    const data = response.notification.request.content.data;
    if (data?.chatId) {
      navigationRef.current?.navigate('ChatDetail', { chatId: Number(data.chatId) });
      await Notifications.setBadgeCountAsync(0);
    }
  };

  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    const tokenListener = Notifications.addPushTokenListener(async (token) => {
      const user = await getCurrentUser();
      if (user) {
        const deviceOs = Platform.OS === 'ios' ? 'ios' : 'android';
        await registerPushToken(token.data, deviceOs);
        await AsyncStorage.setItem('pushToken', token.data);
      }
    });
    const receivedListener = Notifications.addNotificationReceivedListener(async () => {
      await updateBadge();
    });
    const getInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) handleNotificationResponse(response);
    };
    getInitialNotification();

    return () => {
      responseListener.remove();
      tokenListener.remove();
      receivedListener.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <CachedListingsProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator initialRouteName={user ? 'Home' : 'Auth'}>
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OAuth" component={OAuthScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'IronAds', headerTitleAlign: 'center' }} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Объявление', headerTitleAlign: 'center' }} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Избранное', headerTitleAlign: 'center' }} />
            <Stack.Screen name="Filters" component={FiltersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CategorySelect" component={CategorySelectScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CitySelect" component={CitySelectScreen} options={{ headerShown: false }} />
            <Stack.Screen name="RegionSelect" component={RegionSelectScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'Новое объявление', headerTitleAlign: 'center' }} />
            <Stack.Screen name="EditListing" component={EditListingScreen} options={{ title: 'Редактирование объявления', headerTitleAlign: 'center' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль', headerTitleAlign: 'center' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Редактирование профиля', headerTitleAlign: 'center' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'История просмотров', headerTitleAlign: 'center' }} />
            <Stack.Screen name="Chats" component={ChatsScreen} options={{ title: 'Чаты', headerTitleAlign: 'center' }} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: 'Чат', headerTitleAlign: 'center' }} />
            <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Подписки', headerTitleAlign: 'center' }} />
            <Stack.Screen name="Plans" component={PlansScreen} options={{ title: 'Тарифы', headerTitleAlign: 'center' }} />
            <Stack.Screen name="PackageListings" component={PackageListingsScreen} options={{ title: 'Объявления в пакете', headerTitleAlign: 'center' }} />
            <Stack.Screen name="AvailableListings" component={AvailableListingsScreen} options={{ title: 'Доступные объявления', headerTitleAlign: 'center' }} />
            <Stack.Screen name="RenewPackage" component={RenewPackageScreen} options={{ title: 'Продление пакета', headerTitleAlign: 'center' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </CachedListingsProvider>
    </SafeAreaProvider>
  );
}