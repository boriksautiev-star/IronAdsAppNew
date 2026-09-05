// navigation/index.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Импорт экранов
import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import FiltersScreen from '../screens/FiltersScreen';
import CategorySelectScreen from '../screens/CategorySelectScreen';
import CitySelectScreen from '../screens/CitySelectScreen';
import RegionSelectScreen from '../screens/RegionSelectScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import EditListingScreen from '../screens/EditListingScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import PlansScreen from '../screens/PlansScreen';
import PackageListingsScreen from '../screens/PackageListingsScreen';
import AvailableListingsScreen from '../screens/AvailableListingsScreen';
import RenewPackageScreen from '../screens/RenewPackageScreen';

import AuthScreen from '../screens/AuthScreen';
import OAuthScreen from '../screens/OAuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Иконки для табов
const TabIcon = ({ name, color }) => {
  const icons = {
    'Главная': '🏠',
    'Избранное': '❤️',
    'Чаты': '💬',
    'Профиль': '👤',
  };
  return <Text style={{ fontSize: 16, color }}>{icons[name] || '•'}</Text>;
};

// --- Стеки для каждого таба ---
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }} // Хедер будет задан в HomeScreen
      />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: true, title: 'Объявление' }} />
      <Stack.Screen name="Filters" component={FiltersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategorySelect" component={CategorySelectScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CitySelect" component={CitySelectScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RegionSelect" component={RegionSelectScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ headerShown: true, title: 'Новое объявление' }} />
      <Stack.Screen name="EditListing" component={EditListingScreen} options={{ headerShown: true, title: 'Редактирование объявления' }} />
      <Stack.Screen name="AvailableListings" component={AvailableListingsScreen} options={{ headerShown: true, title: 'Доступные объявления' }} />
    </Stack.Navigator>
  );
}

function FavoritesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} options={{ headerShown: true, title: 'Избранное' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: true, title: 'Объявление' }} />
    </Stack.Navigator>
  );
}

function ChatsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatsScreen" component={ChatsScreen} options={{ headerShown: true, title: 'Чаты' }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true, title: 'Чат' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: true, title: 'Профиль' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Редактирование профиля' }} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: 'История просмотров' }} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ headerShown: true, title: 'Подписки' }} />
      <Stack.Screen name="Plans" component={PlansScreen} options={{ headerShown: true, title: 'Тарифы' }} />
      <Stack.Screen name="PackageListings" component={PackageListingsScreen} options={{ headerShown: true, title: 'Объявления в пакете' }} />
      <Stack.Screen name="AvailableListings" component={AvailableListingsScreen} options={{ headerShown: true, title: 'Доступные объявления' }} />
      <Stack.Screen name="RenewPackage" component={RenewPackageScreen} options={{ headerShown: true, title: 'Продление пакета' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: true, title: 'Объявление' }} />
    </Stack.Navigator>
  );
}

// --- Нижние вкладки ---
function MainTabs() {
  const insets = useSafeAreaInsets();

  const iconSize = 22;
  const baseHeight = iconSize + 10;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => <TabIcon name={route.name} color={color} />,
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: baseHeight + Math.max(insets.bottom * 0.4, 0),
          paddingBottom: Math.max(insets.bottom * 0.4, 0),
          paddingTop: 2,
        },
      })}
    >
      <Tab.Screen name="Главная" component={HomeStack} />
      <Tab.Screen name="Избранное" component={FavoritesStack} />
      <Tab.Screen name="Чаты" component={ChatsStack} />
      <Tab.Screen name="Профиль" component={ProfileStack} />
    </Tab.Navigator>
  );
}

// --- Корневой стек ---
export default function AppNavigator({ user }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="OAuth" component={OAuthScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true, title: 'Чат' }} />
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: true, title: 'Объявление' }} />
          <Stack.Screen name="PackageListings" component={PackageListingsScreen} options={{ headerShown: true, title: 'Объявления в пакете' }} />
          <Stack.Screen name="AvailableListings" component={AvailableListingsScreen} options={{ headerShown: true, title: 'Доступные объявления' }} />
        </>
      )}
    </Stack.Navigator>
  );
}