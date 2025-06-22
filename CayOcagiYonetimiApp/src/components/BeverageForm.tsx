import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Beverage } from '../models/types';
import apiService from '../services/apiService';

// Bileşen props arayüzü - Parent bileşenden gelen veriler ve callback fonksiyonları
interface BeverageFormProps {
  beverage?: Beverage; // Düzenleme için mevcut içecek
  onSave: (beverage: Beverage) => void;
  onCancel: () => void;
}

const BeverageForm: React.FC<BeverageFormProps> = ({ beverage, onSave, onCancel }) => {
  console.log('BeverageForm render edildi, beverage:', beverage);
  
  // Form durumu yönetimi için state tanımlamaları
  const [name, setName] = useState(beverage?.name || '');
  const [price, setPrice] = useState(beverage?.price?.toString() || '');
  const [active, setActive] = useState(beverage?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Props değişikliklerini izleme - Düzenleme modunda form verilerini güncelleme
  useEffect(() => {
    console.log('BeverageForm props değişti:', { beverage });
  }, [beverage]);

  // Form doğrulama işlemi - Girilen verilerin geçerliliğini kontrol eder
  const validateForm = (): boolean => {
    console.log('validateForm çağrıldı');
    const newErrors: { [key: string]: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'İçecek adı gereklidir';
    }
    
    if (!price.trim()) {
      newErrors.price = 'Fiyat gereklidir';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      newErrors.price = 'Geçerli bir fiyat giriniz';
    }
    
    console.log('Form hataları:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Kaydetme işlemi - API'ye yeni içecek ekleme veya mevcut içeceği güncelleme
  const handleSave = async () => {
    console.log('handleSave çağrıldı');
    if (!validateForm()) {
      console.log('Form doğrulama başarısız oldu');
      return;
    }

    setLoading(true);
    console.log('Loading durumu true yapıldı');
    
    try {
      // İçecek verisi hazırlama
      const beverageData = {
        name,
        price: parseFloat(price),
        pics: '', // Boş string olarak ayarlıyoruz, backend'de nullable
        active: active
      };
      
      console.log('İçecek verisi hazırlandı:', beverageData);

      let savedBeverage: Beverage;
      
      if (beverage?.id) {
        // Güncelleme işlemi - Mevcut içeceği düzenleme
        console.log('İçecek güncelleniyor, ID:', beverage.id);
        savedBeverage = await apiService.updateBeverage(beverage.id, beverageData);
        console.log('İçecek güncellendi:', savedBeverage);
        Alert.alert('Başarılı', 'İçecek güncellendi!');
      } else {
        // Yeni ekleme işlemi - Yeni içecek oluşturma
        console.log('Yeni içecek ekleniyor');
        savedBeverage = await apiService.addBeverage(beverageData);
        console.log('İçecek eklendi:', savedBeverage);
        Alert.alert('Başarılı', 'İçecek eklendi!');
      }
      
      console.log('onSave callback çağrılıyor');
      onSave(savedBeverage);
    } catch (error) {
      console.error('İçecek kaydetme hatası:', error);
      Alert.alert('Hata', 'İçecek kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      console.log('Loading durumu false yapıldı');
    }
  };

  // Ana form render işlemi
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Form başlığı */}
        <Text style={styles.title}>
          {beverage?.id ? 'İçecek Düzenle' : 'Yeni İçecek Ekle'}
        </Text>

        {/* İçecek adı input alanı */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>İçecek Adı</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={(text) => {
              console.log('İçecek adı değişti:', text);
              setName(text);
            }}
            placeholder="İçecek adını giriniz"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Fiyat input alanı */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Fiyat (TL)</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            value={price}
            onChangeText={(text) => {
              console.log('Fiyat değişti:', text);
              setPrice(text);
            }}
            placeholder="Fiyat giriniz"
            keyboardType="numeric"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        {/* Aktif durumu switch alanı */}
        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Aktif</Text>
            <Switch value={active} onValueChange={(value) => {
              console.log('Aktif durumu değişti:', value);
              setActive(value);
            }} />
          </View>
        </View>

        {/* Form butonları - İptal ve Kaydet */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              console.log('İptal butonuna basıldı');
              onCancel();
            }}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={() => {
              console.log('Kaydet butonuna basıldı');
              handleSave();
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Stil tanımlamaları - Form tasarımı ve görsel öğeler
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#64748b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BeverageForm; 