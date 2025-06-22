// Kullanıcı listesi bileşeni - Admin panelinde kullanıcıları görüntüleme ve yönetme
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { User, UserRole } from '../models/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Bileşen props arayüzü - Parent bileşenden gelen veriler ve callback fonksiyonları
interface UserListProps {
  users: User[];
  loading: boolean;
  onUpdateTicketCount: (user: User) => void;
  onToggleActivation: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  loading, 
  onUpdateTicketCount,
  onToggleActivation
}) => {
  // Yükleniyor durumu gösterimi
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
      </View>
    );
  }

  // Boş liste durumu gösterimi
  if (!users || users.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
        <Text style={styles.emptySubtext}>Henüz kayıtlı kullanıcı bulunmuyor</Text>
      </View>
    );
  }

  // Kullanıcı rolünü metne çevirme yardımcı fonksiyonu
  const getRoleText = (role: UserRole) => {
    return role === UserRole.Admin ? 'Yönetici' : 'Kullanıcı';
  }

  // Kullanıcı kartı render işlemi - Her kullanıcı için kart görünümü
  const renderItem = ({ item }: { item: User }) => (
    <View style={[
      styles.userCard,
      !item.IsActive && styles.inactiveUser
    ]}>
      <View style={styles.userContent}>
        {/* Kullanıcı ikonu - Rol bazlı */}
        <View style={styles.userIconContainer}>
          <Ionicons 
            name={item.Role === UserRole.Admin ? "shield-checkmark" : "person"} 
            size={24} 
            color={item.IsActive ? "#667eea" : "#94a3b8"} 
          />
        </View>
        
        {/* Kullanıcı bilgileri */}
        <View style={styles.userInfo}>
          <Text style={[
            styles.userName,
            !item.IsActive && styles.inactiveText
          ]}>
            {item.Username || 'İsimsiz'}
          </Text>
          
          {/* Rol ve durum badge'leri */}
          <View style={styles.badgeContainer}>
            <View style={[
              styles.roleBadge,
              item.Role === UserRole.Admin ? styles.adminBadge : styles.userBadge
            ]}>
              <Text style={[
                styles.roleText,
                item.Role === UserRole.Admin ? styles.adminRoleText : styles.userRoleText
              ]}>
                {item.Role !== undefined ? getRoleText(item.Role) : 'Tanımsız'}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              item.IsActive ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.statusText,
                item.IsActive ? styles.activeStatusText : styles.inactiveStatusText
              ]}>
                {item.IsActive ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
          </View>
          
          {/* Fiş sayısı bilgisi */}
          <View style={styles.ticketContainer}>
            <Ionicons name="ticket" size={16} color="#667eea" />
            <Text style={styles.ticketCount}>
              {item.TicketCount !== undefined ? item.TicketCount : 0} fiş
            </Text>
          </View>
        </View>
        
        {/* Aksiyon butonları - Fiş güncelle ve aktiflik durumu değiştir */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={() => onUpdateTicketCount(item)}
            style={[styles.actionButton, styles.updateTicketButton]}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={18} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onToggleActivation(item)}
            style={[
              styles.actionButton, 
              item.IsActive ? styles.deactivateButton : styles.activateButton
            ]}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={item.IsActive ? "close-outline" : "checkmark-outline"} 
              size={18} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Ana liste render işlemi
  return (
    <FlatList
      data={users}
      renderItem={renderItem}
      keyExtractor={(item) => (item.Id ? item.Id.toString() : `user-${Math.random().toString(36).substr(2, 9)}`)}
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
  userCard: {
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
  inactiveUser: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  inactiveText: {
    color: '#94a3b8',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
  },
  userBadge: {
    backgroundColor: '#e0e7ff',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adminRoleText: {
    color: '#d97706',
  },
  userRoleText: {
    color: '#4338ca',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#059669',
  },
  inactiveStatusText: {
    color: '#dc2626',
  },
  ticketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketCount: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 6,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateTicketButton: {
    backgroundColor: '#3b82f6',
  },
  activateButton: {
    backgroundColor: '#10b981',
  },
  deactivateButton: {
    backgroundColor: '#ef4444',
  },
});

export default UserList;
