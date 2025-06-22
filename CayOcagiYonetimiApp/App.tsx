// Ana uygulama bileşeni - Kullanıcı kimlik doğrulaması ve navigasyon yönetimi
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Alert } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import UserScreen from './src/screens/UserScreen';
import apiService from './src/services/apiService';
import { UserRole } from './src/models/types';

// Modal ile ilgili uyarıları görmezden gel
LogBox.ignoreLogs([
  'Modal with', // Modal uyarılarını gizle
  'Possible Unhandled Promise Rejection', // Olası promise ret uyarılarını gizle
]);

const Stack = createNativeStackNavigator();

export default function App() {
  // Uygulama durumu yönetimi için state tanımlamaları
  const [initializing, setInitializing] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Uygulama başlatıldığında token kontrolü ve kullanıcı doğrulama işlemi
  useEffect(() => {
    // Uygulama başlatıldığında token kontrolü yap
    const checkToken = async () => {
      try {
        // Yeni loadToken metodunu kullan
        const tokenValid = await apiService.loadToken();
        
        if (tokenValid) {
          console.log('Token geçerli, kullanıcı girişi yapılmış');
          
          // Token'ı sakla
          setUserToken(apiService.getToken());
          
          // Token'dan kullanıcı rolünü çıkar
          const decodedToken = apiService.decodeToken();
          if (decodedToken && decodedToken.role) {
            const role = decodedToken.role === 'Admin' 
              ? UserRole.Admin 
              : UserRole.User;
            setUserRole(role);
            console.log('Kullanıcı rolü:', role);
          } else {
            console.warn('Token\'da rol bilgisi bulunamadı');
            setUserRole(null);
            setUserToken(null);
          }
        } else {
          console.log('Token geçersiz veya bulunamadı');
          setUserToken(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Token kontrolü sırasında hata:', error);
        setUserToken(null);
        setUserRole(null);
        Alert.alert('Hata', 'Oturum kontrolü sırasında bir hata oluştu.');
      } finally {
        setInitializing(false);
      }
    };
    
    checkToken();
  }, []);

  // Kullanıcı rolüne göre başlangıç ekranını belirle
  const getInitialRouteName = () => {
    if (!userToken) return 'Login';
    return userRole === UserRole.Admin ? 'Admin' : 'User';
  };

  // Uygulama başlatılırken yükleniyor durumu
  if (initializing) {
    return null; // Yükleniyor ekranı eklenebilir
  }

  // Ana uygulama render işlemi - Navigasyon yapısı ve ekranlar
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={getInitialRouteName()} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="User" component={UserScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
