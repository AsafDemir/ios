import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import apiService from '../services/apiService';
import { Beverage, Room, CreateOrderRequest } from '../models/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigasyon props arayüzü
interface UserScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

const UserScreen: React.FC<UserScreenProps> = ({ navigation }) => {
  // Ana ekran durumu yönetimi için state tanımlamaları
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Sipariş modalı için state tanımlamaları
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedBeverages, setSelectedBeverages] = useState<{ beverage: Beverage, count: number }[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [orderNote, setOrderNote] = useState('');

  // Bileşen yüklendiğinde veri çekme işlemleri
  useEffect(() => {
    console.log('UserScreen useEffect çalıştı');
    fetchUserInfo();
    fetchBeverages();
    fetchRooms();
  }, []);
  
  // Kullanıcı bilgilerini getirme - Token'dan ID çıkarma ve fiş sayısı alma
  const fetchUserInfo = async () => {
    try {
      const id = apiService.getUserIdFromToken();
      if (id) {
        setUserId(id);
        const ticketCount = await apiService.getUserTicketCount(id);
        setTicketCount(ticketCount);
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi alınırken hata:', error);
    }
  };

  // Aktif içecekleri API'den getirme
  const fetchBeverages = async () => {
    setLoading(true);
    try {
      const data = await apiService.getBeverages();
      setBeverages(data);
    } catch (error) {
      console.error('İçecekler alınırken hata oluştu:', error);
      Alert.alert('Hata', 'İçecekler alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Mevcut odaları API'den getirme
  const fetchRooms = async () => {
    console.log('fetchRooms çağrıldı - odalar getiriliyor');
    try {
      console.log('apiService.getRooms çağrılıyor...');
      const data = await apiService.getRooms();
      console.log('Odalar başarıyla alındı. Oda sayısı:', data.length);
      console.log('Alınan odalar:', JSON.stringify(data, null, 2));
      setRooms(data);
    } catch (error) {
      console.error('Odalar alınırken hata oluştu:', error);
      Alert.alert('Hata', 'Odalar alınırken bir hata oluştu.');
    }
  };

  // Pull-to-refresh işlemi - İçecek listesini yenileme
  const onRefresh = () => {
    setRefreshing(true);
    fetchBeverages();
  };

  // İçecek seçimi işlemi - Sipariş sepetine ekleme
  const handleBeverageSelect = (beverage: Beverage) => {
    const existing = selectedBeverages.find(item => item.beverage.id === beverage.id);
    
    if (existing) {
      // Eğer zaten seçilmişse, miktarını artır
      setSelectedBeverages(
        selectedBeverages.map(item => 
          item.beverage.id === beverage.id 
            ? { ...item, count: item.count + 1 } 
            : item
        )
      );
    } else {
      // Yeni ekle
      setSelectedBeverages([...selectedBeverages, { beverage, count: 1 }]);
    }
  };
  
  // Seçilen içecek miktarını değiştirme
  const handleCountChange = (beverageId: number, newCount: number) => {
    if (newCount <= 0) {
      // Sıfır veya negatifse, listeden çıkar
      setSelectedBeverages(selectedBeverages.filter(item => item.beverage.id !== beverageId));
    } else {
      // Değilse, miktarı güncelle
      setSelectedBeverages(
        selectedBeverages.map(item => 
          item.beverage.id === beverageId 
            ? { ...item, count: newCount } 
            : item
        )
      );
    }
  };
  
  // Sipariş oluşturma işlemi - API'ye sipariş gönderme
  const handleCreateOrder = async () => {
    if (selectedBeverages.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir içecek seçin.');
      return;
    }
    
    if (!selectedRoom) {
      Alert.alert('Uyarı', 'Lütfen bir oda seçin.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Sipariş oluştur
      const orderRequest: CreateOrderRequest = {
        notes: orderNote,
        roomid: selectedRoom.id
      };
      
      const createdOrder = await apiService.createOrder(orderRequest);
      
      // Seçilen içecekleri siparişe ekle
      for (const item of selectedBeverages) {
        await apiService.addOrderDrink(
          createdOrder.id, 
          item.beverage.id, 
          item.count
        );
      }
      
      // Başarılı mesajı
      Alert.alert('Başarılı', 'Siparişiniz oluşturuldu!');
      
      // Modal'ı kapat ve seçimleri temizle
      setOrderModalVisible(false);
      setSelectedBeverages([]);
      setSelectedRoom(null);
      setOrderNote('');
      
      // Fiş sayısını yenile
      if (userId) {
        const newTicketCount = await apiService.getUserTicketCount(userId);
        setTicketCount(newTicketCount);
      }
    } catch (error) {
      console.error('Sipariş oluşturulurken hata:', error);
      Alert.alert('Hata', 'Sipariş oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  // Çıkış işlemi - Kullanıcı oturumunu sonlandırma
  const handleLogout = async () => {
    Alert.alert(
      'Çıkış',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.logout();
              // AsyncStorage'dan token'ı temizle
              await AsyncStorage.removeItem('auth_token');
              // Login ekranına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Çıkış yapılırken hata:', error);
            }
          }
        }
      ]
    );
  };

  const renderBeverageItem = ({ item }: { item: Beverage }) => (
    <View style={styles.beverageCard}>
      <TouchableOpacity
        style={styles.beverageItem}
        onPress={() => handleBeverageSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.beverageIconContainer}>
          <Ionicons name="cafe" size={24} color="#667eea" />
        </View>
        <View style={styles.beverageInfo}>
          <Text style={styles.beverageName}>{item.name}</Text>
          <Text style={styles.beveragePrice}>{item.price} TL</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleBeverageSelect(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  // Oda seçim butonunun tıklanması - Alert kullanarak
  const handleOpenRoomSelectWithAlert = () => {
    console.log('handleOpenRoomSelectWithAlert çağrıldı');
    console.log('Mevcut odalar:', JSON.stringify(rooms, null, 2));
    
    if (rooms.length === 0) {
      console.log('Odalar bulunamadı! Odaları yüklemeye çalışılıyor');
      fetchRooms();
      Alert.alert('Hata', 'Odalar yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    
    // Alert için butonları tanımla
    const alertButtons = rooms.map(room => ({
      text: room.name,
      onPress: () => {
        console.log(`Seçilen oda: ${room.name} (id: ${room.id})`);
        setSelectedRoom(room);
      }
    }));
    
    // İptal butonu ekle
    alertButtons.push({
      text: 'İptal',
      onPress: () => console.log('İptal edildi')
    });
    
    Alert.alert(
      'Oda Seçin',
      'Lütfen sipariş için bir oda seçin:',
      alertButtons
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="cafe" size={28} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Çay Ocağı</Text>
              <Text style={styles.headerSubtitle}>Sipariş Sistemi</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.ticketContainer}>
              <Ionicons name="ticket" size={18} color="#ffffff" />
              <Text style={styles.ticketCount}>Fiş: {ticketCount}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>İçecekler yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={beverages.filter(beverage => beverage.active !== false)}
            renderItem={renderBeverageItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cafe-outline" size={64} color="#94a3b8" />
                <Text style={styles.emptyText}>İçecek bulunamadı</Text>
                <Text style={styles.emptySubtext}>Lütfen daha sonra tekrar deneyin</Text>
              </View>
            }
          />
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.orderButton} 
        onPress={() => setOrderModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.orderButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="basket" size={24} color="#ffffff" />
          <Text style={styles.orderButtonText}>Sipariş Ver</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Sipariş Oluşturma Modalı */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="basket" size={24} color="#667eea" />
                <Text style={styles.modalTitle}>Sipariş Oluştur</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setOrderModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.selectedItems}>
              <Text style={styles.sectionTitle}>Seçilen İçecekler</Text>
              {selectedBeverages.length === 0 ? (
                <View style={styles.emptySelectionContainer}>
                  <Ionicons name="cafe-outline" size={32} color="#94a3b8" />
                  <Text style={styles.emptySelectionText}>Henüz içecek seçilmedi</Text>
                </View>
              ) : (
                selectedBeverages.map((item) => (
                  <View key={item.beverage.id} style={styles.selectedItem}>
                    <View style={styles.selectedItemInfo}>
                      <Text style={styles.selectedItemName}>{item.beverage.name}</Text>
                      <Text style={styles.selectedItemPrice}>{item.beverage.price} TL</Text>
                    </View>
                    <View style={styles.countControl}>
                      <TouchableOpacity
                        onPress={() => handleCountChange(item.beverage.id, item.count - 1)}
                        style={styles.countButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={18} color="#ef4444" />
                      </TouchableOpacity>
                      <Text style={styles.countText}>{item.count}</Text>
                      <TouchableOpacity
                        onPress={() => handleCountChange(item.beverage.id, item.count + 1)}
                        style={styles.countButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={18} color="#10b981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
            
            <View style={styles.roomSelection}>
              <Text style={styles.sectionTitle}>Oda Seçimi</Text>
              <TouchableOpacity
                style={styles.roomSelectButton}
                onPress={handleOpenRoomSelectWithAlert}
                activeOpacity={0.7}
              >
                <View style={styles.roomSelectContent}>
                  <Ionicons name="home" size={20} color="#667eea" />
                  <Text style={[styles.roomSelectText, selectedRoom && styles.selectedRoomText]}>
                    {selectedRoom ? selectedRoom.name : 'Oda Seç'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.noteSection}>
              <Text style={styles.sectionTitle}>Sipariş Notu</Text>
              <View style={styles.noteInputContainer}>
                <Ionicons name="document-text-outline" size={20} color="#64748b" style={styles.noteIcon} />
                <TextInput
                  style={styles.noteInput}
                  placeholder="Opsiyonel not ekleyin"
                  placeholderTextColor="#94a3b8"
                  value={orderNote}
                  onChangeText={setOrderNote}
                  multiline={true}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.createOrderButton,
                (selectedBeverages.length === 0 || !selectedRoom) && styles.disabledButton
              ]}
              onPress={handleCreateOrder}
              disabled={selectedBeverages.length === 0 || !selectedRoom || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  selectedBeverages.length === 0 || !selectedRoom 
                    ? ['#94a3b8', '#94a3b8'] 
                    : ['#10b981', '#059669']
                }
                style={styles.createOrderButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    <Text style={styles.createOrderButtonText}>Sipariş Oluştur</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 12,
  },
  ticketCount: {
    marginLeft: 6,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 16,
  },
  emptyContainer: {
    padding: 64,
    alignItems: 'center',
    justifyContent: 'center',
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
  beverageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  beverageItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  beveragePrice: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButton: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  orderButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  orderButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  // Modal stilleri
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
    marginLeft: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedItems: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  emptySelectionContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptySelectionText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedItemPrice: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  countControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginHorizontal: 16,
    minWidth: 32,
    textAlign: 'center',
  },
  roomSelection: {
    marginBottom: 24,
  },
  roomSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roomSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomSelectText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 12,
  },
  selectedRoomText: {
    color: '#10b981',
    fontWeight: '600',
  },
  noteSection: {
    marginBottom: 32,
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createOrderButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  createOrderButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  createOrderButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default UserScreen; 