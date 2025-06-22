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
interface CompletedOrderListProps {
  orders: Order[];
  loading: boolean;
  onViewDetails?: (order: Order) => void;
}

const CompletedOrderList: React.FC<CompletedOrderListProps> = ({ 
  orders, 
  loading, 
  onViewDetails
}) => {
  // Yükleniyor durumu gösterimi
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Tamamlanan siparişler yükleniyor...</Text>
      </View>
    );
  }

  // Boş liste durumu gösterimi
  if (!orders || orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-done-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyText}>Tamamlanan sipariş bulunamadı</Text>
        <Text style={styles.emptySubtext}>Henüz onaylanmış veya reddedilmiş sipariş bulunmuyor</Text>
      </View>
    );
  }

  // Sipariş durumu metne çevirme yardımcı fonksiyonu
  const getStatusText = (status: OrderStatus) => {
    switch (status) {
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
      case OrderStatus.Approved:
        return '#10b981'; // Yeşil
      case OrderStatus.Rejected:
        return '#ef4444'; // Kırmızı
      default:
        return '#64748b'; // Gri
    }
  };

  // Sipariş durumu ikonunu belirleme yardımcı fonksiyonu
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Approved:
        return 'checkmark-circle';
      case OrderStatus.Rejected:
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  // Tarih formatlamak için yardımcı fonksiyon
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  // Tamamlanan sipariş kartı render işlemi - Her sipariş için kart görünümü
  const renderItem = ({ item }: { item: Order }) => {
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
          {/* Durum ikonu */}
          <View style={styles.orderIconContainer}>
            <Ionicons 
              name={getStatusIcon(orderStatus)} 
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
            
            {/* Meta bilgiler - Kullanıcı ve tarih */}
            <View style={styles.metaInfo}>
              <View style={styles.userInfo}>
                <Ionicons name="person" size={14} color="#64748b" />
                <Text style={styles.userName}>
                  {item.User ? item.User.Username : 'Kullanıcı bilgisi yok'}
                </Text>
              </View>
              
              {item.createdAt && (
                <View style={styles.dateInfo}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.dateText}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              )}
            </View>
            
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
  metaInfo: {
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
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
});

export default CompletedOrderList;
