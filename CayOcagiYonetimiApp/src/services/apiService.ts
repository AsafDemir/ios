// API servis sınıfı - Backend ile iletişim kuran merkezi servis
import { Beverage, CreateOrderRequest, LoginRequest, LoginResponse, Order, OrderStatus, Room, User, UserRole, OrderDrink } from '../models/types';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API hata sınıfı - API isteklerinde oluşan hataları yönetir
class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}

// JWT token payload arayüzü - Token içeriğini tanımlar
interface JWTPayload {
  // AuthService.cs'de ClaimTypes.NameIdentifier için "nameid" kullanılıyor
  nameid?: string; // userId
  // ClaimTypes.Name için "unique_name" kullanılıyor
  unique_name?: string; // username
  // ClaimTypes.Role için "role" kullanılıyor
  role?: string; // userRole
  // Standart JWT alanları
  exp?: number; // expiration
  nbf?: number; // not before
  iat?: number; // issued at
  iss?: string; // issuer
  aud?: string; // audience
  
  // JWT library'nin farklı şekilde adlandırabileceği alternatif alanlar
  sub?: string; // subject - bazen userId olarak da kullanılır
  name?: string; // username için alternatif
}

// Ana API servis sınıfı - Singleton pattern kullanarak tek instance sağlar
class APIService {
  private static instance: APIService;
  private token: string | null = null;
  
  // Program.cs dosyasından alındığı üzere API http://localhost:5001 üzerinde çalışıyor
  private baseURL = __DEV__ 
    ? 'http://localhost:5001/api' // Development 
    : 'https://api.cayocagi.com/api'; // Production - Güncellenebilir

  private constructor() {}

  // Singleton instance getter - Tek API servis instance'ı döndürür
  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  // Token yönetim metodları - Kullanıcı kimlik doğrulama token'ını yönetir
  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
  }

  // JWT token çözümleme metodu - Token içeriğini okur ve döndürür
  decodeToken(): JWTPayload | null {
    if (!this.token) return null;
    
    try {
      console.log('Token çözümleniyor...');
      const decodedToken = jwtDecode<JWTPayload>(this.token);
      console.log('Çözümlenmiş token:', JSON.stringify(decodedToken, null, 2));
      return decodedToken;
    } catch (error) {
      console.error('Token decode hatası:', error);
      return null;
    }
  }

  // Token'dan kullanıcı ID'si çıkarma metodu
  getUserIdFromToken(): number | null {
    const payload = this.decodeToken();
    if (!payload) {
      console.error('Token payload\'ı çözümlenemedi');
      return null;
    }
    
    // Olası user id alanlarını kontrol et
    const userId = payload.nameid || payload.sub;
    
    if (!userId) {
      console.error('Token\'da userId bulunamadı');
      return null;
    }
    
    try {
      return parseInt(userId);
    } catch (error) {
      console.error('UserId sayıya çevrilemedi:', userId);
      return null;
    }
  }

  // Genel HTTP istek metodu - Tüm API istekleri için merkezi metod
  private async request<T>(
    endpoint: string, 
    method: string = 'GET', 
    body?: any, 
    requiresAuth: boolean = true
  ): Promise<T> {
    console.log(`API ${method} isteği: ${this.baseURL}${endpoint}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Token kontrolü - geçerli mi değil mi
    if (requiresAuth) {
      if (!this.token) {
        console.error('Token bulunamadı. Kullanıcı giriş yapmamış olabilir.');
        await this.handleAuthError();
        throw new APIError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 401);
      }
      
      // Token'ın süresinin dolup dolmadığını kontrol et
      const tokenExpired = this.isTokenExpired();
      if (tokenExpired) {
        console.error('Token süresi dolmuş.');
        await this.handleAuthError();
        throw new APIError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', 401);
      }
      
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log('İstek başlıkları:', JSON.stringify(headers));
    if (body) {
      console.log('İstek gövdesi:', JSON.stringify(body));
    }

    // HTTP isteği gönderme ve yanıt işleme
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      console.log('API yanıt durum kodu:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          await this.handleAuthError();
          throw new APIError('Oturum süresi doldu. Lütfen tekrar giriş yapın.', 401);
        }
        
        let errorMessage = `Sunucu hatası: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('API hata yanıtı:', errorData);
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch {
          const errorText = await response.text();
          console.error('API hata metni:', errorText);
          errorMessage += ` - ${errorText}`;
        }
        
        throw new APIError(errorMessage, response.status);
      }

      // Yanıt içeriğini kontrol et
      const contentType = response.headers.get('content-type');
      console.log('Yanıt content-type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const responseText = await response.text();
        console.log('API yanıt metni:', responseText);
        
        if (!responseText.trim()) {
          // Boş yanıt
          return {} as T;
        }
        
        try {
          const responseData = JSON.parse(responseText);
          console.log('API yanıt gövdesi:', JSON.stringify(responseData, null, 2));
          return responseData;
        } catch (parseError) {
          console.error('API yanıtı JSON olarak parse edilemedi:', parseError);
          console.error('Response status:', response.status);
          console.error('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
          // JSON parse edilemezse, düz metin olarak döndür
          return responseText as unknown as T;
        }
      } else {
        // JSON olmayan yanıt (düz metin)
        const responseText = await response.text();
        console.log('API yanıt metni (düz metin):', responseText);
        return responseText as unknown as T;
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      console.error('API isteği sırasında hata oluştu:', error);
      throw new APIError('Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.');
    }
  }

  // Token süre kontrolü - Token'ın süresinin dolup dolmadığını kontrol eder
  private isTokenExpired(): boolean {
    if (!this.token) return true;
    
    try {
      const payload = this.decodeToken();
      if (!payload || !payload.exp) return true;
      
      // Token süresi doldu mu kontrol et (5 dakika marj bırak)
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;
      
      console.log(`Token süresi kontrolü - Şu anki zaman: ${currentTime}, Token süresi: ${expirationTime}`);
      
      // Sürenin dolmasına 5 dakika veya daha az kaldıysa süresi dolmuş say
      const timeMargin = 300; // 5 dakika (saniye cinsinden)
      return currentTime >= expirationTime - timeMargin;
    } catch (error) {
      console.error('Token süresi kontrol edilirken hata oluştu:', error);
      return true; // Hata olursa, güvenli tarafta kalmak için true döndür
    }
  }
  
  // Kimlik doğrulama hatası işleme - Token geçersizliği durumunda çağrılır
  private async handleAuthError(): Promise<void> {
    console.log('Kimlik doğrulama hatası işleniyor...');
    
    // Token'ı temizle
    this.clearToken();
    
    // AsyncStorage'dan token'ı sil
    try {
      await AsyncStorage.removeItem('auth_token');
      console.log('Token AsyncStorage\'dan silindi');
    } catch (error) {
      console.error('Token AsyncStorage\'dan silinirken hata oluştu:', error);
    }
    
    // Bu noktada kullanıcıyı Login ekranına yönlendirmek isteyebiliriz,
    // ancak APIService sınıfından doğrudan navigation yapamayız.
    // Bu sorunu çözmek için bir event emitter veya callback kullanabiliriz.
    // Şimdilik bu işlevi kullanıcı hata yakaladığında manuel olarak yapacağız.
  }

  // Kullanıcı giriş metodu - Kullanıcı adı ve şifre ile giriş yapar
  async login(username: string, password: string): Promise<LoginResponse> {
    // AuthController.cs ve LoginDto.cs'e göre kullanıcı adı ve şifre alanları
    // büyük harfle başlıyor: Username, Password
    const body: LoginRequest = { 
      Username: username, 
      Password: password 
    };
    
    // Login yanıtını al
    const response = await this.request<LoginResponse>('/Auth/login', 'POST', body, false);
    
    // Token'ı kaydet
    if (response && response.token) {
      this.setToken(response.token);
      
      // AsyncStorage'a token'ı kaydet
      try {
        await AsyncStorage.setItem('auth_token', response.token);
        console.log('Token AsyncStorage\'a kaydedildi');
      } catch (error) {
        console.error('Token AsyncStorage\'a kaydedilirken hata oluştu:', error);
      }
    }
    
    return response;
  }

  // Token yükleme metodu - AsyncStorage'dan kaydedilmiş token'ı yükler
  async loadToken(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        console.log('Kaydedilmiş token bulundu');
        this.setToken(token);
        
        // Token geçerli mi kontrol et
        if (this.isTokenExpired()) {
          console.log('Kaydedilmiş token süresi dolmuş');
          await this.handleAuthError();
          return false;
        }
        
        return true;
      }
    } catch (error) {
      console.error('Token yüklenirken hata oluştu:', error);
    }
    return false;
  }

  // Çıkış metodu - Kullanıcı oturumunu sonlandırır
  async logout(): Promise<void> {
    // Token'ı temizle
    await this.handleAuthError();
  }

  // Kullanıcı bilgisi getirme metodu
  async getUser(userId: number): Promise<User> {
    return this.request<User>(`/User/${userId}`);
  }

  // Kullanıcı fiş sayısı getirme metodu
  async getUserTicketCount(userId: number): Promise<number> {
    return this.request<number>(`/User/${userId}/ticket-count`);
  }

  // İçecek yönetim metodları - İçecek ekleme, güncelleme, silme işlemleri
  async addBeverage(beverage: Omit<Beverage, 'id'>): Promise<Beverage> {
    return this.request<Beverage>('/Beverages', 'POST', beverage);
  }

  async updateBeverage(id: number, beverage: Partial<Beverage>): Promise<Beverage> {
    // Backend'de id kontrolü yapıldığı için body'ye id'yi de ekleyelim
    const beverageWithId = { ...beverage, id };
    return this.request<Beverage>(`/Beverages/${id}`, 'PUT', beverageWithId);
  }

  async deleteBeverage(id: number): Promise<boolean> {
    await this.request<void>(`/Beverages/${id}`, 'DELETE');
    return true;
  }

  // İçecek durumu değiştirme metodu - Aktif/pasif durumunu tersine çevirir
  async toggleBeverageStatus(id: number): Promise<Beverage> {
    // BeveragesController.cs'daki ToggleBeverageActive metoduna göre
    // endpoint: api/beverages/{id}/toggle-active
    // İçeriğe gerek yok, zaten backend içecek durumunu tersine çeviriyor
    return this.request<Beverage>(`/Beverages/${id}/toggle-active`, 'PATCH');
  }

  // İçecek listesi getirme metodu - Kullanıcı rolüne göre farklı listeler döndürür
  async getBeverages(): Promise<Beverage[]> {
    // Admin rolündeki kullanıcılar için tüm içecekleri getir
    const isAdmin = this.isUserAdmin();
    if (isAdmin) {
      return this.request<Beverage[]>('/Beverages/all');
    }
    // Normal kullanıcılar için sadece aktif içecekleri getir
    return this.request<Beverage[]>('/Beverages');
  }

  // Admin kontrolü - Kullanıcının admin olup olmadığını kontrol eder
  private isUserAdmin(): boolean {
    const payload = this.decodeToken();
    return payload?.role === 'Admin';
  }

  // Oda yönetim metodları - Oda ekleme, güncelleme, silme işlemleri
  async getRooms(): Promise<Room[]> {
    return this.request<Room[]>('/Rooms');
  }

  async createRoom(name: string): Promise<Room> {
    return this.request<Room>('/Rooms', 'POST', { name });
  }

  async updateRoom(id: number, name: string): Promise<Room> {
    // Backend'de id kontrolü yapıldığı için body'ye id'yi de ekleyelim
    const roomWithId = { id, name };
    return this.request<Room>(`/Rooms/${id}`, 'PUT', roomWithId);
  }

  async deleteRoom(id: number): Promise<boolean> {
    await this.request<void>(`/Rooms/${id}`, 'DELETE');
    return true;
  }

  // Sipariş yönetim metodları - Sipariş oluşturma ve durum güncelleme işlemleri
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    return this.request<Order>('/Orders', 'POST', request);
  }

  // Sipariş durumu güncelleme metodu - Admin tarafından sipariş onaylama/reddetme
  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    console.log(`Sipariş durumu güncelleniyor: ID=${orderId}, Status=${status}`);
    
    // OrderStatus'un sayısal değer olduğundan emin olalım
    let statusValue = status;
    if (typeof status !== 'number') {
      // Eğer status bir enum string ise, sayısal değere dönüştürelim
      if (status === 'Pending' || status === OrderStatus[OrderStatus.Pending]) {
        statusValue = OrderStatus.Pending;
      } else if (status === 'Approved' || status === OrderStatus[OrderStatus.Approved]) {
        statusValue = OrderStatus.Approved;
      } else if (status === 'Rejected' || status === OrderStatus[OrderStatus.Rejected]) {
        statusValue = OrderStatus.Rejected;
      }
    }
    
    console.log(`Gönderilecek durum değeri: Status=${statusValue}`);
    
    // OrdersController'daki PatchOrder metodu ile uyumlu olmalı:
    // - Endpoint: /Orders/{id} (PATCH)
    // - Body: { Status: status }
    try {
      const response = await this.request<Order>(`/Orders/${orderId}`, 'PATCH', { Status: statusValue });
      console.log('Sipariş durumu güncellendi:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('Sipariş durumu güncellenirken hata oluştu:', error);
      throw error;
    }
  }

  // Sipariş içeceği ekleme metodu
  async addOrderDrink(orderId: number, beverageId: number, piece: number): Promise<any> {
    const body = {
      orderid: orderId,
      beverageid: beverageId,
      piece: piece
    };
    return this.request<any>('/Orderdrinks', 'POST', body);
  }

  // Kullanıcının kendi siparişlerini getirme metodu
  async getMyOrders(): Promise<Order[]> {
    return this.request<Order[]>('/Orders/my-orders');
  }

  // Tüm siparişleri getirme metodu (Admin için)
  async getAllOrders(): Promise<Order[]> {
    // İçecek detaylarını içerecek şekilde tüm siparişleri getir
    return this.request<Order[]>('/Orders?includeDetails=true');
  }
  
  // Sipariş alanlarını normalleştiren yardımcı fonksiyon
  private normalizeOrderFields(order: any): Order {
    // API'den gelen küçük harfli alan adlarını büyük harfli hale getir (status -> Status)
    const normalizedOrder: any = {...order};
    
    // status -> Status dönüşümü
    if (normalizedOrder.status !== undefined && normalizedOrder.Status === undefined) {
      normalizedOrder.Status = normalizedOrder.status;
      
      // Status, sayısal değere dönüştürülmeli
      if (typeof normalizedOrder.Status === 'string') {
        if (normalizedOrder.Status === 'Pending' || normalizedOrder.Status === '0' || normalizedOrder.Status === 0) {
          normalizedOrder.Status = OrderStatus.Pending;
        } else if (normalizedOrder.Status === 'Approved' || normalizedOrder.Status === '1' || normalizedOrder.Status === 1) {
          normalizedOrder.Status = OrderStatus.Approved;
        } else if (normalizedOrder.Status === 'Rejected' || normalizedOrder.Status === '2' || normalizedOrder.Status === 2) {
          normalizedOrder.Status = OrderStatus.Rejected;
        }
      }
    }
    
    // userId -> UserId dönüşümü
    if (normalizedOrder.userId !== undefined && normalizedOrder.UserId === undefined) {
      normalizedOrder.UserId = normalizedOrder.userId;
    }
    
    // user içindeki alanları da normalleştir
    if (normalizedOrder.user) {
      const user = normalizedOrder.user;
      normalizedOrder.User = {
        Id: user.id || user.Id,
        Username: user.username || user.Username,
        Role: user.role !== undefined ? user.role : (user.Role !== undefined ? user.Role : 1),
        TicketCount: user.ticketCount !== undefined ? user.ticketCount : (user.TicketCount !== undefined ? user.TicketCount : 0),
        IsActive: user.isActive !== undefined ? user.isActive : (user.IsActive !== undefined ? user.IsActive : true)
      };
    }
    
    return normalizedOrder as Order;
  }

  // Bekleyen siparişleri getirme metodu (Admin için)
  async getPendingOrders(): Promise<Order[]> {
    // OrdersController.cs'deki GetPendingOrders metoduna göre endpoint: api/Orders/pending
    console.log('Bekleyen siparişler getiriliyor...');
    try {
      const response = await this.request<any>('/Orders/pending');
      
      // API'nin döndürdüğü formatı kontrol et
      if (!response) {
        console.warn('API boş yanıt döndürdü');
        return [];
      }
      
      // API'nin döndürdüğü formatı incele - { success, data, count } formatında mı?
      let pendingOrdersData = response;
      if (response.success && Array.isArray(response.data)) {
        pendingOrdersData = response.data;
        console.log(`API'den ${response.count} adet bekleyen sipariş alındı`);
      } else if (!Array.isArray(response)) {
        console.warn('API beklenen formatta veri döndürmedi:', response);
        return [];
      }
      
      // Tüm siparişleri normalleştir
      const normalizedOrders = pendingOrdersData.map((order: any) => this.normalizeOrderFields(order));
      
      console.log(`${normalizedOrders.length} adet bekleyen sipariş işlendi`);
      return normalizedOrders;
    } catch (error) {
      console.error('Bekleyen siparişler alınırken hata oluştu:', error);
      throw error;
    }
  }
  
  // Sipariş detayları getirme metodu
  async getOrderDetails(orderId: number): Promise<Order> {
    // IncludeDetails parametresi ekleyerek ilişkili içeceklerin gelmesini sağla
    return this.request<Order>(`/Orders/${orderId}?includeDetails=true`);
  }
  
  // Sipariş ve içecek detaylarını birlikte getirme metodu
  async getOrderWithDrinks(orderId: number): Promise<{order: Order, orderDrinks: OrderDrink[]}> {
    return this.request<{order: Order, orderDrinks: OrderDrink[]}>(`/Orders/${orderId}`);
  }
  
  // Sipariş içeceklerini getirme metodu
  async getOrderDrinks(orderId: number): Promise<OrderDrink[]> {
    // OrderdrinksController'da tanımlı endpoint'i kullan: api/orderdrinks/by-order/{orderId}
    return this.request<OrderDrink[]>(`/Orderdrinks/by-order/${orderId}`);
  }

  // Kullanıcı yönetim metodları - Admin tarafından kullanıcı yönetimi
  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/User');
  }
  
  // Kullanıcı fiş sayısı güncelleme metodu
  async updateUserTicketCount(userId: number, newTicketCount: number): Promise<boolean> {
    console.log(`Fiş sayısı güncelleniyor: UserId=${userId}, NewCount=${newTicketCount}`);
    try {
      // UserController.cs'deki UpdateTicketCount metoduna göre
      // endpoint: api/User/ticket-count (PUT)
      // body: { UserId: userId, NewTicketCount: newTicketCount }
      await this.request<string>(`/User/ticket-count`, 'PUT', { 
        UserId: userId, 
        NewTicketCount: newTicketCount 
      });
      console.log('Fiş sayısı güncelleme sonucu: true');
      return true;
    } catch (error) {
      console.error('Fiş sayısı güncellenirken hata oluştu:', error);
      return false;
    }
  }
  
  // Kullanıcı etkinleştirme metodu
  async activateUser(userId: number): Promise<boolean> {
    try {
      const response = await this.request<{ success: boolean, message: string }>(`/User/${userId}/activate`, 'POST');
      return response.success || true;
    } catch (error) {
      console.error('Kullanıcı etkinleştirilirken hata oluştu:', error);
      return false;
    }
  }
  
  // Kullanıcı devre dışı bırakma metodu
  async deactivateUser(userId: number): Promise<boolean> {
    try {
      const response = await this.request<{ success: boolean, message: string }>(`/User/${userId}/deactivate`, 'POST');
      return response.success || true;
    } catch (error) {
      console.error('Kullanıcı devre dışı bırakılırken hata oluştu:', error);
      return false;
    }
  }
  
  // Tamamlanan siparişleri getirme metodu
  async getCompletedOrders(): Promise<Order[]> {
    // OrdersController.cs'deki GetCompletedOrders metoduna göre endpoint: api/Orders/completed
    console.log('Tamamlanan siparişler getiriliyor...');
    try {
      const response = await this.request<any>('/Orders/completed');
      
      // API'nin döndürdüğü formatı kontrol et
      if (!response) {
        console.warn('API boş yanıt döndürdü');
        return [];
      }
      
      // API'nin döndürdüğü formatı incele - { success, data, count } formatında mı?
      let completedOrdersData = response;
      if (response.success && Array.isArray(response.data)) {
        completedOrdersData = response.data;
        console.log(`API'den ${response.count} adet tamamlanmış sipariş alındı`);
      } else if (!Array.isArray(response)) {
        console.warn('API beklenen formatta veri döndürmedi:', response);
        return [];
      }
      
      // Tüm siparişleri normalleştir
      const normalizedOrders = completedOrdersData.map((order: any) => this.normalizeOrderFields(order));
      
      console.log(`${normalizedOrders.length} adet tamamlanmış sipariş işlendi`);
      return normalizedOrders;
    } catch (error) {
      console.error('Tamamlanan siparişler alınırken hata oluştu:', error);
      throw error;
    }
  }
}

// Singleton instance export - Uygulama genelinde tek API servis instance'ı kullanılır
export default APIService.getInstance(); 