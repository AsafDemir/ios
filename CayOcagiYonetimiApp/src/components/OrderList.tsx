// Sipariş listesi bileşeni - Bekleyen siparişleri görüntüleme ve yönetme
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Order, OrderStatus } from '../models/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Bileşen props arayüzü - Parent bileşenden gelen veriler ve callback fonksiyonları
interface OrderListProps {
  orders: Order[];
  loading: boolean;
  isAdmin?: boolean;
  onApprove?: (order: Order) => void;
  onReject?: (order: Order) => void;
  onViewDetails?: (order: Order) => void;
}

const OrderList: React.FC<OrderListProps> = ({ 
  orders, 
  loading, 
  isAdmin = false,
  onApprove,
  onReject,
  onViewDetails
}) => {
  // Yükleniyor durumu gösterimi
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Siparişler yükleniyor...</Text>
      </View>
    );
  }

  // Boş liste durumu gösterimi
  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyText}>Sipariş bulunamadı</Text>
        <Text style={styles.emptySubtext}>
          {isAdmin ? 'Henüz bekleyen sipariş bulunmuyor' : 'Henüz sipariş vermediniz'}
        </Text>
      </View>
    );
  }

  // Sipariş durumu metne çevirme yardımcı fonksiyonu
  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Pending:
        return 'Beklemede';
      case OrderStatus.Approved:
        return 'Onaylandı';
      case OrderStatus.Rejected:
        return 'Reddedildi';
      default:
        return 'Bilinmiyor';
    }
  };

  // Sipariş durumu rengini belirleme yardımcı fonksiyonu
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Pending:
        return '#f59e0b'; // Turuncu
      case OrderStatus.Approved:
        return '#10b981'; // Yeşil
      case OrderStatus.Rejected:
        return '#ef4444'; // Kırmızı
      default:
        return '#64748b'; // Gri
    }
  };

  // Sipariş kartı render işlemi - Her sipariş için kart görünümü
  const renderItem = ({ item }: { item: Order }) => {
    console.log(`Rendering order #${item.id}, Status: ${item.Status}, isAdmin: ${isAdmin}`);
    // Status değerinin sayısal olduğundan emin olalım
    const orderStatus = typeof item.Status === 'number' ? item.Status : Number(item.Status);
    
    return (
      <View style={styles.orderCard}>
        {/* Sipariş bilgileri tıklanabilir alanı */}
        <TouchableOpacity 
          style={styles.orderContent}
          onPress={() => onViewDetails && onViewDetails(item)}
          activeOpacity={0.7}
        >
          {/* Sipariş ikonu */}
          <View style={styles.orderIconContainer}>
            <Ionicons 
              name="receipt" 
              size={24} 
              color={getStatusColor(orderStatus)} 
            />
          </View>
          
          {/* Sipariş bilgileri */}
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>Sipariş #{item.id}</Text>
            <Text style={styles.orderRoom}>Oda: {item.roomid}</Text>
            {item.notes && (
              <Text style={styles.orderNotes} numberOfLines={2}>
                Not: {item.notes}
              </Text>
            )}
            
            {/* Durum badge'i */}
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(orderStatus) + '20' }
              ]}>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: getStatusColor(orderStatus) }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(orderStatus) }
                ]}>
                  {getStatusText(orderStatus)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Detay görüntüleme ok işareti */}
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </TouchableOpacity>
        
        {/* Admin aksiyon butonları - Sadece admin ve bekleyen siparişler için */}
        {isAdmin && orderStatus === OrderStatus.Pending && (
          <View style={styles.adminActionButtons}>
            <TouchableOpacity 
              onPress={() => {
                console.log('Onay butonu tıklandı, order:', item);
                if (onApprove) onApprove(item);
              }}
              style={[styles.actionButton, styles.approveButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-outline" size={18} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => {
                console.log('Reddetme butonu tıklandı, order:', item);
                if (onReject) onReject(item);
              }}
              style={[styles.actionButton, styles.rejectButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Ana liste render işlemi
  return (
    <FlatList
      data={orders}
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
  orderCard: {
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
  orderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  orderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  orderRoom: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  orderNotes: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevronContainer: {
    marginLeft: 12,
  },
  adminActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
});

export default OrderList;
