// Uygulama veri modelleri ve tip tanımlamaları

// İçecek veri modeli - Çay ocağında satılan içeceklerin bilgilerini tutar
export interface Beverage {
  id: number;
  name: string | null;
  price: number | null;
  pics: string | null;
  active: boolean | null;
}

// Sipariş durumu enum - Siparişlerin mevcut durumlarını belirtir
export enum OrderStatus {
  Pending = 0,    // Beklemede
  Approved = 1,   // Onaylandı
  Rejected = 2    // Reddedildi
}

// Sipariş içeceği veri modeli - Bir siparişte hangi içeceklerden kaç adet olduğunu tutar
export interface OrderDrink {
  id: number;
  orderid: number;
  beverageid: number;
  piece: number;
  BeverageNavigation?: Beverage;
  OrderNavigation?: Order;
}

// Sipariş veri modeli - Kullanıcıların verdiği siparişlerin bilgilerini tutar
export interface Order {
  id: number;
  notes: string | null;
  roomid: number;
  Status: OrderStatus;
  UserId: number | null;
  User?: User;
  OrderDrinks?: OrderDrink[];
  createdAt?: string; // Sipariş oluşturma tarihi - API'den gelebilir
}

// Yeni sipariş içeceği oluşturma modeli - API'ye gönderilecek veri formatı
export interface CreateOrderDrink {
  beverageid: number;
  piece: number;
}

// Yeni sipariş oluşturma modeli - API'ye gönderilecek veri formatı
export interface CreateOrderRequest {
  notes: string;
  roomid: number;
}

// Oda veri modeli - Çay ocağındaki odaların bilgilerini tutar
export interface Room {
  id: number;
  name: string;
}

// Kullanıcı rolü enum - Kullanıcıların sistem içindeki yetkilerini belirtir
export enum UserRole {
  Admin = 0,  // Yönetici
  User = 1    // Normal kullanıcı
}

// Kullanıcı veri modeli - Sistem kullanıcılarının bilgilerini tutar
export interface User {
  Id: number;
  Username: string;
  Role: UserRole;
  TicketCount: number;
  IsActive: boolean;
}

// Giriş yanıtı modeli - API'den dönen giriş token'ını tutar
export interface LoginResponse {
  token: string;
}

// Giriş isteği modeli - API'ye gönderilecek giriş bilgilerini tutar
export interface LoginRequest {
  Username: string;
  Password: string;
} 