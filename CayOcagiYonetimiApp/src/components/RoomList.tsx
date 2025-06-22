// Oda listesi bileşeni - Admin panelinde odaları görüntüleme ve yönetme
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Room } from '../models/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Bileşen props arayüzü - Parent bileşenden gelen veriler ve callback fonksiyonları
interface RoomListProps {
  rooms: Room[];
  loading: boolean;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
}

const RoomList: React.FC<RoomListProps> = ({ 
  rooms, 
  loading, 
  onEdit, 
  onDelete 
}) => {
  // Yükleniyor durumu gösterimi
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Odalar yükleniyor...</Text>
      </View>
    );
  }

  // Boş liste durumu gösterimi
  if (rooms.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="home-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyText}>Oda bulunamadı</Text>
        <Text style={styles.emptySubtext}>Yeni oda eklemek için + butonuna tıklayın</Text>
      </View>
    );
  }

  // Oda kartı render işlemi - Her oda için kart görünümü
  const renderItem = ({ item }: { item: Room }) => (
    <View style={styles.roomCard}>
      <View style={styles.roomContent}>
        {/* Oda ikonu */}
        <View style={styles.roomIconContainer}>
          <Ionicons name="home" size={24} color="#667eea" />
        </View>
        
        {/* Oda bilgileri */}
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomId}>Oda #{item.id}</Text>
        </View>
        
        {/* Aksiyon butonları - Düzenle ve sil */}
        <View style={styles.actionButtons}>
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
      data={rooms}
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
  roomCard: {
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
  roomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  roomIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  roomId: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
});

export default RoomList; 
 