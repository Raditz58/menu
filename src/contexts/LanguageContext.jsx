import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

const translations = {
  tr: {
    // Menu Page
    menu: 'Menü',
    cart: 'Sepet',
    myOrders: 'Siparişlerim',
    callWaiter: 'Garson Çağır',
    placeOrder: 'Siparişi Ver',
    total: 'Toplam',
    items: 'Ürün',
    item: 'Ürün',
    addToCart: 'Sepete Ekle',
    remove: 'Kaldır',
    emptyCart: 'Sepetiniz boş',
    noOrders: 'Henüz siparişiniz yok',
    
    // Order Statuses
    pending: 'Beklemede',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    delivered: 'Teslim Edildi',
    completed: 'Tamamlandı',
    paid: 'Ödendi',
    cancelled: 'İptal',
    
    // Actions
    confirm: 'Onayla',
    cancel: 'İptal',
    close: 'Kapat',
    save: 'Kaydet',
    delete: 'Sil',
    edit: 'Düzenle',
    add: 'Ekle',
    update: 'Güncelle',
    send: 'Gönder',
    create: 'Oluştur',
    back: 'Geri',
    refresh: 'Yenile',
    logout: 'Çıkış',
    changePassword: 'Şifre Değiştir',
    markAsRead: 'Okundu Olarak İşaretle',
    confirmDelete: 'Silmek istediğinize emin misiniz?',
    
    // Waiter Call
    waiterCalled: 'Garson çağrıldı',
    waiterCallSuccess: 'Garsonunuz en kısa sürede masanıza gelecektir.',
    activeCalls: 'Aktif Çağrılar',
    tableCallsYou: 'Sizi çağırıyor!',
    
    // Feedback
    feedback: 'Geri Bildirim',
    feedbackPlaceholder: 'Görüş ve önerilerinizi buraya yazın...',
    feedbackSuccess: 'Geri bildiriminiz alındı. Teşekkürler!',
    sendFeedback: 'Geri Bildirim Gönder',
    noFeedback: 'Henüz geri bildirim yok',
    
    // Cart & Orders
    yourCart: 'Sepetiniz',
    orderSummary: 'Sipariş Özeti',
    orderPlaced: 'Siparişiniz alındı!',
    orderNumber: 'Sipariş No',
    
    // Admin Sidebar
    dashboard: 'Panel',
    overview: 'Genel Bakış',
    management: 'Yönetim',
    categories: 'Kategoriler',
    products: 'Ürünler',
    tables: 'Masalar',
    staff: 'Personel',
    orders: 'Siparişler',
    settings: 'Ayarlar',
    adminFeedback: 'Geri Bildirimler',
    loggedInAs: 'Oturum açan:',
    
    // Dashboard Stats
    dailyRevenue: 'Günlük Ciro',
    paidOrdersOnly: 'Ödendi / Tamamlandı',
    orderCountToday: 'Bugünkü Sipariş',
    allStatusesToday: 'Tüm durumlar',
    cancelledItemsToday: 'İptal Edilen Ürün',
    itemLevelCancellations: 'Bugün iptal edilen kalemler',
    totalOrders: 'Toplam Sipariş',
    avgPrepTime: 'Ort. Hazırlama',
    avgServiceTime: 'Ort. Servis',
    topSelling: 'Çok Satanlar',
    activeTables: 'Aktif Masalar',
    liveTables: 'Canlı Masa Durumu',
    occupied: 'Dolu',
    sold: 'adet',
    todaysOrders: 'Bugünün Siparişleri',
    time: 'Saat',
    detail: 'Detay',
    cancelledShort: 'iptal',
    cancelledItem: 'İptal Edildi',
    excludesCancelled: 'İptaller hariç',
    
    // Management card descriptions
    manageCategoriesDesc: 'Menü kategorilerini yönet',
    manageProductsDesc: 'Ürünleri ve fiyatları güncelle',
    manageTablesDesc: 'QR kodlar ve masa düzeni',
    manageStaffDesc: 'Ekip erişimini yönet',
    
    // Common
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    search: 'Ara...',
    noData: 'Veri yok',
    required: 'Zorunlu',
    name: 'İsim',
    price: 'Fiyat',
    description: 'Açıklama',
    image: 'Görsel',
    category: 'Kategori',
    status: 'Durum',
    date: 'Tarih',
    table: 'Masa',
    role: 'Rol',
    email: 'E-posta',
    password: 'Şifre',
    actions: 'İşlemler',
    username: 'Kullanıcı Adı',
    active: 'Aktif',
    passive: 'Pasif',
    activate: 'Aktif Et',
    deactivate: 'Pasife Al',
    unauthorized: 'Yetkisiz İşlem',
    
    // Forms & Inputs
    categoryName: 'Kategori Adı',
    namePlaceholder: 'Örn. Başlangıçlar',
    order: 'Sıra',
    selectCategory: 'Kategori Seçin',
    uncategorized: 'Kategorisiz',
    available: 'Mevcut',
    unavailable: 'MEVCUT DEĞİL',
    clickToUpload: 'Yüklemek için tıklayın',
    uploading: 'Yükleniyor...',
    waitImageUpload: 'Lütfen görselin yüklenmesini bekleyin.',
    uploadError: 'Görsel yüklenemedi',
    
    // Password Modal
    passwordMismatch: 'Şifreler uyuşmuyor',
    passwordLengthError: 'Şifre en az 6 karakter olmalı',
    incorrectPassword: 'Mevcut şifre yanlış',
    tooManyRequests: 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.',
    currentPassword: 'Mevcut Şifre',
    confirmPassword: 'Şifreyi Onayla',
    newPassword: 'Yeni Şifre',
    
    // Feedback page
    feedbackSubtitle: 'Müşteri geri bildirimlerini görüntüleyin ve yönetin',
    all: 'Tümü',
    unread: 'Okunmadı',
    read: 'Okundu',
    unreadFeedbackMessage: 'adet okunmamış geri bildirim var.',
  },
  en: {
    // Menu Page
    menu: 'Menu',
    cart: 'Cart',
    myOrders: 'My Orders',
    callWaiter: 'Call Waiter',
    placeOrder: 'Place Order',
    total: 'Total',
    items: 'Items',
    item: 'Item',
    addToCart: 'Add to Cart',
    remove: 'Remove',
    emptyCart: 'Your cart is empty',
    noOrders: 'You have no orders yet',
    
    // Order Statuses
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready',
    delivered: 'Delivered',
    completed: 'Completed',
    paid: 'Paid',
    cancelled: 'Cancelled',
    
    // Actions
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    update: 'Update',
    send: 'Send',
    create: 'Create',
    back: 'Back',
    refresh: 'Refresh',
    logout: 'Logout',
    changePassword: 'Change Password',
    markAsRead: 'Mark as Read',
    confirmDelete: 'Are you sure you want to delete this?',
    
    // Waiter Call
    waiterCalled: 'Waiter Called',
    waiterCallSuccess: 'Your waiter will be with you shortly.',
    activeCalls: 'Active Calls',
    tableCallsYou: 'is calling you!',
    
    // Feedback
    feedback: 'Feedback',
    feedbackPlaceholder: 'Share your thoughts and suggestions here...',
    feedbackSuccess: 'Thank you for your feedback!',
    sendFeedback: 'Send Feedback',
    noFeedback: 'No feedback yet',
    
    // Cart & Orders
    yourCart: 'Your Cart',
    orderSummary: 'Order Summary',
    orderPlaced: 'Your order has been placed!',
    orderNumber: 'Order No',
    
    // Admin Sidebar
    dashboard: 'Dashboard',
    overview: 'Overview',
    management: 'Management',
    categories: 'Categories',
    products: 'Products',
    tables: 'Tables',
    staff: 'Staff',
    orders: 'Orders',
    settings: 'Settings',
    adminFeedback: 'Feedback',
    loggedInAs: 'Logged in as:',
    
    // Dashboard Stats
    dailyRevenue: 'Daily Revenue',
    paidOrdersOnly: 'Paid / Completed',
    orderCountToday: "Today's Orders",
    allStatusesToday: 'All statuses',
    cancelledItemsToday: 'Cancelled Items',
    itemLevelCancellations: 'Item-level cancellations today',
    totalOrders: 'Total Orders',
    avgPrepTime: 'Avg. Prep Time',
    avgServiceTime: 'Avg. Service Time',
    topSelling: 'Top Selling',
    activeTables: 'Active Tables',
    liveTables: 'Live Tables',
    occupied: 'Occupied',
    sold: 'sold',
    todaysOrders: "Today's Orders",
    time: 'Time',
    detail: 'Detail',
    cancelledShort: 'cancelled',
    cancelledItem: 'Cancelled',
    excludesCancelled: 'excl. cancelled',
    
    // Management card descriptions
    manageCategoriesDesc: 'Manage menu categories',
    manageProductsDesc: 'Update items & prices',
    manageTablesDesc: 'QR codes & table layout',
    manageStaffDesc: 'Manage team access',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    search: 'Search...',
    noData: 'No data available',
    required: 'Required',
    name: 'Name',
    price: 'Price',
    description: 'Description',
    image: 'Image',
    category: 'Category',
    status: 'Status',
    date: 'Date',
    table: 'Table',
    role: 'Role',
    email: 'Email',
    password: 'Password',
    actions: 'Actions',
    username: 'Username',
    active: 'Active',
    passive: 'Passive',
    activate: 'Activate',
    deactivate: 'Deactivate',
    unauthorized: 'Unauthorized Action',
    
    // Forms & Inputs
    categoryName: 'Category Name',
    namePlaceholder: 'e.g. Starters',
    order: 'Order',
    selectCategory: 'Select Category',
    uncategorized: 'Uncategorized',
    available: 'Available',
    unavailable: 'UNAVAILABLE',
    clickToUpload: 'Click to upload',
    uploading: 'Uploading...',
    waitImageUpload: 'Please wait for the image to finish uploading.',
    uploadError: 'Image upload failed',
    
    // Password Modal
    passwordMismatch: 'Passwords do not match',
    passwordLengthError: 'Password must be at least 6 characters',
    incorrectPassword: 'Incorrect current password',
    tooManyRequests: 'Too many attempts. Please try again later.',
    currentPassword: 'Current Password',
    confirmPassword: 'Confirm Password',
    newPassword: 'New Password',

    // Feedback page
    feedbackSubtitle: 'View and manage customer messages',
    all: 'All',
    unread: 'Unread',
    read: 'Read',
    unreadFeedbackMessage: 'unread feedback messages.',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('tr'); // Default to Turkish

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'tr' ? 'en' : 'tr');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
