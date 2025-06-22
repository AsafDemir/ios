import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import apiService from '../services/apiService';
import { User, UserRole } from '../models/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        
        if (token) {
          await handleToken(token);
        }
      } catch (error) {
        console.error('Token yükleme hatası:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const handleToken = async (token: string) => {
    try {
      // Token'ı API servisine ayarla
      apiService.setToken(token);
      
      // Token'dan kullanıcı bilgilerini çıkar
      const decodedToken: any = jwtDecode(token);
      
      if (decodedToken && decodedToken.userId) {
        const userId = parseInt(decodedToken.userId);
        
        // Kullanıcı bilgilerini getir
        const userInfo = await apiService.getUser(userId);
        setUser(userInfo);
        setIsAuthenticated(true);
      } else {
        throw new Error('Geçersiz token');
      }
    } catch (error) {
      console.error('Token işleme hatası:', error);
      await logout();
    }
  };

  const login = async (token: string) => {
    try {
      // Token'ı sakla
      await AsyncStorage.setItem('auth_token', token);
      await handleToken(token);
    } catch (error) {
      console.error('Giriş hatası:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Token ve kullanıcı bilgilerini temizle
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_id');
      
      // API servis token'ını temizle
      apiService.clearToken();
      
      // State'i güncelle
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 