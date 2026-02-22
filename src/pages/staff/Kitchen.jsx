import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { ChefHat, CheckCircle, Clock, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export default function KitchenView({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    // Listen for Pending and Preparing orders
    const q = query(
        collection(db, 'orders'), 
        where('restaurantId', '==', restaurantId),
        where('status', 'in', ['pending', 'preparing']),
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Play sound if new order added (simple check: length increased)
        // Better check: if any *new* ID exists, but list length check is decent proxy for "new ticket"
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

  const updateStatus = async (orderId, newStatus) => {
      const ref = doc(db, 'orders', orderId);
      const updates = { status: newStatus };
      
      if (newStatus === 'preparing') updates.preparingAt = serverTimestamp();
      if (newStatus === 'ready') updates.readyAt = serverTimestamp();

      try {
        await updateDoc(ref, updates);
      } catch (error) {
        console.error("Error updating order:", error);
        alert("Failed to update order status. Please try again.");
      }
  };

  if (loading) return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 relative z-10">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <ChefHat className="text-yellow-500" /> Kitchen Display
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span> Pending</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Preparing</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
            <AnimatePresence mode="popLayout">
                {orders.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="col-span-full py-20 flex flex-col items-center justify-center text-gray-600 space-y-4"
                    >
                        <Coffee size={64} className="text-gray-700" />
                        <p className="text-xl font-medium">All caught up!</p>
                        <p className="text-sm">No active orders in the kitchen.</p>
                    </motion.div>
                )}
                
                {orders.map(order => (
                    <motion.div 
                        key={order.id} 
                        layout
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={`rounded-xl border-l-4 p-5 shadow-xl flex flex-col justify-between transition-all duration-300 ${
                            order.status === 'pending' 
                                ? 'bg-gray-800 border-yellow-500 shadow-yellow-900/10' 
                                : 'bg-gray-800 border-blue-500 shadow-blue-900/10'
                        }`}
                    >
                        <div>
                            <div className="flex justify-between items-start border-b border-gray-700 pb-3 mb-4">
                                <div>
                                    <span className="text-3xl font-black text-white block tracking-tight">Table {order.tableCode}</span>
                                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-1 font-medium">
                                        <Clock size={12} />
                                        {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded uppercase font-bold tracking-wider ${
                                    order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className={`flex justify-between items-center ${item.status === 'cancelled' ? 'opacity-40' : ''}`}>
                                        <span className={`font-medium text-lg leading-snug ${item.status === 'cancelled' ? 'line-through text-gray-500' : item.quantity > 1 ? 'text-white' : 'text-gray-300'}`}>
                                            <span className={`font-bold mr-2 ${item.status === 'cancelled' ? 'text-red-400' : 'text-yellow-500'}`}>{item.quantity}x</span>
                                            {item.name}
                                        </span>
                                        {item.status === 'cancelled' && (
                                            <span className="text-[10px] font-black bg-red-900/60 text-red-400 px-2 py-0.5 rounded uppercase tracking-wider border border-red-500/30 ml-2 flex-shrink-0">
                                                İptal
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {order.note && (
                                    <div className="text-sm text-red-200 italic bg-red-900/30 p-3 rounded-lg border border-red-500/20 mt-2">
                                        Note: {order.note}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 mt-auto">
                            {order.status === 'pending' ? (
                                <button 
                                    onClick={() => updateStatus(order.id, 'preparing')}
                                    className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                                >
                                    <ChefHat size={24} /> Start Cooking
                                </button>
                            ) : (
                                <button 
                                    onClick={() => updateStatus(order.id, 'ready')}
                                    className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
                                >
                                    <CheckCircle size={24} /> Order Ready
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    </div>
  );
}
