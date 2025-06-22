// Admin yönetim ekranı - İçecek, oda, sipariş ve kullanıcı yönetimi
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import apiService from '../services/apiService';
import { Beverage, Room, Order, OrderStatus, User } from '../models/types';
import BeverageList from '../components/BeverageList';
import BeverageForm from '../components/BeverageForm';
import RoomList from '../components/RoomList';
import RoomForm from '../components/RoomForm';
import OrderList from '../components/OrderList';
import UserList from '../components/UserList';
import CompletedOrderList from '../components/CompletedOrderList';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigasyon props arayüzü
interface AdminScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation }) => {
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('beverages'); // 'beverages', 'rooms', 'users', 'orders', 'completed-orders'
  const [showForm, setShowForm] = useState(false);
  const [selectedBeverage, setSelectedBeverage] = useState<Beverage | undefined>(undefined);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  
  // Fiş güncelleme modalı için state
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newTicketCount, setNewTicketCount] = useState('');

  useEffect(() => {
    console.log('AdminScreen useEffect çalıştı - İçerikler yükleniyor');
    if (activeTab === 'beverages') {
      fetchBeverages();
    } else if (activeTab === 'rooms') {
      fetchRooms();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'completed-orders') {
      fetchCompletedOrders();
    }
  }, [activeTab]);

  const fetchBeverages = async () => {
    console.log('fetchBeverages çağrıldı');
    setLoading(true);
    try {
      console.log('API isteği yapılıyor: getBeverages');
      const data = await apiService.getBeverages();
      console.log('Alınan içecek sayısı:', data.length);
      console.log('İçecekler:', JSON.stringify(data));
      setBeverages(data);
    } catch (error) {
      handleAPIError(error, 'İçecekler alınırken');
    } finally {
      setLoading(false);
      console.log('fetchBeverages tamamlandı, loading:', false);
    }
  };

  const fetchRooms = async () => {
    console.log('fetchRooms çağrıldı');
    setLoading(true);
    try {
      console.log('API isteği yapılıyor: getRooms');
      const data = await apiService.getRooms();
      console.log('Alınan oda sayısı:', data.length);
      console.log('Odalar:', JSON.stringify(data));
      setRooms(data);
    } catch (error) {
      handleAPIError(error, 'Odalar alınırken');
    } finally {
      setLoading(false);
      console.log('fetchRooms tamamlandı, loading:', false);
    }
  };

  const fetchOrders = async () => {
    console.log('fetchOrders çağrıldı - Bekleyen siparişler alınıyor');
    setLoading(true);
    try {
      console.log('API isteği yapılıyor: getPendingOrders');
      const data = await apiService.getPendingOrders();
      console.log('Alınan bekleyen sipariş sayısı:', data.length);
      
      // Siparişlerin içerik detaylarını kontrol et ve logla
      data.forEach(order => {
        console.log(`Bekleyen sipariş #${order.id} detayları:`, JSON.stringify(order, null, 2));
        console.log(`- Durum değeri: ${order.Status}, tipi: ${typeof order.Status}`);
        
        // Eğer order.Status bir string ise, enum değerine dönüştür
        if (typeof order.Status === 'string') {
          if (order.Status === 'Pending' || order.Status === '0') {
            order.Status = OrderStatus.Pending;
          } else if (order.Status === 'Approved' || order.Status === '1') {
            order.Status = OrderStatus.Approved;
          } else if (order.Status === 'Rejected' || order.Status === '2') {
            order.Status = OrderStatus.Rejected;
          }
          console.log(`- Düzeltilmiş durum değeri: ${order.Status}`);
        }
      });
      
      // Eğer API'den Pending olmayan siparişler gelirse onları filtrele
      const pendingOrders = data.filter(order => 
        order.Status === OrderStatus.Pending
      );
      
      if (pendingOrders.length < data.length) {
        console.log(`${data.length - pendingOrders.length} adet bekleyen olmayan sipariş filtrelendi`);
      }
      
      setOrders(pendingOrders);
    } catch (error) {
      handleAPIError(error, 'Siparişler alınırken');
    } finally {
      setLoading(false);
      console.log('fetchOrders tamamlandı, loading:', false);
    }
  };

  const fetchUsers = async () => {
    console.log('fetchUsers çağrıldı');
    setLoading(true);
    try {
      console.log('API isteği yapılıyor: getAllUsers');
      const data = await apiService.getAllUsers();
      console.log('Alınan kullanıcı sayısı:', data ? data.length : 0);
      console.log('Kullanıcılar (ham veri):', JSON.stringify(data));
      
      // API'den gelen veriyi kontrol et
      if (!data) {
        console.warn('API boş veri döndürdü (null veya undefined)');
        setUsers([]);
      } else if (!Array.isArray(data)) {
        console.warn('API beklenen dizi formatında veri döndürmedi:', typeof data);
        setUsers([]);
      } else {
        // Alan adlarını düzeltme (küçük harf -> büyük harf)
        const formattedUsers = data.map(user => {
          if (!user) return null;
          
          // Her alan için log çıktısı
          console.log('API kullanıcı verileri:', JSON.stringify(user, null, 2));
          
          // Alan adlarını düzelt - API'den gelen veri objesini User tipine dönüştür
          // TypeScript hatalarını önlemek için 'as any' kullanılıyor
          const apiUser = user as any;
          
          return {
            Id: apiUser.id !== undefined ? apiUser.id : apiUser.Id,
            Username: apiUser.username || apiUser.Username || 'İsimsiz',
            Role: apiUser.role !== undefined ? apiUser.role : (apiUser.Role !== undefined ? apiUser.Role : 1), // Varsayılan: normal kullanıcı
            TicketCount: apiUser.ticketCount !== undefined ? apiUser.ticketCount : (apiUser.TicketCount !== undefined ? apiUser.TicketCount : 0),
            IsActive: apiUser.isActive !== undefined ? apiUser.isActive : (apiUser.IsActive !== undefined ? apiUser.IsActive : true)
          } as User; // User tipine dönüştür
        }).filter(Boolean) as User[]; // null değerleri filtrele ve User[] tipine dönüştür
        
        console.log('Dönüştürülmüş kullanıcı verileri:', JSON.stringify(formattedUsers, null, 2));
        
        setUsers(formattedUsers);
        console.log('Geçerli kullanıcı sayısı:', formattedUsers.length);
        
        if (formattedUsers.length < data.length) {
          console.warn(`${data.length - formattedUsers.length} adet geçersiz kullanıcı verisi filtre edildi`);
        }
      }
    } catch (error) {
      handleAPIError(error, 'Kullanıcılar alınırken');
      setUsers([]);
    } finally {
      setLoading(false);
      console.log('fetchUsers tamamlandı, loading:', false);
    }
  };

  const fetchCompletedOrders = async () => {
    console.log('fetchCompletedOrders çağrıldı');
    setLoading(true);
    try {
      console.log('API isteği yapılıyor: getCompletedOrders');
      const data = await apiService.getCompletedOrders();
      console.log('Alınan tamamlanmış sipariş sayısı:', data.length);
      
      // Siparişlerin içerik detaylarını kontrol et ve logla
      data.forEach(order => {
        console.log(`Tamamlanmış sipariş #${order.id} detayları:`, JSON.stringify(order, null, 2));
        console.log(`- Durum değeri: ${order.Status}, tipi: ${typeof order.Status}`);
        
        // Eğer order.Status bir string ise, enum değerine dönüştür
        if (typeof order.Status === 'string') {
          if (order.Status === 'Approved' || order.Status === '1') {
            order.Status = OrderStatus.Approved;
          } else if (order.Status === 'Rejected' || order.Status === '2') {
            order.Status = OrderStatus.Rejected;
          }
          console.log(`- Düzeltilmiş durum değeri: ${order.Status}`);
        }
      });
      
      setCompletedOrders(data);
    } catch (error) {
      handleAPIError(error, 'Tamamlanmış siparişler alınırken');
    } finally {
      setLoading(false);
      console.log('fetchCompletedOrders tamamlandı, loading:', false);
    }
  };

  const handleAddBeverage = () => {
    console.log('handleAddBeverage çağrıldı');
    setSelectedBeverage(undefined);
    setShowForm(true);
    console.log('Form gösteriliyor');
  };

  const handleEditBeverage = (beverage: Beverage) => {
    console.log('handleEditBeverage çağrıldı, düzenlenecek içecek:', beverage);
    setSelectedBeverage(beverage);
    setShowForm(true);
  };

  const handleDeleteBeverage = (beverage: Beverage) => {
    Alert.alert(
      'Silme Onayı',
      `"${beverage.name}" içeceğini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteBeverage(beverage.id);
              setBeverages(beverages.filter(b => b.id !== beverage.id));
              Alert.alert('Başarılı', 'İçecek silindi.');
            } catch (error) {
              console.error('İçecek silinirken hata oluştu:', error);
              Alert.alert('Hata', 'İçecek silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleToggleBeverageStatus = async (beverage: Beverage) => {
    try {
      const updatedBeverage = await apiService.toggleBeverageStatus(beverage.id);
      
      setBeverages(beverages.map(b => 
        b.id === updatedBeverage.id ? updatedBeverage : b
      ));
      
      const newStatus = updatedBeverage.active ?? false;
      Alert.alert(
        'Başarılı', 
        `İçecek ${newStatus ? 'aktif' : 'pasif'} hale getirildi.`
      );
    } catch (error) {
      console.error('İçecek durumu değiştirilirken hata oluştu:', error);
      Alert.alert('Hata', 'İçecek durumu değiştirilirken bir hata oluştu.');
    }
  };

  const handleSaveBeverage = (beverage: Beverage) => {
    console.log('handleSaveBeverage çağrıldı, içecek:', beverage);
    if (selectedBeverage) {
      // Edit mode
      setBeverages(beverages.map(b => 
        b.id === beverage.id ? beverage : b
      ));
    } else {
      // Add mode
      setBeverages([...beverages, beverage]);
    }
    setShowForm(false);
  };

  const handleCancelForm = () => {
    console.log('handleCancelForm çağrıldı');
    setShowForm(false);
  };

  const handleAddRoom = () => {
    console.log('handleAddRoom çağrıldı');
    setSelectedRoom(undefined);
    setShowForm(true);
    console.log('Form gösteriliyor');
  };

  const handleEditRoom = (room: Room) => {
    console.log('handleEditRoom çağrıldı, düzenlenecek oda:', room);
    setSelectedRoom(room);
    setShowForm(true);
  };

  const handleDeleteRoom = (room: Room) => {
    Alert.alert(
      'Silme Onayı',
      `"${room.name}" odasını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteRoom(room.id);
              setRooms(rooms.filter(r => r.id !== room.id));
              Alert.alert('Başarılı', 'Oda silindi.');
            } catch (error) {
              console.error('Oda silinirken hata oluştu:', error);
              Alert.alert('Hata', 'Oda silinirken bir hata oluştu. Aktif siparişi olan odalar silinemez.');
            }
          }
        }
      ]
    );
  };

  const handleSaveRoom = (room: Room) => {
    console.log('handleSaveRoom çağrıldı, oda:', room);
    if (selectedRoom) {
      // Edit mode
      setRooms(rooms.map(r => 
        r.id === room.id ? room : r
      ));
    } else {
      // Add mode
      setRooms([...rooms, room]);
    }
    setShowForm(false);
  };

  const handleApproveOrder = async (order: Order) => {
    console.log('handleApproveOrder çağrıldı, order:', JSON.stringify(order, null, 2));
    
    Alert.alert(
      'Sipariş Onaylama',
      `#${order.id} numaralı siparişi onaylamak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Onayla', 
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              console.log(`${order.id} ID'li sipariş onaylanıyor...`);
              
              // Sipariş durumunu güncelle - enum değerini sayısal değere dönüştür
              const updatedOrder = await apiService.updateOrderStatus(order.id, OrderStatus.Approved);
              console.log('Sipariş onaylandı:', JSON.stringify(updatedOrder, null, 2));
              
              // Onaylanan siparişi bekleyenlerden kaldır
              setOrders(currentOrders => 
                currentOrders.filter(o => o.id !== order.id)
              );
              
              // Onaylanan siparişi tamamlananlara ekle
              setCompletedOrders(current => [
                {...order, Status: OrderStatus.Approved}, 
                ...current
              ]);
              
              Alert.alert(
                'Başarılı', 
                'Sipariş onaylandı.'
              );
            } catch (error) {
              console.error('Sipariş onaylanırken hata oluştu:', error);
              Alert.alert('Hata', 'Sipariş onaylanırken bir hata oluştu.');
              
              // Hata durumunda bekleyen ve tamamlanan siparişleri yenile
              fetchOrders();
              fetchCompletedOrders();
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectOrder = async (order: Order) => {
    console.log('handleRejectOrder çağrıldı, order:', JSON.stringify(order, null, 2));
    
    Alert.alert(
      'Sipariş Reddetme',
      `#${order.id} numaralı siparişi reddetmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Reddet', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log(`${order.id} ID'li sipariş reddediliyor...`);
              
              // Sipariş durumunu güncelle - enum değerini sayısal değere dönüştür
              const updatedOrder = await apiService.updateOrderStatus(order.id, OrderStatus.Rejected);
              console.log('Sipariş reddedildi:', JSON.stringify(updatedOrder, null, 2));
              
              // Reddedilen siparişi bekleyenlerden kaldır
              setOrders(currentOrders => 
                currentOrders.filter(o => o.id !== order.id)
              );
              
              // Reddedilen siparişi tamamlananlara ekle
              setCompletedOrders(current => [
                {...order, Status: OrderStatus.Rejected}, 
                ...current
              ]);
              
              Alert.alert(
                'Başarılı', 
                'Sipariş reddedildi.'
              );
            } catch (error) {
              console.error('Sipariş reddedilirken hata oluştu:', error);
              Alert.alert('Hata', 'Sipariş reddedilirken bir hata oluştu.');
              
              // Hata durumunda bekleyen ve tamamlanan siparişleri yenile
              fetchOrders();
              fetchCompletedOrders();
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleViewOrderDetails = async (order: Order) => {
    try {
      setLoading(true);
      console.log(`${order.id} ID'li siparişin detayları getiriliyor...`);
      
      // Sipariş ve içecek detaylarını API'den getir
      const response = await apiService.getOrderWithDrinks(order.id);
      console.log('API Yanıtı:', JSON.stringify(response, null, 2));
      
      // Serverdan gelen veriyi kontrol et (order ve orderDrinks olarak iki nesne bekliyoruz)
      const orderDetails = response.order || response;
      const orderDrinks = response.orderDrinks || [];
      
      console.log('Sipariş detayları:', JSON.stringify(orderDetails, null, 2));
      console.log('İçecek detayları (ham):', JSON.stringify(orderDrinks, null, 2));
      
      // Tüm içecekleri getir ve ID'leri ile eşleştir
      const allBeverages = await apiService.getBeverages();
      console.log('Tüm içecekler:', JSON.stringify(allBeverages, null, 2));
      
      // İçecek ID'leri ile adları eşleştirmek için map oluştur
      const beverageMap = new Map<number, string>();
      allBeverages.forEach(beverage => {
        if (beverage.id && beverage.name) {
          beverageMap.set(beverage.id, beverage.name);
        }
      });
      
      // İçecek bilgilerini formatla
      let orderDrinksInfo = 'İçecek bilgisi bulunamadı';
      let drinkCount = 0;
      
      if (orderDrinks && orderDrinks.length > 0) {
        drinkCount = orderDrinks.length;
        
        // İçecek listesini oluştur
        orderDrinksInfo = orderDrinks.map((drink: any) => {
          // Farklı olası içecek referanslarını kontrol et
          let beverageId = 0;
          let beverageName = '';
          
          // API yanıtında içeceğin nereden gelebileceğine dair tüm olasılıkları kontrol et
          if (drink.BeverageNavigation && drink.BeverageNavigation.name) {
            beverageName = drink.BeverageNavigation.name;
          } else if (drink.beverageNavigation && drink.beverageNavigation.name) {
            beverageName = drink.beverageNavigation.name;
          } else if (drink.Beverage && drink.Beverage.name) {
            beverageName = drink.Beverage.name;
          } else if (drink.beverage && drink.beverage.name) {
            beverageName = drink.beverage.name;
          } else {
            // İçecek referansı yoksa, ID ile içecek adını bul
            beverageId = drink.beverageid || drink.beverageId || drink.BeverageId || 0;
            beverageName = beverageMap.get(beverageId) || `İçecek #${beverageId}`;
          }
          
          const piece = drink.piece || 0;
          return `${beverageName} x ${piece} adet`;
        }).join('\n');
        
        console.log('Formatlı içecek bilgisi:', orderDrinksInfo);
      }
      
      // Durumu metne çevir
      let statusText = 'Bilinmiyor';
      const status = orderDetails.Status;
      switch(status) {
        case OrderStatus.Pending:
          statusText = 'Beklemede';
          break;
        case OrderStatus.Approved:
          statusText = 'Onaylandı';
          break;
        case OrderStatus.Rejected:
          statusText = 'Reddedildi';
          break;
      }
      
      // Sipariş detaylarını göster
      Alert.alert(
        `Sipariş #${orderDetails.id} Detayları`,
        `Oda: ${orderDetails.roomid}\nDurum: ${statusText}\nNot: ${orderDetails.notes || 'Yok'}\n\nSİPARİŞ İÇERİĞİ${drinkCount > 0 ? ` (${drinkCount} adet)` : ''}:\n${orderDrinksInfo}`
      );
    } catch (error) {
      console.error('Sipariş detayları alınırken hata oluştu:', error);
      Alert.alert('Hata', 'Sipariş detayları alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

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
              // Login ekranına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Çıkış yapılırken hata oluştu:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateTicketCount = (user: User) => {
    setSelectedUser(user);
    setNewTicketCount(user.TicketCount.toString());
    setTicketModalVisible(true);
  };

  const handleSaveTicketCount = async () => {
    if (!selectedUser) return;

    const ticketCount = parseInt(newTicketCount);
    if (isNaN(ticketCount) || ticketCount < 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir fiş sayısı girin.');
      return;
    }

    setLoading(true);
    try {
      console.log(`Fiş sayısı güncelleniyor: UserId=${selectedUser.Id}, NewCount=${ticketCount}`);
      const success = await apiService.updateUserTicketCount(selectedUser.Id, ticketCount);
      console.log('Fiş sayısı güncelleme sonucu:', success);
      
      if (success) {
        // Kullanıcı listesini güncelle
        setUsers(users.map(u => 
          u.Id === selectedUser.Id 
            ? { ...u, TicketCount: ticketCount } 
            : u
        ));
        setTicketModalVisible(false);
        setSelectedUser(null);
        setNewTicketCount('');
        Alert.alert('Başarılı', `${selectedUser.Username} kullanıcısının fiş sayısı güncellendi.`);
      } else {
        Alert.alert('Hata', 'Fiş sayısı güncellenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Fiş sayısı güncellenirken hata:', error);
      
      // Hata tipine göre farklı mesajlar göster
      if (error instanceof Error) {
        if (error.message.includes('JSON parse')) {
          Alert.alert('Hata', 'Sunucu yanıtı işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } else if (error.message.includes('401')) {
          handleAPIError(error, 'Fiş sayısı güncellenirken');
        } else {
          Alert.alert('Hata', `Fiş sayısı güncellenirken bir hata oluştu: ${error.message}`);
        }
      } else {
        Alert.alert('Hata', 'Fiş sayısı güncellenirken bilinmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivation = async (user: User) => {
    setLoading(true);
    try {
      let success;
      if (user.IsActive) {
        success = await apiService.deactivateUser(user.Id);
      } else {
        success = await apiService.activateUser(user.Id);
      }

      if (success) {
        // Kullanıcı listesini güncelle
        setUsers(users.map(u => 
          u.Id === user.Id 
            ? { ...u, IsActive: !u.IsActive } 
            : u
        ));
        Alert.alert(
          'Başarılı', 
          `${user.Username} kullanıcısı ${user.IsActive ? 'devre dışı bırakıldı' : 'etkinleştirildi'}.`
        );
      } else {
        Alert.alert('Hata', 'Kullanıcı durumu değiştirilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Kullanıcı durumu değiştirilirken hata:', error);
      Alert.alert('Hata', 'Kullanıcı durumu değiştirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // API hatalarını yakala ve işle
  const handleAPIError = (error: any, actionMsg: string) => {
    console.error(`${actionMsg} hatası:`, error);
    
    // Eğer 401 hatası ise, oturum süresi dolmuştur
    if (error.statusCode === 401) {
      Alert.alert(
        'Oturum Hatası', 
        'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login', params: { expired: true } }],
              });
            }
          }
        ]
      );
    } else {
      Alert.alert('Hata', `${actionMsg} bir hata oluştu.`);
    }
  };

  const renderTabContent = () => {
    console.log('renderTabContent çağrıldı, aktif sekme:', activeTab);
    
    // Form açıksa, ilgili formu göster
    if (showForm) {
      if (activeTab === 'beverages') {
        return (
          <BeverageForm
            beverage={selectedBeverage}
            onSave={handleSaveBeverage}
            onCancel={handleCancelForm}
          />
        );
      } else if (activeTab === 'rooms') {
        return (
          <RoomForm
            room={selectedRoom}
            onSave={handleSaveRoom}
            onCancel={handleCancelForm}
          />
        );
      }
    }
    
    // Değilse, seçilen sekmeye göre içeriği göster
    switch (activeTab) {
      case 'beverages':
        return (
          <BeverageList
            beverages={beverages}
            loading={loading}
            onEdit={handleEditBeverage}
            onDelete={handleDeleteBeverage}
            onToggleStatus={handleToggleBeverageStatus}
          />
        );
      case 'rooms':
        return (
          <RoomList
            rooms={rooms}
            loading={loading}
            onEdit={handleEditRoom}
            onDelete={handleDeleteRoom}
          />
        );
      case 'users':
        return (
          <UserList
            users={users}
            loading={loading}
            onUpdateTicketCount={handleUpdateTicketCount}
            onToggleActivation={handleToggleActivation}
          />
        );
      case 'orders':
        console.log('Sipariş listesi render ediliyor, toplam bekleyen sipariş:', orders.length);
        
        // Artık API'den sadece bekleyen siparişleri alıyoruz
        // Status kontrolü için basit bir doğrulama yapalım
        const validOrders = orders.map(order => {
          // Status kontrolü
          if (typeof order.Status === 'string') {
            let fixedStatus = OrderStatus.Pending; // Varsayılan olarak bekleyen
            if (order.Status === 'Pending' || order.Status === '0') {
              fixedStatus = OrderStatus.Pending;
            }
            return { ...order, Status: fixedStatus };
          }
          return order;
        });
        
        console.log('OrderList bileşenine gönderilen bekleyen siparişler:', 
          validOrders.map(o => ({ id: o.id, status: o.Status }))
        );
        
        return (
          <OrderList
            orders={validOrders}
            loading={loading}
            isAdmin={true}
            onApprove={handleApproveOrder}
            onReject={handleRejectOrder}
            onViewDetails={handleViewOrderDetails}
          />
        );
      case 'completed-orders':
        console.log('Tamamlanan sipariş listesi render ediliyor, toplam sipariş:', completedOrders.length);
        
        // Tamamlanmış siparişlerin durumlarını doğrula (approved veya rejected olmalı)
        const validCompletedOrders = completedOrders
          .filter(order => {
            // Önce Status alanını kontrol et
            const status = order.Status;
            
            // Status değeri doğru formatta mı?
            return status === OrderStatus.Approved || status === OrderStatus.Rejected;
          })
          .map(order => {
            // Log çıktısı
            console.log(`Tamamlanmış sipariş #${order.id}, Status: ${order.Status}`);
            
            // Orijinal siparişi döndür
            return order;
          });
        
        console.log('CompletedOrderList bileşenine gönderilen siparişler:', 
          validCompletedOrders.length,
          validCompletedOrders.map(o => ({ id: o.id, status: o.Status }))
        );
        
        return (
          <CompletedOrderList
            orders={validCompletedOrders}
            loading={loading}
            onViewDetails={handleViewOrderDetails}
          />
        );
      default:
        return null;
    }
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
              <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Admin Paneli</Text>
              <Text style={styles.headerSubtitle}>Yönetim Sistemi</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {/* Modern Tab Navigation */}
      <View style={styles.tabWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabContainer}
          contentContainerStyle={styles.tabContentContainer}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'beverages' && styles.activeTabButton]}
            onPress={() => setActiveTab('beverages')}
            disabled={showForm}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'beverages' && styles.activeTabIconContainer]}>
              <Ionicons 
                name="cafe" 
                size={18} 
                color={activeTab === 'beverages' ? '#ffffff' : '#667eea'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'beverages' && styles.activeTabText]}>
              İçecekler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'rooms' && styles.activeTabButton]}
            onPress={() => setActiveTab('rooms')}
            disabled={showForm}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'rooms' && styles.activeTabIconContainer]}>
              <Ionicons 
                name="home" 
                size={18} 
                color={activeTab === 'rooms' ? '#ffffff' : '#667eea'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'rooms' && styles.activeTabText]}>
              Odalar
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
            onPress={() => setActiveTab('users')}
            disabled={showForm}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'users' && styles.activeTabIconContainer]}>
              <Ionicons 
                name="people" 
                size={18} 
                color={activeTab === 'users' ? '#ffffff' : '#667eea'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Kullanıcılar
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'orders' && styles.activeTabButton]}
            onPress={() => setActiveTab('orders')}
            disabled={showForm}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'orders' && styles.activeTabIconContainer]}>
              <Ionicons 
                name="list" 
                size={18} 
                color={activeTab === 'orders' ? '#ffffff' : '#667eea'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
              Siparişler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed-orders' && styles.activeTabButton]}
            onPress={() => setActiveTab('completed-orders')}
            disabled={showForm}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, activeTab === 'completed-orders' && styles.activeTabIconContainer]}>
              <Ionicons 
                name="checkmark-done" 
                size={18} 
                color={activeTab === 'completed-orders' ? '#ffffff' : '#667eea'} 
              />
            </View>
            <Text style={[styles.tabText, activeTab === 'completed-orders' && styles.activeTabText]}>
              Tamamlanan
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <View style={styles.content}>
        {renderTabContent()}
      </View>
      
      {!showForm && (activeTab === 'beverages' || activeTab === 'rooms') && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => {
            console.log('+ butonuna tıklandı');
            if (activeTab === 'beverages') {
              handleAddBeverage();
            } else if (activeTab === 'rooms') {
              handleAddRoom();
            }
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* Fiş Sayısı Güncelleme Modalı */}
      <Modal
        visible={ticketModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="ticket" size={24} color="#667eea" />
              <Text style={styles.modalTitle}>Fiş Sayısı Güncelle</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedUser?.Username} kullanıcısının fiş sayısını değiştir
            </Text>
            
            <View style={styles.inputWrapper}>
              <Ionicons name="card" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                value={newTicketCount}
                onChangeText={setNewTicketCount}
                placeholder="Yeni fiş sayısı"
                placeholderTextColor="#94a3b8"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setTicketModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTicketCount}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  tabWrapper: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tabContentContainer: {
    paddingHorizontal: 4,
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeTabButton: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 68,
    height: 68,
    borderRadius: 34,
    elevation: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  // Modal stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 12,
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 28,
    lineHeight: 22,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#64748b',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  saveButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AdminScreen; 