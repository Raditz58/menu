import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { Truck, CheckCircle, Bell, Coffee, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function ServiceView({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevOrderCountRef = useRef(0);
  const prevNotifCountRef = useRef(0);

  // Listen for Ready orders
  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'ready'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (list.length > prevOrderCountRef.current) {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.play().catch(e => { /* Error suppressed */ });
      }
      prevOrderCountRef.current = list.length;

      setOrders(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurantId]);

  // Listen for Waiter Call Notifications
  useEffect(() => {
    // Note: Creating a query with multiple equalities and orderBy often requires a composite index.
    // If it fails, remove orderBy and sort client-side.
    let q = query(
      collection(db, 'notifications'),
      where('restaurantId', '==', restaurantId),
      where('type', '==', 'waiter_call'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Client-side sort by createdAt descending
      list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
      });

      // Play sound if new notification
      if (list.length > prevNotifCountRef.current) {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.play().catch(e => { /* Error suppressed */ });
      }
      prevNotifCountRef.current = list.length;

      setNotifications(list);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [restaurantId]);

  const markDelivered = async (orderId) => {
    const ref = doc(db, 'orders', orderId);
    try {
      await updateDoc(ref, { 
        status: 'delivered',
        deliveredAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Failed to update order status.");
    }
  };

  const dismissNotification = async (notificationId) => {
    const ref = doc(db, 'notifications', notificationId);
    try {
      await updateDoc(ref, {
        status: 'completed',
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8 text-gray-800">
          <Bell className="text-green-600 fill-green-100" /> Servis İstasyonu
          <span className="bg-green-100 text-green-700 text-sm py-1 px-3 rounded-full font-medium ml-2">
            {orders.length} Hazır
          </span>
        </h1>

        {/* Waiter Call Notifications Section */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-orange-600">
              <Bell className="text-orange-500 animate-pulse fill-orange-100" size={28} />
              Aktif Çağrılar
              <span className="bg-orange-600 text-white text-sm py-1 px-3 rounded-full font-bold shadow-lg animate-bounce">
                {notifications.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {notifications.map(notif => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className="bg-white border-l-8 border-orange-500 rounded-xl p-6 shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500 animate-pulse"></div>
                    
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                      <X size={20} />
                    </button>
                    
                    <div className="flex flex-col mb-4">
                      <h3 className="text-4xl font-black text-gray-800 tracking-tight">Masa {notif.tableCode}</h3>
                      <span className="text-orange-600 font-bold text-lg flex items-center gap-2 mt-2">
                        <Bell className="animate-wiggle" size={20} /> Sizi çağırıyor!
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-lg">
                       <span className="font-mono">{notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Şimdi'}</span>
                       <span>•</span>
                       <span>Bekleniyor...</span>
                    </div>
                    
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-green-200 transition-all transform active:scale-95"
                    >
                      <CheckCircle size={24} />
                      Tamamlandı
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Ready Orders Section */}
        <h2 className="text-xl font-bold mb-4">Teslime Hazır ({orders.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {orders.length === 0 && notifications.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full py-24 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50"
              >
                <Coffee size={48} className="mb-4 text-gray-300" />
                <p className="text-xl font-medium">Tüm siparişler tamam!</p>
                <p className="text-sm">Bekleyen sipariş veya garson çağrısı yok.</p>
              </motion.div>
            )}

            {orders.map(order => (
              <motion.div 
                key={order.id} 
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-white border-l-8 border-green-500 rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Masa {order.tableCode}</h2>
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide animate-pulse">
                      Teslim Al
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <ul className="space-y-3">
                      {order.items.map((item, i) => (
                        <li key={i} className={`flex items-center justify-between text-gray-700 ${item.status === 'cancelled' ? 'opacity-40' : ''}`}>
                          <div className="flex items-center">
                            <span className={`font-bold mr-2 min-w-[20px] ${item.status === 'cancelled' ? 'text-red-400 line-through' : 'text-green-600'}`}>{item.quantity}x</span>
                            <span className={`font-medium ${item.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}>{item.name}</span>
                          </div>
                          {item.status === 'cancelled' && (
                            <span className="text-[10px] font-black bg-red-100 text-red-500 px-2 py-0.5 rounded uppercase tracking-wider ml-2 flex-shrink-0">
                              İptal
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500" />
                    Hazır olduğu zaman: {order.readyAt?.seconds ? new Date(order.readyAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Şimdi')}
                  </div>
                </div>

                <button 
                  onClick={() => markDelivered(order.id)}
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform group-hover:translate-y-1 shadow-lg shadow-green-200"
                >
                  <Truck size={20} /> Teslim Edildi İşaretle
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
