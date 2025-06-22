// Kullanıcı giriş ekranı - Kullanıcı adı ve şifre ile kimlik doğrulama
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import apiService from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../models/types';

// Navigasyon props arayüzü
interface LoginScreenProps {
  navigation: any;
  route: any;
}

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  // Form durumu yönetimi için state tanımlamaları
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Route parametrelerini kontrol et - Hata mesajları için
  useEffect(() => {
    if (route.params?.expired) {
      setErrorMessage('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
    } else if (route.params?.error) {
      setErrorMessage(route.params.error);
    }
  }, [route.params]);

  // Giriş işlemi - Kullanıcı adı ve şifre doğrulama
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre gereklidir.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      console.log('Giriş isteği gönderiliyor: ', { username });
      
      // API üzerinden giriş isteği gönder
      const response = await apiService.login(username, password);
      console.log('API yanıtı:', response);
      
      if (response && response.token) {
        console.log('Token alındı:', response.token.substring(0, 15) + '...');
        
        // Token'dan kullanıcı bilgilerini çıkar
        const userId = apiService.getUserIdFromToken();
        const decodedToken = apiService.decodeToken();
        const isAdmin = decodedToken?.role === 'Admin';
        
        console.log('Token\'dan çıkarılan userId:', userId);
        console.log('Kullanıcı rolü:', decodedToken?.role);
        
        if (userId) {
          try {
            // Kullanıcı bilgilerini API'den al
            const userInfo = await apiService.getUser(userId);
            console.log('Kullanıcı bilgileri alındı:', userInfo);
            
            // Kullanıcı ID'sini yerel depolamaya kaydet
            await AsyncStorage.setItem('user_id', userId.toString());
            
            // Başarılı giriş mesajı göster ve yönlendir
            Alert.alert('Başarılı', `Hoşgeldin, ${userInfo.Username}`, [
              {
                text: 'Tamam',
                onPress: () => {
                  // Kullanıcı rolüne göre uygun ekrana yönlendir
                  if (isAdmin) {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Admin' }],
                    });
                  } else {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'User' }],
                    });
                  }
                }
              }
            ]);
          } catch (userError) {
            console.error('Kullanıcı bilgileri alınırken hata:', userError);
            
            // Hata olsa bile yönlendirme yap
            if (isAdmin) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Admin' }],
              });
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'User' }],
              });
            }
          }
        } else {
          console.log('Token\'dan userId çıkarılamadı.');
          setErrorMessage('Kullanıcı bilgileri alınamadı.');
        }
      }
    } catch (error) {
      console.error('Login hatası:', error);
      setErrorMessage('Kullanıcı adı veya şifre hatalı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Ana render işlemi - Giriş formu ve UI bileşenleri
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {/* Gradient arka plan */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo ve başlık alanı */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Ionicons name="cafe" size={60} color="#ffffff" />
            </View>
            <Text style={styles.title}>Çay Ocağı Yönetimi</Text>
            <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
          </View>

          {/* Hata mesajı gösterimi */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Giriş formu */}
          <View style={styles.formContainer}>
            {/* Kullanıcı adı input alanı */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı Adı"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Şifre input alanı */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
              />
              {/* Şifre görünürlük toggle butonu */}
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
            </View>

            {/* Giriş butonu */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                // Yükleniyor durumu gösterimi
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.loadingText}>Giriş yapılıyor...</Text>
                </View>
              ) : (
                // Normal buton içeriği
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Alt bilgi alanı */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Güvenli giriş için kullanıcı adı ve şifrenizi giriniz
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// Stil tanımlamaları - Ekran tasarımı ve görsel öğeler
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default LoginScreen;
