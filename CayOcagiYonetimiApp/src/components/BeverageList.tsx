// İçecek listesi bileşeni - Admin panelinde içecekleri görüntüleme ve yönetme
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Beverage } from '../models/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Bileşen props arayüzü - Parent bileşenden gelen veriler ve callback fonksiyonları
interface BeverageListProps {
  beverages: Beverage[];
  loading: boolean;
  onEdit: (beverage: Beverage) => void;
  onDelete: (beverage: Beverage) => void;
  onToggleStatus: (beverage: Beverage) => void;
}

const BeverageList: React.FC<BeverageListProps> = ({ 
  beverages, 
  loading, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}) => {
  // Yükleniyor durumu gösterimi
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>İçecekler yükleniyor...</Text>
      </View>
    );
  }

  // Boş liste durumu gösterimi
  if (beverages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cafe-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyText}>İçecek bulunamadı</Text>
        <Text style={styles.emptySubtext}>Yeni içecek eklemek için + butonuna tıklayın</Text>
      </View>
    );
  }

  // İçecek kartı render işlemi - Her içecek için kart görünümü
  const renderItem = ({ item }: { item: Beverage }) => (
    <View style={styles.beverageCard}>
      <View style={styles.beverageContent}>
        {/* İçecek ikonu */}
        <View style={styles.beverageIconContainer}>
          <Ionicons 
            name="cafe" 
            size={24} 
            color={item.active ?? true ? '#667eea' : '#94a3b8'} 
          />
        </View>
        
        {/* İçecek bilgileri */}
        <View style={styles.beverageInfo}>
          <Text style={[
            styles.beverageName, 
            !(item.active ?? true) && styles.inactiveBeverage
          ]}>
            {item.name}
          </Text>
          <Text style={styles.beveragePrice}>{item.price?.toFixed(2)} TL</Text>
          {/* Durum badge'i */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge, 
              item.active ?? true ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.statusText,
                item.active ?? true ? styles.activeStatusText : styles.inactiveStatusText
              ]}>
                {item.active ?? true ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Aksiyon butonları - Durum değiştir, düzenle, sil */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={() => onToggleStatus(item)}
            style={[styles.actionButton, styles.toggleButton]}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={(item.active ?? true) ? 'eye-off-outline' : 'eye-outline'} 
              size={18} 
              color="#64748b" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onEdit(item)}
            style={[styles.actionButton, styles.editButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#667eea" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onDelete(item)}
            style={[styles.actionButton, styles.deleteButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Ana liste render işlemi
  return (
    <FlatList
      data={beverages}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

// Stil tanımlamaları - Bileşen tasarımı ve görsel öğeler
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 64,
    backgroundColor: '#f8fafc',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  beverageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  beverageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  beverageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  beverageInfo: {
    flex: 1,
  },
  beverageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  inactiveBeverage: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  beveragePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#059669',
  },
  inactiveStatusText: {
    color: '#dc2626',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  toggleButton: {
    backgroundColor: '#f8fafc',
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
});

export default BeverageList;
